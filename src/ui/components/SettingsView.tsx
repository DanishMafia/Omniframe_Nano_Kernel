import { useState } from 'react';
import type { InferenceProgress } from '../../types';
import { AVAILABLE_MODELS } from '../../engine';

interface SettingsViewProps {
  progress: InferenceProgress;
  onLoadModel: (modelId: string) => Promise<void>;
}

export function SettingsView({ progress, onLoadModel }: SettingsViewProps) {
  const [selectedModel, setSelectedModel] = useState(
    progress.modelId ?? AVAILABLE_MODELS[0].id,
  );

  const handleLoad = () => {
    onLoadModel(selectedModel);
  };

  const isLoading = progress.status === 'loading-model';

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 overflow-y-auto h-full">
      <h2 className="text-sm font-semibold text-white/90">Settings</h2>

      {/* Model selection */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
        <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">Model</h3>

        <div className="space-y-2">
          {AVAILABLE_MODELS.map((model) => (
            <label
              key={model.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedModel === model.id
                  ? 'border-indigo-500/50 bg-indigo-500/10'
                  : 'border-white/5 hover:border-white/10'
              }`}
            >
              <input
                type="radio"
                name="model"
                value={model.id}
                checked={selectedModel === model.id}
                onChange={() => setSelectedModel(model.id)}
                className="sr-only"
              />
              <div
                className={`w-3 h-3 rounded-full border-2 ${
                  selectedModel === model.id
                    ? 'border-indigo-400 bg-indigo-400'
                    : 'border-white/20'
                }`}
              />
              <div className="flex-1">
                <p className="text-sm text-white/80">{model.name}</p>
                <p className="text-[10px] text-white/30 font-mono">
                  {model.size} &middot; {model.quantization} &middot; {(model.requiredVRAM / 1024 ** 3).toFixed(0)}GB VRAM
                </p>
              </div>
              {progress.modelId === model.id && progress.status === 'ready' && (
                <span className="text-[10px] text-emerald-400 font-mono">LOADED</span>
              )}
            </label>
          ))}
        </div>

        <button
          onClick={handleLoad}
          disabled={isLoading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/30 rounded-lg text-sm font-medium text-white transition-colors"
        >
          {isLoading
            ? `Loading... ${Math.round(progress.loadProgress * 100)}%`
            : progress.modelId === selectedModel && progress.status === 'ready'
              ? 'Reload Model'
              : 'Load Model'}
        </button>

        {progress.error && (
          <p className="text-[11px] text-red-400/70">{progress.error}</p>
        )}
      </div>

      {/* Info */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-2">About</h3>
        <p className="text-xs text-white/40 leading-relaxed">
          Omniframe Nano Kernel runs AI models entirely in your browser using WebGPU.
          No data leaves your device. Model weights are cached in your browser's storage
          for instant loading on return visits.
        </p>
        <p className="text-[10px] text-white/20 mt-3 font-mono">
          No Cloud. No Subscription. No Latency.
        </p>
      </div>
    </div>
  );
}
