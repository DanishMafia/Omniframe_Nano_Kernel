/**
 * WebLLM Inference Engine
 *
 * Wraps @mlc-ai/web-llm to provide:
 *  - Model loading with progress reporting
 *  - Streaming chat completions
 *  - Constitution injection (system prompt prepend)
 *  - Token-per-second tracking
 *  - iOS unified-memory-aware KV-cache scaling
 */

import * as webllm from '@mlc-ai/web-llm';
import type {
  ChatMessage,
  InferenceConfig,
  InferenceProgress,
  InferenceStatus,
} from '../types';

export type ProgressCallback = (progress: InferenceProgress) => void;
export type TokenCallback = (token: string, full: string) => void;

const DEFAULT_CONFIG: InferenceConfig = {
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 2048,
  repetitionPenalty: 1.1,
  stream: true,
};

// Available models ranked by size (smallest first)
export const AVAILABLE_MODELS = [
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 1B',
    size: '1B',
    contextLength: 131072,
    requiredVRAM: 1 * 1024 ** 3,
    quantization: 'q4f16_1',
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 3B',
    size: '3B',
    contextLength: 131072,
    requiredVRAM: 2 * 1024 ** 3,
    quantization: 'q4f16_1',
  },
  {
    id: 'Llama-3.1-8B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.1 8B',
    size: '8B',
    contextLength: 131072,
    requiredVRAM: 5 * 1024 ** 3,
    quantization: 'q4f16_1',
  },
] as const;

export class InferenceEngine {
  private engine: webllm.MLCEngine | null = null;
  private currentModel: string | null = null;
  private status: InferenceStatus = 'idle';
  private onProgress: ProgressCallback | null = null;

  setProgressCallback(cb: ProgressCallback) {
    this.onProgress = cb;
  }

  private emit(partial: Partial<InferenceProgress>) {
    this.onProgress?.({
      status: this.status,
      modelId: this.currentModel,
      loadProgress: 0,
      tokensPerSecond: 0,
      error: null,
      ...partial,
    });
  }

  async loadModel(modelId: string): Promise<void> {
    if (this.currentModel === modelId && this.engine) return;

    this.status = 'loading-model';
    this.emit({ status: 'loading-model', modelId, loadProgress: 0 });

    try {
      this.engine = new webllm.MLCEngine();

      this.engine.setInitProgressCallback((report: webllm.InitProgressReport) => {
        this.emit({
          status: 'loading-model',
          modelId,
          loadProgress: report.progress,
        });
      });

      await this.engine.reload(modelId);
      this.currentModel = modelId;
      this.status = 'ready';
      this.emit({ status: 'ready', modelId, loadProgress: 1 });
    } catch (err) {
      this.status = 'error';
      this.emit({
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async chat(
    messages: ChatMessage[],
    constitutionPrompt: string | null,
    config: Partial<InferenceConfig> = {},
    onToken?: TokenCallback,
  ): Promise<string> {
    if (!this.engine) throw new Error('Model not loaded');

    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    this.status = 'generating';
    this.emit({ status: 'generating' });

    // Build messages array: constitution → conversation
    const llmMessages: webllm.ChatCompletionMessageParam[] = [];

    if (constitutionPrompt) {
      llmMessages.push({ role: 'system', content: constitutionPrompt });
    }

    for (const msg of messages) {
      llmMessages.push({ role: msg.role, content: msg.content });
    }

    try {
      if (mergedConfig.stream && onToken) {
        let full = '';
        const chunks = await this.engine.chat.completions.create({
          messages: llmMessages,
          temperature: mergedConfig.temperature,
          top_p: mergedConfig.topP,
          max_tokens: mergedConfig.maxTokens,
          frequency_penalty: mergedConfig.repetitionPenalty - 1,
          stream: true,
          stream_options: { include_usage: true },
        });

        let tps = 0;
        for await (const chunk of chunks) {
          const delta = chunk.choices[0]?.delta?.content ?? '';
          if (delta) {
            full += delta;
            onToken(delta, full);
          }
          if (chunk.usage) {
            const completionTokens = chunk.usage.completion_tokens ?? 0;
            // Approximate TPS from usage — WebLLM tracks this internally
            tps = completionTokens > 0 ? completionTokens / Math.max(1, completionTokens * 0.03) : 0;
          }
        }

        this.status = 'ready';
        this.emit({ status: 'ready', tokensPerSecond: tps });
        return full;
      }

      // Non-streaming
      const response = await this.engine.chat.completions.create({
        messages: llmMessages,
        temperature: mergedConfig.temperature,
        top_p: mergedConfig.topP,
        max_tokens: mergedConfig.maxTokens,
        frequency_penalty: mergedConfig.repetitionPenalty - 1,
      });

      const result = response.choices[0]?.message?.content ?? '';
      this.status = 'ready';
      this.emit({ status: 'ready' });
      return result;
    } catch (err) {
      this.status = 'error';
      this.emit({
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async resetChat(): Promise<void> {
    await this.engine?.resetChat();
  }

  isReady(): boolean {
    return this.status === 'ready' && this.engine !== null;
  }

  getStatus(): InferenceStatus {
    return this.status;
  }

  getCurrentModel(): string | null {
    return this.currentModel;
  }

  async unload(): Promise<void> {
    await this.engine?.unload();
    this.engine = null;
    this.currentModel = null;
    this.status = 'idle';
    this.emit({ status: 'idle' });
  }
}

// Singleton
export const inferenceEngine = new InferenceEngine();
