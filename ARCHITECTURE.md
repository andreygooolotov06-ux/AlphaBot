# Architecture Specification: AlphaDate Personal AI

**Version:** 1.0.0-draft  
**Platform Target (Stage 1):** Windows 10/11 Desktop + Google Chrome (Manifest V3)

---

## 1. High-Level System Overview

```
+---------------------------------------------------------------------------------+
|                                 GOOGLE CHROME                                   |
|                                                                                 |
|  +---------------------------+                +------------------------------+  |
|  |     Content Script        |                |     Preact Sidepanel /       |  |
|  |  - DOM Dialogue Observer  | <--- IPC ----> |     Popup Operator UI        |  |
|  |  - Context Extraction     |                |  - Suggestion List & Tones   |  |
|  +---------------------------+                +------------------------------+  |
|               |                                              |                  |
|               +----------------------+-----------------------+                  |
|                                      |                                          |
|                         [Background Service Worker]                             |
|                                      |                                          |
|                                 (IndexedDB)                                     |
+--------------------------------------|------------------------------------------+
                                       |
                   WebSocket / HTTP (127.0.0.1:4789-4790)
                   Authenticated via Local Token
                                       |
+--------------------------------------v------------------------------------------+
|                       LOCAL APPLICATION DAEMON (Node.js)                         |
|                                                                                 |
|  +--------------------+   +---------------------+   +------------------------+  |
|  |    IPC Gateway     |   |     AI Core         |   |      Model Router      |  |
|  | - Protocol v1.0.0  |-->| - Prompt Pipeline   |-->| - Gemini 1.5/2.0 Flash |  |
|  | - Request Validator|   | - Context Enrichment|   | - OpenAI GPT-4o-mini   |  |
|  +--------------------+   +---------------------+   | - Anthropic Claude     |  |
|                                      |              | - Local (Ollama)       |  |
|                                      v              +------------------------+  |
|                           +---------------------+                               |
|                           |   Memory Manager    |                               |
|                           | - Short-term Buffer |                               |
|                           | - Long-term Facts   |                               |
|                           +---------------------+                               |
|                                      |                                          |
|                                      v                                          |
|                           +---------------------+                               |
|                           |  SQLite Database    |                               |
|                           | (better-sqlite3)    |                               |
|                           +---------------------+                               |
+---------------------------------------------------------------------------------+
```

---

## 2. Component Breakdown

### 2.1 Chrome Extension (`packages/chrome-extension`)
* **Technology:** Manifest V3, TypeScript, Preact (lightweight reactive UI).
* **Role:**
  * Runs inside the operator's browser session.
  * Injects content scripts to analyze active dialogue text, interlocutor nickname, and message history without blocking page interactions.
  * Renders a non-intrusive floating HUD / Sidepanel for the operator with hotkeys (`Ctrl+Shift+Space`) to insert suggested replies.
  * Stores session-local cache in **IndexedDB** for instant UI rendering.

### 2.2 Shared Contracts (`packages/contracts`)
* **Technology:** TypeScript.
* **Role:**
  * Strict boundary definition for all requests, responses, models, and errors.
  * Zero circular dependencies. Both frontend and backend compile against these contracts.

### 2.3 Local Application Daemon (`packages/local-app`)
* **Technology:** Node.js, TypeScript.
* **Role:**
  * Runs as a background Windows process on `127.0.0.1`.
  * Manages the SQLite database connection for persistent storage.
  * Acts as the secure broker between the Chrome Extension and external AI APIs, keeping API keys outside the browser extension sandbox.

### 2.4 AI Core (`packages/ai-core`)
* **Role:**
  * Independent query processing pipeline.
  * Combines dialogue context, operator instructions, and retrieved memory facts into a structured, optimized prompt.
  * Parses raw LLM completions into structured `SuggestionItem[]` arrays with tone labels and confidence ratings.

### 2.5 Model Router (`packages/model-router`)
* **Role:**
  * Abstraction over AI providers: Google Gemini, OpenAI, Anthropic, OpenRouter, and local Ollama.
  * Handles failover (if Gemini rate limits or fails, seamlessly fall back to OpenAI or local model).
  * Rate-limiting and latency monitoring.

### 2.6 Memory Manager (`packages/memory-manager`)
* **Role:**
  * **Short-Term Context:** Current chat window buffer (last N turns).
  * **Long-Term Memory:** Facts about the interlocutor (hobbies, preferences, emotional triggers, conversation boundaries) persisted in SQLite.
  * Enables context-aware dialogue progression across days and weeks.

---

## 3. Storage Division & Isolation

| Layer | Technology | Stored Data | Security Boundary |
|---|---|---|---|
| **Browser (Client)** | `IndexedDB` | Active tab state, UI preferences, temporary DOM cache | Browser Extension sandbox |
| **Local App (Host)** | `SQLite` | Full interlocutor profiles, dialogue archives, memory facts, operator notes | Local Windows user directory |
| **Secrets / Keys** | `.env` | Provider API keys, local daemon authentication secret | Machine-local only (never in Git) |

---

## 4. Phase 1 Roadmap (Local System Focus)

1. **Step 1 (Current):** Repo scaffold, strict contracts, branch strategy, and architecture sign-off.
2. **Step 2:** Implementation of `@alphadate/contracts` validation and unit tests.
3. **Step 3:** Model Router with Gemini & OpenAI adapters.
4. **Step 4:** SQLite schema creation in `@alphadate/local-app` and Memory Manager integration.
5. **Step 5:** Chrome Extension Manifest V3 background service worker and Preact Sidepanel.
6. **Step 6:** End-to-end integration and latency benchmarking on Windows.
