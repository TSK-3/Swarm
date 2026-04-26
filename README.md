# Local Agentic Swarm

A local-first agentic swarm web app. Give it an idea and it coordinates research, ideation, product design, implementation planning, guarded file generation, and testing reports through multiple deterministic agents.

## Requirements

- Node.js 22+
- npm 10+
- Ollama for real local model runs

The app still runs without Ollama. In that mode it uses transparent fallback responses so you can test the workflow, approvals, and artifacts before installing a model.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For real local generation, install Ollama and pull at least one model:

```bash
ollama pull qwen2.5-coder
ollama pull llama3.1
```

If your Ollama server exposes a cloud model, the app will prefer it when available. To use Ollama's direct cloud API instead of the local server, copy `.env.example` to `.env.local`, set `OLLAMA_API_KEY`, and restart the app.

Ollama API references:

- Local API base URL: `http://localhost:11434/api`
- Direct cloud API base URL: `https://ollama.com/api`

## Safety Model

The swarm pauses before any gated action:

- creating or editing project files
- installing dependencies
- running generated code
- running tests/builds
- deleting files

Generated output is isolated under `generated-projects/`.

Generated projects are runnable Next.js apps with a mock login, habit dashboard, streak tracking, weekly analytics, and browser-local persistence.
