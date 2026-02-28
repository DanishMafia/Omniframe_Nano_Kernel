import { useState } from 'react';
import type { InferenceProgress } from '../../types';
import type { SpeculativeStats, ModelPair } from '../../engine';
import { AVAILABLE_MODELS, MODEL_PAIRS } from '../../engine';

interface SettingsViewProps {
  progress: InferenceProgress;
  onLoadModel: (modelId: string) => Promise<void>;
  specState: {
    status: string;
    loadProgress: number;
    stats: SpeculativeStats;
    loadedPair: ModelPair | null;
  };
  onLoadSpecModels: (pair: ModelPair) => Promise<void>;
}

export function SettingsView({
  progress,
  onLoadModel,
  specState,
  onLoadSpecModels,
}: SettingsViewProps) {
  const [selectedModel, setSelectedModel] = useState(
    progress.modelId ?? AVAILABLE_MODELS[0].id,
  );
  const [selectedPairIdx, setSelectedPairIdx] = useState(0);

  const handleLoad = () => {
    onLoadModel(selectedModel);
  };

  const handleLoadSpec = () => {
    onLoadSpecModels(MODEL_PAIRS[selectedPairIdx].pair);
  };

  const isLoading = progress.status === 'loading-model';
  const isSpecLoading = specState.status === 'loading-model';
  const isSpecReady = specState.status === 'ready';

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 overflow-y-auto h-full">
      <h2 className="text-sm font-semibold text-white/90">Settings</h2>

      {/* Standard model selection */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
        <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">
          Standard Inference
        </h3>

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
                  {model.size} &middot; {model.quantization} &middot;{' '}
                  {(model.requiredVRAM / 1024 ** 3).toFixed(0)}GB VRAM
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

      {/* Speculative Decoding */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">
            Speculative Decoding
          </h3>
          <span className="px-1.5 py-0.5 text-[9px] bg-amber-500/20 text-amber-300 rounded font-mono">
            ~2x SPEED
          </span>
        </div>

        <p className="text-[11px] text-white/30 leading-relaxed">
          Loads a small draft model alongside the target model. The draft model generates
          candidate tokens that the target verifies in batch, yielding ~2x throughput.
        </p>

        <div className="space-y-2">
          {MODEL_PAIRS.map((mp, idx) => (
            <label
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedPairIdx === idx
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : 'border-white/5 hover:border-white/10'
              }`}
            >
              <input
                type="radio"
                name="specPair"
                value={idx}
                checked={selectedPairIdx === idx}
                onChange={() => setSelectedPairIdx(idx)}
                className="sr-only"
              />
              <div
                className={`w-3 h-3 rounded-full border-2 ${
                  selectedPairIdx === idx
                    ? 'border-amber-400 bg-amber-400'
                    : 'border-white/20'
                }`}
              />
              <div className="flex-1">
                <p className="text-sm text-white/80">{mp.label}</p>
                <p className="text-[10px] text-white/30 font-mono">
                  ~{(mp.requiredVRAM / 1024 ** 3).toFixed(0)}GB VRAM &middot;{' '}
                  {mp.pair.draftId.split('-')[2]} draft + {mp.pair.targetId.split('-')[2]} target
                </p>
              </div>
              {isSpecReady &&
                specState.loadedPair?.draftId === mp.pair.draftId &&
                specState.loadedPair?.targetId === mp.pair.targetId && (
                  <span className="text-[10px] text-emerald-400 font-mono">LOADED</span>
                )}
            </label>
          ))}
        </div>

        {/* Load progress */}
        {isSpecLoading && (
          <div>
            <div className="flex items-center gap-3">
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div
                  className="bg-amber-400 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${specState.loadProgress * 100}%` }}
                />
              </div>
              <span className="text-[11px] text-white/50 font-mono shrink-0">
                {Math.round(specState.loadProgress * 100)}%
              </span>
            </div>
            <p className="mt-1 text-[10px] text-white/30">
              {specState.loadProgress < 0.5
                ? 'Loading draft model...'
                : 'Loading target model...'}
            </p>
          </div>
        )}

        <button
          onClick={handleLoadSpec}
          disabled={isSpecLoading}
          className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/30 rounded-lg text-sm font-medium text-white transition-colors"
        >
          {isSpecLoading
            ? 'Loading models...'
            : isSpecReady
              ? 'Reload Pair'
              : 'Load Model Pair'}
        </button>

        {/* Live stats (shown when speculative decoding has been used) */}
        {specState.stats.totalTokens > 0 && (
          <div className="bg-black/20 rounded-lg p-3 space-y-1.5">
            <h4 className="text-[10px] font-medium text-white/40 uppercase">Last Session Stats</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <StatRow label="Total tokens" value={specState.stats.totalTokens} />
              <StatRow label="Accepted" value={specState.stats.acceptedTokens} />
              <StatRow label="Rejected" value={specState.stats.rejectedTokens} />
              <StatRow label="Draft rounds" value={specState.stats.draftRounds} />
              <StatRow
                label="Avg accepted/round"
                value={specState.stats.avgAcceptanceLength.toFixed(1)}
              />
              <StatRow
                label="Tokens/sec"
                value={specState.stats.tokensPerSecond.toFixed(1)}
                highlight
              />
              <StatRow
                label="Est. speedup"
                value={`${specState.stats.estimatedSpeedup.toFixed(1)}x`}
                highlight
              />
              <StatRow
                label="Elapsed"
                value={`${(specState.stats.elapsedMs / 1000).toFixed(1)}s`}
              />
            </div>
          </div>
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

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-[10px] text-white/30">{label}</span>
      <span
        className={`text-[10px] font-mono ${highlight ? 'text-amber-300' : 'text-white/60'}`}
      >
        {value}
      </span>
    </div>
  );
}
