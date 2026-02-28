import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, InferenceProgress, ParsedDocument } from '../../types';

interface ChatViewProps {
  messages: ChatMessage[];
  streamingContent: string;
  progress: InferenceProgress;
  documents: ParsedDocument[];
  onSendMessage: (content: string) => void;
  onClearChat: () => void;
}

export function ChatView({
  messages,
  streamingContent,
  progress,
  documents,
  onSendMessage,
  onClearChat,
}: ChatViewProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || progress.status === 'generating') return;
    onSendMessage(trimmed);
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isLoading = progress.status === 'loading-model';
  const isGenerating = progress.status === 'generating';
  const notReady = progress.status !== 'ready' && progress.status !== 'generating';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white/90">Chat</h2>
          {documents.length > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] bg-indigo-500/20 text-indigo-300 rounded-full font-mono">
              {documents.length} doc{documents.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={onClearChat}
          className="text-[11px] text-white/30 hover:text-white/60 transition-colors px-2 py-1"
        >
          Clear
        </button>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="px-3 sm:px-5 py-2.5 bg-indigo-500/10 border-b border-indigo-500/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div
                className="bg-indigo-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress.loadProgress * 100}%` }}
              />
            </div>
            <span className="text-[11px] text-white/50 font-mono shrink-0">
              {Math.round(progress.loadProgress * 100)}%
            </span>
          </div>
          <p className="mt-1 text-[10px] text-white/40">Loading model into GPU memory...</p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-5 py-3 space-y-3">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-white/20 text-sm">No Cloud. No Subscription. No Latency.</p>
            <p className="text-white/10 text-xs mt-1">
              {notReady ? 'Load a model from Settings to begin.' : 'Type a message to begin.'}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] sm:max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600/30 text-white/90'
                  : 'bg-white/5 text-white/80'
              }`}
            >
              <pre className="whitespace-pre-wrap font-sans break-words">{msg.content}</pre>
            </div>
          </div>
        ))}

        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[90%] sm:max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed bg-white/5 text-white/80">
              <pre className="whitespace-pre-wrap font-sans break-words">{streamingContent}</pre>
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-white/40 animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 sm:px-5 py-2.5 border-t border-white/10 shrink-0 safe-bottom">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={notReady ? 'Load a model first...' : 'Type a message...'}
            disabled={notReady}
            rows={1}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/90 placeholder-white/20 resize-none focus:outline-none focus:border-indigo-500/50 disabled:opacity-30 transition-colors"
          />
          <button
            onClick={handleSubmit}
            disabled={notReady || isGenerating || !input.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/5 disabled:text-white/20 rounded-xl text-sm font-medium text-white transition-colors shrink-0"
          >
            {isGenerating ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
