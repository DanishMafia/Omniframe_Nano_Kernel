// ─── Hardware Profiling ───
export interface GPUProfile {
  supported: boolean;
  adapterName: string;
  vendor: string;
  architecture: string;
  maxBufferSize: number;
  maxComputeWorkgroupsPerDimension: number;
  estimatedVRAM: number; // bytes
  tier: 'unsupported' | 'low' | 'mid' | 'high';
}

export interface SystemProfile {
  gpu: GPUProfile;
  cores: number;
  memory: number; // navigator.deviceMemory in GB
  storage: { available: number; quota: number }; // OPFS in bytes
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  browserEngine: 'webkit' | 'blink' | 'gecko' | 'unknown';
}

// ─── Model ───
export interface ModelInfo {
  id: string;
  name: string;
  size: string; // e.g. "1.5B"
  contextLength: number;
  requiredVRAM: number; // bytes
  quantization: string; // e.g. "q4f16_1"
}

// ─── Constitution ───
export interface ConstitutionRule {
  id: string;
  category: 'personality' | 'constraint' | 'preference' | 'context';
  priority: number; // 1 (highest) – 10 (lowest)
  content: string;
  enabled: boolean;
  createdAt: number;
}

export interface Constitution {
  version: number;
  rules: ConstitutionRule[];
  updatedAt: number;
}

// ─── Chat / Inference ───
export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
  tokenCount?: number;
}

export interface InferenceConfig {
  temperature: number;
  topP: number;
  maxTokens: number;
  repetitionPenalty: number;
  stream: boolean;
}

export type InferenceStatus =
  | 'idle'
  | 'loading-model'
  | 'ready'
  | 'generating'
  | 'error';

export interface InferenceProgress {
  status: InferenceStatus;
  modelId: string | null;
  loadProgress: number; // 0-1
  tokensPerSecond: number;
  error: string | null;
}

// ─── Task Loop ───
export type TaskStatus = 'pending' | 'running' | 'awaiting-input' | 'completed' | 'failed';

export interface TaskStep {
  id: string;
  description: string;
  status: TaskStatus;
  result?: string;
  error?: string;
}

export interface Task {
  id: string;
  title: string;
  steps: TaskStep[];
  status: TaskStatus;
  createdAt: number;
  completedAt?: number;
}

// ─── File Parsing ───
export interface ParsedDocument {
  name: string;
  type: 'pdf' | 'markdown' | 'text' | 'json';
  content: string;
  tokenEstimate: number;
  parsedAt: number;
}

// ─── App State ───
export type AppView = 'chat' | 'constitution' | 'tasks' | 'hardware' | 'settings' | 'files';

export interface AppSettings {
  modelId: string;
  inference: InferenceConfig;
  theme: 'dark' | 'light';
  autoLoadModel: boolean;
}
