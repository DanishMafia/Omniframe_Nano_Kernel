import { useState, useCallback, useRef } from 'react';
import type { ChatMessage, InferenceStatus } from '../../types';
import type { SpeculativeStats, ModelPair } from '../../engine';
import { speculativeEngine } from '../../engine';
import { constitutionEngine } from '../../engine';
import { saveChatMessage } from '../../storage/opfs-store';
import type { ChatCompletionMessageParam } from '@mlc-ai/web-llm';

export interface SpeculativeState {
  status: InferenceStatus;
  loadProgress: number;
  stats: SpeculativeStats;
  loadedPair: ModelPair | null;
}

export function useSpeculativeDecoding() {
  const [state, setState] = useState<SpeculativeState>({
    status: 'idle',
    loadProgress: 0,
    stats: {
      totalTokens: 0,
      acceptedTokens: 0,
      rejectedTokens: 0,
      draftRounds: 0,
      avgAcceptanceLength: 0,
      tokensPerSecond: 0,
      estimatedSpeedup: 1,
      elapsedMs: 0,
    },
    loadedPair: null,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const abortRef = useRef(false);

  speculativeEngine.setProgressCallback((info) => {
    setState((prev) => ({
      ...prev,
      status: info.status,
      loadProgress: info.loadProgress,
      stats: info.stats,
      loadedPair: speculativeEngine.getLoadedPair(),
    }));
  });

  const loadModels = useCallback(async (pair: ModelPair) => {
    await speculativeEngine.loadModels(pair);
    setState((prev) => ({
      ...prev,
      loadedPair: speculativeEngine.getLoadedPair(),
    }));
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!speculativeEngine.isReady()) return;
      abortRef.current = false;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      await saveChatMessage(userMsg);
      setStreamingContent('');

      // Build LLM messages
      const llmMessages: ChatCompletionMessageParam[] = [];

      if (constitutionEngine.isLoaded()) {
        const compiled = constitutionEngine.compile();
        if (compiled) {
          llmMessages.push({ role: 'system', content: compiled });
        }
      }

      for (const msg of [...messages, userMsg]) {
        llmMessages.push({ role: msg.role, content: msg.content });
      }

      try {
        const { text } = await speculativeEngine.generate(
          llmMessages,
          {},
          (_newText, fullText) => {
            if (!abortRef.current) {
              setStreamingContent(fullText);
            }
          },
        );

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: text,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setStreamingContent('');
        await saveChatMessage(assistantMsg);
      } catch (err) {
        if (!abortRef.current) {
          const errorMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Error: ${err instanceof Error ? err.message : String(err)}`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, errorMsg]);
          setStreamingContent('');
        }
      }
    },
    [messages],
  );

  const clearChat = useCallback(async () => {
    setMessages([]);
    setStreamingContent('');
    await speculativeEngine.resetChat();
  }, []);

  const abort = useCallback(() => {
    abortRef.current = true;
    speculativeEngine.abort();
  }, []);

  return {
    state,
    messages,
    streamingContent,
    loadModels,
    sendMessage,
    clearChat,
    abort,
    setMessages,
  };
}
