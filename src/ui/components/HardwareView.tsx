import type { SystemProfile } from '../../types';
import { recommendModel } from '../../engine';

interface HardwareViewProps {
  profile: SystemProfile | null;
  loading: boolean;
  error: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    high: 'bg-emerald-500/20 text-emerald-300',
    mid: 'bg-amber-500/20 text-amber-300',
    low: 'bg-orange-500/20 text-orange-300',
    unsupported: 'bg-red-500/20 text-red-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase ${colors[tier] ?? colors.unsupported}`}>
      {tier}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5">
      <span className="text-white/40 text-xs">{label}</span>
      <span className="text-white/80 text-xs font-mono">{value}</span>
    </div>
  );
}

export function HardwareView({ profile, loading, error }: HardwareViewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white/30 text-sm animate-pulse">Profiling hardware...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-400/60 text-sm">Failed to profile hardware: {error}</p>
      </div>
    );
  }

  const recommended = recommendModel(profile);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 overflow-y-auto h-full">
      <h2 className="text-sm font-semibold text-white/90">Hardware Profile</h2>

      {/* GPU */}
      <div className="bg-white/5 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">GPU</h3>
          <TierBadge tier={profile.gpu.tier} />
        </div>
        <InfoRow label="WebGPU" value={profile.gpu.supported ? 'Supported' : 'Not Available'} />
        <InfoRow label="Adapter" value={profile.gpu.adapterName} />
        <InfoRow label="Vendor" value={profile.gpu.vendor} />
        <InfoRow label="Architecture" value={profile.gpu.architecture} />
        <InfoRow label="Max Buffer" value={formatBytes(profile.gpu.maxBufferSize)} />
        <InfoRow label="Est. VRAM" value={formatBytes(profile.gpu.estimatedVRAM)} />
      </div>

      {/* System */}
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-3">System</h3>
        <InfoRow label="CPU Cores" value={profile.cores} />
        <InfoRow label="Device Memory" value={profile.memory > 0 ? `${profile.memory} GB` : 'Unknown'} />
        <InfoRow label="Platform" value={profile.platform} />
        <InfoRow label="Browser Engine" value={profile.browserEngine} />
      </div>

      {/* Storage */}
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-3">Storage (OPFS)</h3>
        <InfoRow label="Quota" value={formatBytes(profile.storage.quota)} />
        <InfoRow label="Available" value={formatBytes(profile.storage.available)} />
        <div className="mt-2">
          <div className="w-full bg-white/10 rounded-full h-1.5">
            <div
              className="bg-indigo-400 h-1.5 rounded-full"
              style={{
                width: `${profile.storage.quota > 0 ? ((profile.storage.quota - profile.storage.available) / profile.storage.quota) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Recommendation */}
      {recommended && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
          <h3 className="text-xs font-medium text-indigo-300 uppercase tracking-wider mb-1">
            Recommended Model
          </h3>
          <p className="text-sm text-white/80 font-mono">{recommended}</p>
        </div>
      )}
    </div>
  );
}
