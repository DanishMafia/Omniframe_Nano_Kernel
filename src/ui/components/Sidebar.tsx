import type { AppView } from '../../types';

const NAV_ITEMS: { view: AppView; label: string; icon: string }[] = [
  { view: 'chat', label: 'Chat', icon: '>' },
  { view: 'files', label: 'Files', icon: '#' },
  { view: 'tasks', label: 'Tasks', icon: '~' },
  { view: 'constitution', label: 'Constitution', icon: '*' },
  { view: 'hardware', label: 'Hardware', icon: '%' },
  { view: 'settings', label: 'Settings', icon: '@' },
];

interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  modelStatus: string;
}

export function Sidebar({ currentView, onNavigate, modelStatus }: SidebarProps) {
  return (
    <aside className="flex flex-col w-56 shrink-0 border-r border-white/10 bg-[#0d0d14]">
      <div className="px-4 py-5 border-b border-white/10">
        <h1 className="text-sm font-bold tracking-widest text-white/90 uppercase">
          Omniframe
        </h1>
        <p className="mt-0.5 text-[10px] text-white/40 font-mono">Nano Kernel v1.0</p>
      </div>

      <nav className="flex-1 py-3">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className={`flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm transition-colors ${
              currentView === item.view
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <span className="w-4 font-mono text-xs text-center opacity-60">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              modelStatus === 'ready'
                ? 'bg-emerald-400'
                : modelStatus === 'loading-model' || modelStatus === 'generating'
                  ? 'bg-amber-400 animate-pulse'
                  : modelStatus === 'error'
                    ? 'bg-red-400'
                    : 'bg-white/20'
            }`}
          />
          <span className="text-[11px] text-white/40 font-mono capitalize">{modelStatus}</span>
        </div>
      </div>
    </aside>
  );
}
