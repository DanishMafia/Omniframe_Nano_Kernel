import { useState, useEffect, useCallback } from 'react';
import type { Constitution, ConstitutionRule } from '../../types';
import { constitutionEngine } from '../../engine';

export function useConstitution() {
  const [constitution, setConstitution] = useState<Constitution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    constitutionEngine
      .load()
      .then(setConstitution)
      .finally(() => setLoading(false));
  }, []);

  const refresh = useCallback(() => {
    setConstitution({ ...constitutionEngine.get() });
  }, []);

  const addRule = useCallback(
    (rule: Omit<ConstitutionRule, 'id' | 'createdAt'>) => {
      constitutionEngine.addRule(rule);
      refresh();
    },
    [refresh],
  );

  const updateRule = useCallback(
    (id: string, updates: Partial<ConstitutionRule>) => {
      constitutionEngine.updateRule(id, updates);
      refresh();
    },
    [refresh],
  );

  const removeRule = useCallback(
    (id: string) => {
      constitutionEngine.removeRule(id);
      refresh();
    },
    [refresh],
  );

  const toggleRule = useCallback(
    (id: string) => {
      constitutionEngine.toggleRule(id);
      refresh();
    },
    [refresh],
  );

  const compiledPrompt = constitution
    ? constitutionEngine.compile()
    : '';

  return {
    constitution,
    loading,
    addRule,
    updateRule,
    removeRule,
    toggleRule,
    compiledPrompt,
  };
}
