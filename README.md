# Omniframe Nano Kernel

**Browser-native AI engine with WebGPU inference, sovereign memory, and autonomous logic loops.**

> No Cloud. No Subscription. No Latency. Your hardware, your intelligence.

## Features

- **WebGPU Inference** — Run LLMs directly in the browser at 30-40 tok/s via WebLLM/MLC-LLM
- **Hardware Profiler** — Auto-detect GPU capabilities, VRAM, and recommend optimal models
- **Memory Constitution** — Persistent JSON ruleset injected as high-priority system tokens
- **Long-Context Injection** — Parse PDF/Markdown/Text and stream directly into the context window
- **Autonomous Task Loops** — Self-prompting multi-step task execution with Web Locks API
- **OPFS Persistence** — All data stored locally in the browser's Origin Private File System
- **PWA / Offline-First** — Install as a native app, works fully offline after first load

## Tech Stack

- **Runtime**: WebGPU (Chrome 113+, Safari 18+, Firefox 147+)
- **Frontend**: Vite + React + TypeScript + Tailwind CSS v4
- **AI Engine**: @mlc-ai/web-llm
- **Storage**: IndexedDB + OPFS
- **Distribution**: PWA with Service Workers

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in a WebGPU-capable browser.

## Hardware Requirements

| Platform | Minimum |
|----------|---------|
| Mobile | Apple A17 Pro+ / Snapdragon 8 Gen 3+ |
| Desktop | 4GB+ VRAM with WebGPU drivers |
| Storage | 5GB+ available via OPFS |

## Architecture

```
src/
├── engine/
│   ├── hardware-profiler.ts   # WebGPU capability detection
│   ├── inference-engine.ts    # WebLLM wrapper + streaming
│   ├── constitution.ts        # Memory Constitution engine
│   ├── file-parser.ts         # PDF/MD/TXT → context
│   └── task-loop.ts           # Autonomous task execution
├── storage/
│   └── opfs-store.ts          # IndexedDB persistence layer
├── types/
│   └── index.ts               # TypeScript type definitions
└── ui/
    ├── components/            # React UI components
    └── hooks/                 # Custom React hooks
```

## License

MIT
