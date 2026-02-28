/**
 * Memory Constitution Engine
 *
 * Manages a JSON-based ruleset of user preferences, behavioral traits,
 * and constraints. The constitution is prepended to every inference
 * cycle as high-priority system tokens.
 */

import type { Constitution, ConstitutionRule } from '../types';
import { loadConstitution, saveConstitution } from '../storage/opfs-store';

const DEFAULT_CONSTITUTION: Constitution = {
  version: 1,
  rules: [
    {
      id: 'core-identity',
      category: 'personality',
      priority: 1,
      content:
        'You are Omniframe, a private AI assistant running entirely in the user\'s browser. ' +
        'You never transmit data to external servers. You are helpful, direct, and concise.',
      enabled: true,
      createdAt: Date.now(),
    },
    {
      id: 'privacy-constraint',
      category: 'constraint',
      priority: 1,
      content:
        'Never suggest sending user data to external services. ' +
        'All processing must remain local. If asked about cloud features, ' +
        'explain that this system is intentionally offline-first.',
      enabled: true,
      createdAt: Date.now(),
    },
  ],
  updatedAt: Date.now(),
};

export class ConstitutionEngine {
  private constitution: Constitution = DEFAULT_CONSTITUTION;
  private loaded = false;

  async load(): Promise<Constitution> {
    const stored = (await loadConstitution()) as Constitution | undefined;
    if (stored?.rules) {
      this.constitution = stored;
    } else {
      this.constitution = DEFAULT_CONSTITUTION;
      await this.save();
    }
    this.loaded = true;
    return this.constitution;
  }

  async save(): Promise<void> {
    this.constitution.updatedAt = Date.now();
    await saveConstitution(this.constitution);
  }

  get(): Constitution {
    return this.constitution;
  }

  /**
   * Compile the constitution into a single system prompt string,
   * ordered by priority (lowest number = highest priority).
   */
  compile(): string {
    const enabled = this.constitution.rules
      .filter((r) => r.enabled)
      .sort((a, b) => a.priority - b.priority);

    if (enabled.length === 0) return '';

    const sections: Record<string, string[]> = {};
    for (const rule of enabled) {
      const cat = rule.category.toUpperCase();
      if (!sections[cat]) sections[cat] = [];
      sections[cat].push(rule.content);
    }

    let prompt = '=== CONSTITUTION ===\n';
    for (const [cat, items] of Object.entries(sections)) {
      prompt += `\n[${cat}]\n`;
      for (const item of items) {
        prompt += `- ${item}\n`;
      }
    }
    prompt += '\n=== END CONSTITUTION ===';
    return prompt;
  }

  addRule(rule: Omit<ConstitutionRule, 'id' | 'createdAt'>): ConstitutionRule {
    const newRule: ConstitutionRule = {
      ...rule,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    this.constitution.rules.push(newRule);
    this.constitution.version++;
    this.save();
    return newRule;
  }

  updateRule(id: string, updates: Partial<ConstitutionRule>): void {
    const rule = this.constitution.rules.find((r) => r.id === id);
    if (rule) {
      Object.assign(rule, updates);
      this.constitution.version++;
      this.save();
    }
  }

  removeRule(id: string): void {
    this.constitution.rules = this.constitution.rules.filter((r) => r.id !== id);
    this.constitution.version++;
    this.save();
  }

  toggleRule(id: string): void {
    const rule = this.constitution.rules.find((r) => r.id === id);
    if (rule) {
      rule.enabled = !rule.enabled;
      this.save();
    }
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}

export const constitutionEngine = new ConstitutionEngine();
