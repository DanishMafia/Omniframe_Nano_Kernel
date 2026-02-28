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
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  currentView,
  onNavigate,
  modelStatus,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const handleNavigate = (view: AppView) => {
    onNavigate(view);
    // Auto-collapse on mobile after navigation
    if (window.innerWidth < 768 && !collapsed) {
      onToggleCollapse();
    }
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onToggleCollapse}
        />
      )}

      <aside
        className={`flex flex-col shrink-0 border-r border-white/10 bg-[#0d0d14] transition-all duration-200 z-40
          ${collapsed
            ? 'w-12'
            : 'w-56 fixed inset-y-0 left-0 md:relative md:inset-auto'
          }`}
      >
        {/* Header */}
        <div className="px-2 py-4 border-b border-white/10 flex items-center justify-between min-h-[52px] safe-top">
          {!collapsed && (
            <div className="overflow-hidden pl-1">
              <h1 className="text-xs font-bold tracking-widest text-white/90 uppercase">
                Omniframe
              </h1>
              <p className="text-[9px] text-white/40 font-mono">Nano Kernel v1</p>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 flex items-center justify-center rounded-md text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors shrink-0"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-60">
              {collapsed ? (
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M10 3l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.view}
              onClick={() => handleNavigate(item.view)}
              title={collapsed ? item.label : undefined}
              className={`flex items-center w-full py-2.5 text-left text-sm transition-colors ${
                currentView === item.view
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              } ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'}`}
            >
              <span className="w-5 font-mono text-xs text-center opacity-60 shrink-0">
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Status indicator */}
        <div className={`py-3 border-t border-white/10 safe-bottom ${collapsed ? 'flex justify-center' : 'px-3'}`}>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                modelStatus === 'ready'
                  ? 'bg-emerald-400'
                  : modelStatus === 'loading-model' || modelStatus === 'generating'
                    ? 'bg-amber-400 animate-pulse'
                    : modelStatus === 'error'
                      ? 'bg-red-400'
                      : 'bg-white/20'
              }`}
            />
            {!collapsed && (
              <span className="text-[10px] text-white/40 font-mono capitalize truncate">
                {modelStatus}
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
