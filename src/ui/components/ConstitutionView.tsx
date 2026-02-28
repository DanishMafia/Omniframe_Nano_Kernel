import { useState } from 'react';
import type { Constitution, ConstitutionRule } from '../../types';

interface ConstitutionViewProps {
  constitution: Constitution | null;
  compiledPrompt: string;
  onAddRule: (rule: Omit<ConstitutionRule, 'id' | 'createdAt'>) => void;
  onUpdateRule: (id: string, updates: Partial<ConstitutionRule>) => void;
  onRemoveRule: (id: string) => void;
  onToggleRule: (id: string) => void;
  loading: boolean;
}

const CATEGORIES: ConstitutionRule['category'][] = [
  'personality',
  'constraint',
  'preference',
  'context',
];

export function ConstitutionView({
  constitution,
  compiledPrompt,
  onAddRule,
  onRemoveRule,
  onToggleRule,
  loading,
}: ConstitutionViewProps) {
  const [showCompiled, setShowCompiled] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<ConstitutionRule['category']>('preference');
  const [newPriority, setNewPriority] = useState(5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white/30 text-sm animate-pulse">Loading constitution...</p>
      </div>
    );
  }

  const rules = constitution?.rules ?? [];

  const handleAdd = () => {
    if (!newContent.trim()) return;
    onAddRule({
      category: newCategory,
      priority: newPriority,
      content: newContent.trim(),
      enabled: true,
    });
    setNewContent('');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white/90">Memory Constitution</h2>
          <p className="text-[11px] text-white/30 mt-0.5">
            v{constitution?.version ?? 1} &middot; {rules.length} rules &middot;{' '}
            {rules.filter((r) => r.enabled).length} active
          </p>
        </div>
        <button
          onClick={() => setShowCompiled(!showCompiled)}
          className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {showCompiled ? 'Hide' : 'View'} compiled
        </button>
      </div>

      {/* Compiled prompt preview */}
      {showCompiled && (
        <div className="bg-black/30 border border-white/10 rounded-lg p-4 max-h-60 overflow-y-auto">
          <pre className="text-[11px] text-white/50 font-mono whitespace-pre-wrap">
            {compiledPrompt || '(empty — no active rules)'}
          </pre>
        </div>
      )}

      {/* Existing rules */}
      <div className="space-y-2">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`bg-white/5 rounded-lg p-3 border transition-colors ${
              rule.enabled ? 'border-white/10' : 'border-white/5 opacity-40'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase text-indigo-400/60 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                    {rule.category}
                  </span>
                  <span className="text-[10px] font-mono text-white/20">P{rule.priority}</span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed">{rule.content}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onToggleRule(rule.id)}
                  className={`w-8 h-5 rounded-full transition-colors ${
                    rule.enabled ? 'bg-indigo-500' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      rule.enabled ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <button
                  onClick={() => onRemoveRule(rule.id)}
                  className="text-white/20 hover:text-red-400 text-xs px-1 transition-colors"
                >
                  x
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add new rule */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
        <h3 className="text-xs font-medium text-white/50">Add Rule</h3>
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Rule content..."
          rows={2}
          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/20 resize-none focus:outline-none focus:border-indigo-500/50"
        />
        <div className="flex items-center gap-3">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as ConstitutionRule['category'])}
            className="bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/30">Priority</span>
            <input
              type="number"
              min={1}
              max={10}
              value={newPriority}
              onChange={(e) => setNewPriority(Number(e.target.value))}
              className="w-12 bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-white/70 text-center focus:outline-none"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newContent.trim()}
            className="ml-auto px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/5 disabled:text-white/20 rounded-lg text-xs font-medium text-white transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
