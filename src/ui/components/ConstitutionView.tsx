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

interface LanguagePreset {
  label: string;
  flag: string;
  rules: Omit<ConstitutionRule, 'id' | 'createdAt'>[];
}

const LANGUAGE_PRESETS: LanguagePreset[] = [
  {
    label: 'Dansk',
    flag: 'DK',
    rules: [
      {
        category: 'preference',
        priority: 2,
        content: 'Svar altid pa dansk. Brug et naturligt, uformelt dansk sprog med korrekt grammatik.',
        enabled: true,
      },
      {
        category: 'personality',
        priority: 2,
        content: 'Du er en hjaelpsom AI-assistent der kommunikerer pa dansk. Vaer direkte, venlig og praecis.',
        enabled: true,
      },
    ],
  },
  {
    label: 'English',
    flag: 'US',
    rules: [
      {
        category: 'preference',
        priority: 2,
        content: 'Always respond in English. Use clear, concise language.',
        enabled: true,
      },
    ],
  },
  {
    label: 'Deutsch',
    flag: 'DE',
    rules: [
      {
        category: 'preference',
        priority: 2,
        content: 'Antworte immer auf Deutsch. Verwende eine klare, natuerliche Sprache mit korrekter Grammatik.',
        enabled: true,
      },
      {
        category: 'personality',
        priority: 2,
        content: 'Du bist ein hilfreicher KI-Assistent der auf Deutsch kommuniziert. Sei direkt, freundlich und praezise.',
        enabled: true,
      },
    ],
  },
  {
    label: 'Concise',
    flag: '--',
    rules: [
      {
        category: 'constraint',
        priority: 1,
        content: 'Keep responses extremely brief. Use bullet points. Maximum 3 sentences unless asked for more detail.',
        enabled: true,
      },
    ],
  },
  {
    label: 'Coding',
    flag: '<>',
    rules: [
      {
        category: 'personality',
        priority: 2,
        content: 'You are a senior software engineer. Provide code-first responses with minimal explanation. Use best practices and modern patterns.',
        enabled: true,
      },
      {
        category: 'constraint',
        priority: 2,
        content: 'When showing code, always specify the language. Prefer TypeScript over JavaScript. Include error handling.',
        enabled: true,
      },
    ],
  },
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

  const handleApplyPreset = (preset: LanguagePreset) => {
    for (const rule of preset.rules) {
      onAddRule(rule);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4 sm:space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white/90">Memory Constitution</h2>
          <p className="text-[10px] text-white/30 mt-0.5">
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
        <div className="bg-black/30 border border-white/10 rounded-lg p-3 max-h-48 overflow-y-auto">
          <pre className="text-[10px] text-white/50 font-mono whitespace-pre-wrap break-words">
            {compiledPrompt || '(empty — no active rules)'}
          </pre>
        </div>
      )}

      {/* Language / style presets */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 space-y-3">
        <h3 className="text-xs font-medium text-white/50">Quick Presets</h3>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handleApplyPreset(preset)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-xs text-white/70 hover:text-white/90 transition-colors"
            >
              <span className="text-[10px] font-mono text-white/40">{preset.flag}</span>
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Existing rules */}
      <div className="space-y-2">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`bg-white/5 rounded-lg p-3 border transition-colors ${
              rule.enabled ? 'border-white/10' : 'border-white/5 opacity-40'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[9px] font-mono uppercase text-indigo-400/60 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                    {rule.category}
                  </span>
                  <span className="text-[9px] font-mono text-white/20">P{rule.priority}</span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed break-words">{rule.content}</p>
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
      <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 space-y-3">
        <h3 className="text-xs font-medium text-white/50">Add Rule</h3>
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Rule content..."
          rows={2}
          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/20 resize-none focus:outline-none focus:border-indigo-500/50"
        />
        <div className="flex items-center gap-2 flex-wrap">
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
            <span className="text-[10px] text-white/30">P</span>
            <input
              type="number"
              min={1}
              max={10}
              value={newPriority}
              onChange={(e) => setNewPriority(Number(e.target.value))}
              className="w-10 bg-black/20 border border-white/10 rounded px-1.5 py-1 text-xs text-white/70 text-center focus:outline-none"
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
