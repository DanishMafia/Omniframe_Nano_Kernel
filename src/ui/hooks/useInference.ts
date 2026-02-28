import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage, InferenceProgress } from '../../types';
import { inferenceEngine } from '../../engine';
import { constitutionEngine } from '../../engine';
import { saveChatMessage } from '../../storage/opfs-store';

export function useInference() {
  const [progress, setProgress] = useState<InferenceProgress>({
    status: 'idle',
    modelId: null,
    loadProgress: 0,
    tokensPerSecond: 0,
    error: null,
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const abortRef = useRef(false);

  useEffect(() => {
    inferenceEngine.setProgressCallback(setProgress);
  }, []);

  const loadModel = useCallback(async (modelId: string) => {
    try {
      await inferenceEngine.loadModel(modelId);
    } catch (err) {
      // On crash/error, clean up and reset to safe state
      try {
        await inferenceEngine.unload();
      } catch {
        // Ignore cleanup errors
      }
      setProgress({
        status: 'error',
        modelId: null,
        loadProgress: 0,
        tokensPerSecond: 0,
        error: err instanceof Error ? err.message : 'Model loading failed. Try again or choose a smaller model.',
      });
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!inferenceEngine.isReady()) return;
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

      const constitutionPrompt = constitutionEngine.isLoaded()
        ? constitutionEngine.compile()
        : null;

      try {
        const allMessages = [...messages, userMsg];
        const fullResponse = await inferenceEngine.chat(
          allMessages,
          constitutionPrompt,
          {},
          (_token, full) => {
            if (!abortRef.current) {
              setStreamingContent(full);
            }
          },
        );

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: fullResponse,
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
    await inferenceEngine.resetChat();
  }, []);

  return {
    progress,
    messages,
    streamingContent,
    loadModel,
    sendMessage,
    clearChat,
    setMessages,
  };
}
