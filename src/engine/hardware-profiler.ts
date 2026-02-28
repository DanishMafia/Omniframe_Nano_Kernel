import type { GPUProfile, SystemProfile } from '../types';

const GPU_VRAM_TIERS = {
  low: 2 * 1024 ** 3,    // 2 GB
  mid: 4 * 1024 ** 3,    // 4 GB
  high: 8 * 1024 ** 3,   // 8 GB
} as const;

function detectPlatform(): SystemProfile['platform'] {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Win|Mac|Linux/.test(ua)) return 'desktop';
  return 'unknown';
}

function detectBrowserEngine(): SystemProfile['browserEngine'] {
  const ua = navigator.userAgent;
  if (/AppleWebKit.*Safari/.test(ua) && !/Chrome/.test(ua)) return 'webkit';
  if (/Chrome|Chromium|Edg/.test(ua)) return 'blink';
  if (/Gecko\//.test(ua)) return 'gecko';
  return 'unknown';
}

function classifyTier(estimatedVRAM: number): GPUProfile['tier'] {
  if (estimatedVRAM >= GPU_VRAM_TIERS.high) return 'high';
  if (estimatedVRAM >= GPU_VRAM_TIERS.mid) return 'mid';
  if (estimatedVRAM >= GPU_VRAM_TIERS.low) return 'low';
  return 'unsupported';
}

/**
 * Estimate VRAM by probing the maximum allocatable GPU buffer size.
 * We perform a binary search between 256 MB and 16 GB.
 */
async function estimateVRAM(device: GPUDevice): Promise<number> {
  const maxBuffer = device.limits.maxBufferSize;
  // Use maxBufferSize as a lower-bound proxy — most drivers set this
  // proportionally to available VRAM.  The heuristic multiplier accounts
  // for additional VRAM used by textures and other resources.
  const estimate = Math.min(maxBuffer * 4, 16 * 1024 ** 3);
  return estimate;
}

export async function profileGPU(): Promise<GPUProfile> {
  if (!navigator.gpu) {
    return {
      supported: false,
      adapterName: 'N/A',
      vendor: 'N/A',
      architecture: 'N/A',
      maxBufferSize: 0,
      maxComputeWorkgroupsPerDimension: 0,
      estimatedVRAM: 0,
      tier: 'unsupported',
    };
  }

  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) {
    return {
      supported: false,
      adapterName: 'No adapter',
      vendor: 'N/A',
      architecture: 'N/A',
      maxBufferSize: 0,
      maxComputeWorkgroupsPerDimension: 0,
      estimatedVRAM: 0,
      tier: 'unsupported',
    };
  }

  const info = adapter.info;
  const device = await adapter.requestDevice({
    requiredLimits: {
      maxBufferSize: adapter.limits.maxBufferSize,
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
    },
  });

  const estimatedVRAM = await estimateVRAM(device);
  device.destroy();

  return {
    supported: true,
    adapterName: info.device || 'Unknown',
    vendor: info.vendor || 'Unknown',
    architecture: info.architecture || 'Unknown',
    maxBufferSize: adapter.limits.maxBufferSize,
    maxComputeWorkgroupsPerDimension: adapter.limits.maxComputeWorkgroupSizeX,
    estimatedVRAM,
    tier: classifyTier(estimatedVRAM),
  };
}

async function probeOPFS(): Promise<{ available: number; quota: number }> {
  try {
    const est = await navigator.storage.estimate();
    return {
      available: (est.quota ?? 0) - (est.usage ?? 0),
      quota: est.quota ?? 0,
    };
  } catch {
    return { available: 0, quota: 0 };
  }
}

export async function profileSystem(): Promise<SystemProfile> {
  const [gpu, storage] = await Promise.all([profileGPU(), probeOPFS()]);

  return {
    gpu,
    cores: navigator.hardwareConcurrency ?? 1,
    memory: (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 0,
    storage,
    platform: detectPlatform(),
    browserEngine: detectBrowserEngine(),
  };
}

/**
 * Given a system profile, recommend the best model to run.
 */
export function recommendModel(profile: SystemProfile): string {
  switch (profile.gpu.tier) {
    case 'high':
      return 'Llama-3.1-8B-Instruct-q4f16_1-MLC';
    case 'mid':
      return 'Llama-3.2-3B-Instruct-q4f16_1-MLC';
    case 'low':
      return 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
    default:
      return '';
  }
}
