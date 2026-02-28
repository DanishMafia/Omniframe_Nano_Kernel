import { useRef } from 'react';
import type { ParsedDocument } from '../../types';

interface FilesViewProps {
  documents: ParsedDocument[];
  onParseFile: (file: File) => Promise<void>;
  onRemoveDocument: (name: string) => void;
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function FilesView({ documents, onParseFile, onRemoveDocument }: FilesViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      await onParseFile(file);
    }
  };

  const totalTokens = documents.reduce((sum, d) => sum + d.tokenEstimate, 0);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white/90">Context Files</h2>
          <p className="text-[11px] text-white/30 mt-0.5">
            {documents.length} file{documents.length !== 1 ? 's' : ''} &middot;{' '}
            ~{formatTokens(totalTokens)} tokens
          </p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-500/50'); }}
        onDragLeave={(e) => { e.currentTarget.classList.remove('border-indigo-500/50'); }}
        onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-indigo-500/50'); handleFiles(e.dataTransfer.files); }}
        className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-white/20 transition-colors"
      >
        <p className="text-white/30 text-sm">Drop files here or click to upload</p>
        <p className="text-white/15 text-xs mt-1">PDF, Markdown, Text, JSON</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.md,.markdown,.txt,.text,.json"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* File list */}
      {documents.length === 0 && (
        <p className="text-white/20 text-sm text-center py-6">
          No files loaded. Upload documents to inject them into the model context.
        </p>
      )}

      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.name}
            className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3 border border-white/10"
          >
            <div className="min-w-0">
              <p className="text-sm text-white/80 truncate">{doc.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono text-indigo-400/60 bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase">
                  {doc.type}
                </span>
                <span className="text-[10px] text-white/20 font-mono">
                  ~{formatTokens(doc.tokenEstimate)} tokens
                </span>
              </div>
            </div>
            <button
              onClick={() => onRemoveDocument(doc.name)}
              className="text-white/20 hover:text-red-400 text-xs transition-colors shrink-0 ml-3"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
