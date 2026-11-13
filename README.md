# AlphaDate Personal AI

> High-performance, modular personal AI system assisting operators in browser environments.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-brightgreen.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![Preact](https://img.shields.io/badge/UI-Preact-673ab8.svg)](https://preactjs.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

---

## 📖 About The Project

AlphaDate Personal AI is an intelligent assistant designed to enhance operator productivity in browser-based communications. The system features a decoupled, multi-tier architecture consisting of a lightweight Chrome Extension interface and an independent Local Application daemon housing the AI Core, Model Router, and long-term memory engine.

### Key Pillars
- **Decoupled AI Core:** Intelligence processing is detached from presentation layers.
- **Dynamic Model Router:** Multi-provider support (Gemini, OpenAI, Anthropic, Local Ollama) with automated fallback.
- **Contextual Memory Engine:** Two-tier memory architecture (short-term buffer + persistent SQLite long-term facts).
- **Strict Monorepo Contracts:** Centralized type definitions and schemas in `@alphadate/contracts`.
- **Operator Privacy & Security:** API keys, database files, and customer chats reside strictly on the local machine.

---

## 📂 Monorepo Structure

```
alphadate-personal-ai/
├── packages/
│   ├── contracts/         # @alphadate/contracts (Shared DTOs, IPC protocols, Zod schemas)
│   ├── ai-core/           # @alphadate/ai-core (Query processing pipeline & prompt synthesis)
│   ├── model-router/      # @alphadate/model-router (Multi-provider LLM router & fallbacks)
│   ├── memory-manager/    # @alphadate/memory-manager (Short-term context & long-term memory)
│   ├── local-app/         # @alphadate/local-app (Local Windows daemon, SQLite storage, WebSocket)
│   └── chrome-extension/  # @alphadate/chrome-extension (Manifest V3, Preact Sidepanel HUD)
├── ARCHITECTURE.md        # Complete system architecture specification
├── AGENTS.md              # Multi-agent collaboration protocol (Antigravity)
├── SYNC.md                # Agent synchronization & milestone log
├── CONTRIBUTING.md        # Branching, commit conventions, and review guidelines
└── .env.example           # Environment template
```

---

## 🚀 Quick Start (Development)

### Prerequisites
- **Node.js:** v20.0.0 or higher
- **npm:** v10.0.0 or higher
- **Google Chrome:** (for Manifest V3 extension loading)

### 1. Clone & Install
```bash
git clone <repository-url>
cd alphadate-personal-ai
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your local ports and AI API keys
```

### 3. Build Shared Contracts First
```bash
npm run --workspace=@alphadate/contracts build
```

---

## 🤝 Collaboration Protocol

This repository is developed cooperatively by two developer stations via **Antigravity**.  
Please read **[AGENTS.md](./AGENTS.md)** and **[ARCHITECTURE.md](./ARCHITECTURE.md)** before submitting code changes.
