/**
 * Speculative Decoding Engine
 *
 * Implements the draft-model + target-model verification pattern for
 * ~2x token generation speed, particularly on mobile devices.
 *
 * Algorithm (Leviathan et al., 2023):
 *  1. Draft model generates K candidate tokens quickly
 *  2. Target model verifies all K tokens in one forward pass
 *  3. Accept the longest prefix of matching tokens
 *  4. On first mismatch, sample from target distribution instead
 *  5. Repeat until EOS or max tokens
 *
 * This leverages WebLLM's multi-model loading and the low-level
 * `forwardTokensAndSample()` API to orchestrate both models.
 */

import * as webllm from '@mlc-ai/web-llm';
import type { InferenceStatus } from '../types';

// ─── Configuration ───

export interface SpeculativeConfig {
  /** Number of tokens the draft model proposes per round */
  draftLength: number;
  /** Maximum total tokens to generate */
  maxTokens: number;
  /** Temperature for sampling (applied to both models) */
  temperature: number;
  /** Accept threshold — probability ratio below which we reject (0 = always accept draft) */
  acceptanceThreshold: number;
}

const DEFAULT_SPECULATIVE_CONFIG: SpeculativeConfig = {
  draftLength: 5,
  maxTokens: 2048,
  temperature: 0.7,
  acceptanceThreshold: 0,
};

/** Pairing of a small draft model with a larger target model */
export interface ModelPair {
  draftId: string;
  targetId: string;
}

/** Predefined optimal pairings — draft should be same family, smaller */
export const MODEL_PAIRS: { label: string; pair: ModelPair; requiredVRAM: number }[] = [
  {
    label: '1B draft + 3B target',
    pair: {
      draftId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
      targetId: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    },
    requiredVRAM: 3 * 1024 ** 3, // ~3 GB total
  },
  {
    label: '1B draft + 8B target',
    pair: {
      draftId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
      targetId: 'Llama-3.1-8B-Instruct-q4f16_1-MLC',
    },
    requiredVRAM: 6 * 1024 ** 3, // ~6 GB total
  },
  {
    label: '3B draft + 8B target',
    pair: {
      draftId: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
      targetId: 'Llama-3.1-8B-Instruct-q4f16_1-MLC',
    },
    requiredVRAM: 7 * 1024 ** 3, // ~7 GB total
  },
];

// ─── Statistics ───

export interface SpeculativeStats {
  totalTokens: number;
  acceptedTokens: number;
  rejectedTokens: number;
  draftRounds: number;
  /** Tokens accepted per draft round (measures draft quality) */
  avgAcceptanceLength: number;
  /** Effective tokens per second (wall-clock) */
  tokensPerSecond: number;
  /** Speedup compared to target-only baseline */
  estimatedSpeedup: number;
  elapsedMs: number;
}

function emptyStats(): SpeculativeStats {
  return {
    totalTokens: 0,
    acceptedTokens: 0,
    rejectedTokens: 0,
    draftRounds: 0,
    avgAcceptanceLength: 0,
    tokensPerSecond: 0,
    estimatedSpeedup: 1,
    elapsedMs: 0,
  };
}

// ─── Callbacks ───

export type SpecTokenCallback = (tokens: string, fullText: string) => void;
export type SpecProgressCallback = (info: {
  status: InferenceStatus;
  loadProgress: number;
  stats: SpeculativeStats;
}) => void;

// ─── EOS detection ───

// Common EOS token IDs across Llama models
const EOS_TOKEN_IDS = new Set([
  0,      // <unk> — some tokenizers
  1,      // <s> — BOS sometimes reused
  2,      // </s> — standard EOS
  128001, // <|end_of_text|> Llama 3
  128009, // <|eot_id|> Llama 3
]);

// ─── Engine ───

export class SpeculativeDecodingEngine {
  private engine: webllm.MLCEngine | null = null;
  private draftModelId: string | null = null;
  private targetModelId: string | null = null;
  private status: InferenceStatus = 'idle';
  private aborted = false;
  private onProgress: SpecProgressCallback | null = null;

  setProgressCallback(cb: SpecProgressCallback) {
    this.onProgress = cb;
  }

  private emit(status: InferenceStatus, loadProgress = 0, stats = emptyStats()) {
    this.status = status;
    this.onProgress?.({ status, loadProgress, stats });
  }

  /**
   * Load both draft and target models into GPU memory.
   * Models are loaded sequentially (WebLLM limitation) but both reside in VRAM.
   */
  async loadModels(pair: ModelPair): Promise<void> {
    if (
      this.draftModelId === pair.draftId &&
      this.targetModelId === pair.targetId &&
      this.engine
    ) {
      return; // Already loaded
    }

    this.emit('loading-model', 0);

    try {
      this.engine = new webllm.MLCEngine();

      let currentModelIndex = 0;
      this.engine.setInitProgressCallback((report: webllm.InitProgressReport) => {
        // Map progress: 0-0.5 for draft, 0.5-1.0 for target
        const base = currentModelIndex === 0 ? 0 : 0.5;
        const scaled = base + report.progress * 0.5;
        this.emit('loading-model', scaled);
      });

      // Load both models — WebLLM handles sequential loading internally
      await this.engine.reload(pair.draftId);
      currentModelIndex = 1;
      await this.engine.reload([pair.draftId, pair.targetId]);

      this.draftModelId = pair.draftId;
      this.targetModelId = pair.targetId;
      this.emit('ready', 1);
    } catch (err) {
      this.emit('error');
      throw err;
    }
  }

  /**
   * Run speculative decoding on a pre-prefilled conversation.
   *
   * Flow per round:
   *  1. Draft model produces K tokens via `forwardTokensAndSample`
   *  2. Target model verifies each token via `forwardTokensAndSample`
   *  3. Accept longest matching prefix, reject on first divergence
   *  4. Continue from the accepted position
   */
  async generate(
    messages: webllm.ChatCompletionMessageParam[],
    config: Partial<SpeculativeConfig> = {},
    onToken?: SpecTokenCallback,
  ): Promise<{ text: string; stats: SpeculativeStats }> {
    if (!this.engine || !this.draftModelId || !this.targetModelId) {
      throw new Error('Models not loaded — call loadModels() first');
    }

    const cfg = { ...DEFAULT_SPECULATIVE_CONFIG, ...config };
    this.aborted = false;
    this.emit('generating');
    const stats = emptyStats();
    const startTime = performance.now();

    // Prefill both models with the same prompt by running a non-streaming
    // completion with max_tokens=1 to prime the KV cache
    await this.engine.chat.completions.create({
      messages,
      max_tokens: 1,
      temperature: cfg.temperature,
      model: this.draftModelId,
    });

    await this.engine.chat.completions.create({
      messages,
      max_tokens: 1,
      temperature: cfg.temperature,
      model: this.targetModelId,
    });

    let fullText = '';
    let totalGenerated = 0;

    while (totalGenerated < cfg.maxTokens && !this.aborted) {
      stats.draftRounds++;

      // ─── Step 1: Draft K tokens ───
      const draftTokens: number[] = [];
      let draftHitEos = false;

      for (let i = 0; i < cfg.draftLength; i++) {
        const inputIds = draftTokens.length > 0 ? [draftTokens[draftTokens.length - 1]] : [];
        const token = await this.engine.forwardTokensAndSample(
          inputIds,
          draftTokens.length === 0, // isPrefill for first token of continuation
          this.draftModelId,
        );

        if (EOS_TOKEN_IDS.has(token)) {
          draftHitEos = true;
          break;
        }
        draftTokens.push(token);
      }

      if (draftTokens.length === 0) {
        // Draft produced EOS immediately — we're done
        break;
      }

      // ─── Step 2: Verify with target model ───
      const acceptedTokens: number[] = [];

      for (let i = 0; i < draftTokens.length; i++) {
        const inputIds = i === 0 ? [] : [draftTokens[i - 1]];
        const targetToken = await this.engine.forwardTokensAndSample(
          inputIds,
          i === 0,
          this.targetModelId,
        );

        if (targetToken === draftTokens[i]) {
          // Token matches — accept
          acceptedTokens.push(targetToken);
          stats.acceptedTokens++;
        } else {
          // Mismatch — use target's token instead and stop this round
          if (!EOS_TOKEN_IDS.has(targetToken)) {
            acceptedTokens.push(targetToken);
          }
          stats.rejectedTokens += draftTokens.length - i;
          break;
        }
      }

      // If all draft tokens were accepted, add one bonus target sample
      if (acceptedTokens.length === draftTokens.length && !draftHitEos) {
        const bonusToken = await this.engine.forwardTokensAndSample(
          [draftTokens[draftTokens.length - 1]],
          false,
          this.targetModelId,
        );
        if (!EOS_TOKEN_IDS.has(bonusToken)) {
          acceptedTokens.push(bonusToken);
          stats.acceptedTokens++;
        }
      }

      if (acceptedTokens.length === 0) break;

      // ─── Step 3: Decode accepted tokens to text ───
      // We use getMessage() to get the accumulated text from the target model
      const currentMessage = await this.engine.getMessage(this.targetModelId);
      const newText = currentMessage.slice(fullText.length);

      if (newText) {
        fullText = currentMessage;
        totalGenerated += acceptedTokens.length;
        stats.totalTokens = totalGenerated;

        // Update stats
        stats.elapsedMs = performance.now() - startTime;
        stats.tokensPerSecond =
          stats.elapsedMs > 0 ? (totalGenerated / stats.elapsedMs) * 1000 : 0;
        stats.avgAcceptanceLength =
          stats.draftRounds > 0 ? stats.acceptedTokens / stats.draftRounds : 0;
        // Theoretical speedup: accepted_per_round / 1 (baseline is 1 token per step)
        stats.estimatedSpeedup = Math.max(1, stats.avgAcceptanceLength);

        onToken?.(newText, fullText);
        this.emit('generating', 0, stats);
      }

      if (draftHitEos) break;
    }

    // Final stats
    stats.elapsedMs = performance.now() - startTime;
    stats.tokensPerSecond =
      stats.elapsedMs > 0 ? (stats.totalTokens / stats.elapsedMs) * 1000 : 0;
    stats.avgAcceptanceLength =
      stats.draftRounds > 0 ? stats.acceptedTokens / stats.draftRounds : 0;
    stats.estimatedSpeedup = Math.max(1, stats.avgAcceptanceLength);

    this.emit('ready', 0, stats);
    return { text: fullText, stats };
  }

  abort() {
    this.aborted = true;
  }

  getStatus(): InferenceStatus {
    return this.status;
  }

  isReady(): boolean {
    return this.status === 'ready' && this.engine !== null;
  }

  getLoadedPair(): ModelPair | null {
    if (!this.draftModelId || !this.targetModelId) return null;
    return { draftId: this.draftModelId, targetId: this.targetModelId };
  }

  async resetChat(): Promise<void> {
    if (this.engine && this.draftModelId) {
      await this.engine.resetChat(false, this.draftModelId);
    }
    if (this.engine && this.targetModelId) {
      await this.engine.resetChat(false, this.targetModelId);
    }
  }

  async unload(): Promise<void> {
    await this.engine?.unload();
    this.engine = null;
    this.draftModelId = null;
    this.targetModelId = null;
    this.emit('idle');
  }
}

export const speculativeEngine = new SpeculativeDecodingEngine();
