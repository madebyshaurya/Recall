<p align="center">
  <img src="assets/logo.png" alt="Recall Logo" width="120" />
</p>

<h1 align="center">Recall — The Unified AI Memory</h1>

<p align="center">
  <em>Your AI agents are smart, but they're blind to your full context. Recall gives them the memory they deserve.</em>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> · <a href="#features">Features</a> · <a href="#mcp-tools">MCP Tools</a> · <a href="#demo">Demo</a> · <a href="#tech-stack">Tech Stack</a>
</p>

Recall is an intelligent desktop companion that creates a **unified, semantic memory layer** across your screen activity, Slack, Notion, and AI agent sessions (Claude Code, Cursor, etc.). It exposes this memory via a **Model Context Protocol (MCP) server**, making any AI agent context-aware across your entire digital workspace.

## The Problem

Every day, knowledge workers juggle dozens of apps — Slack, Notion, code editors, browsers. Your AI coding assistant doesn't know about the Slack thread where your team discussed the bug you're fixing. Your AI can't see the Notion doc with the architecture decisions. Context is fragmented, and AI agents are blind.

## The Solution

Recall creates a **single, searchable memory** that spans everything:

- **Screen Activity** — Event-driven captures described by GPT-4.1-nano vision
- **Slack Messages** — Channel conversations via OAuth integration
- **Notion Pages** — Document content via OAuth integration
- **AI Agent Sessions** — Claude Code & Cursor conversation history
- **Explicit Memories** — Anything you tell your AI to remember

All of this is **semantically embedded** and searchable via natural language. Any MCP-compatible AI agent can query it.

## Architecture

```
┌─────────────────────────────────────────────┐
│              CAPTURE LAYER                   │
│  Screen (macOS) · Slack · Notion · AI Agents │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│         INTELLIGENCE PIPELINE                │
│  GPT-4.1-nano (vision) → Embedding (1536d)   │
│  Deduplication → Dual-write                  │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│            STORAGE LAYER                     │
│  Supabase pgvector + Moorcheh AI             │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│           CONSUMER LAYER                     │
│  MCP Server · Dashboard · Notifications      │
│  Claude Code · Cursor · Any MCP Agent        │
└─────────────────────────────────────────────┘
```

## Features

| Feature | Description |
|---------|-------------|
| **Hybrid Screen Capture** | Event-driven (app switch) + 60s fallback with deduplication |
| **AI Vision** | GPT-4.1-nano describes screenshots semantically |
| **Vector Search** | text-embedding-3-small → Supabase pgvector (1536-dim) |
| **5 MCP Tools** | search_memory, get_recent_context, get_source_context, save_memory, sync_source |
| **Slack OAuth** | Connect any workspace, sync channel messages |
| **Notion OAuth** | Connect workspace, sync pages and docs |
| **Agent Capture** | Watches Claude Code/Cursor conversation files |
| **Moorcheh AI** | Dual-write for explainable semantic retrieval |
| **Proactive Suggestions** | macOS notifications when cross-source context matches |
| **Dashboard** | Real-time memory timeline, semantic search, connections |
| **Setup Wizard** | `npm run setup` auto-configures MCP for detected agents |

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Dashboard | Next.js 16 + React 19 + TypeScript |
| UI | shadcn/ui + Tailwind CSS + Framer Motion |
| Capture Engine | Node.js + macOS screencapture + GPT-4.1-nano |
| Embeddings | OpenAI text-embedding-3-small (1536-dim) |
| Vector Database | Supabase Postgres + pgvector |
| Semantic Memory | Moorcheh AI |
| MCP Server | TypeScript + @modelcontextprotocol/sdk |
| Integrations | Slack API + Notion API (OAuth) |

## Quick Start

### Prerequisites
- Node.js 20+
- npm 9+
- macOS (for screen capture)

### Install
```bash
git clone https://github.com/madebyshaurya/Recall.git
cd Recall
npm install
cd apps/desktop && npm install && cd ../..
```

### Configure
```bash
cp .env.example .env
# Fill in: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MOORCHEH_API_KEY
```

### Set up database
Run `supabase/migrations/001_initial_schema.sql` in your Supabase SQL Editor.

### Connect AI agents
```bash
npm run setup
```

### Run
```bash
# Terminal 1: Start capture engine
npm run dev:capture

# Terminal 2: Start dashboard
npm run dev:dashboard

# Open http://localhost:3000
```

### Seed demo data (optional)
```bash
npm run seed:demo
```

## MCP Tools

Once connected, your AI agent has these tools:

| Tool | Description |
|------|-------------|
| `search_memory` | Semantic search across all sources |
| `get_recent_context` | What you've been doing in the last N minutes |
| `get_source_context` | Search within a specific source (Slack, Notion, etc.) |
| `save_memory` | Explicitly save something to remember |
| `sync_source` | Trigger a refresh of Slack or Notion data |

**Example:** Ask Claude Code *"What do my Slack conversations say about the auth bug?"* and it queries across Slack messages, Notion docs, screen captures, and past agent sessions.

## Demo

> *"I'm stuck on this auth token refresh bug..."*

Without Recall: Claude Code only sees your current file. Generic answer.

With Recall: Claude Code searches your unified memory and finds:
- A **Slack thread** where your team discussed the exact same issue
- A **Notion doc** with troubleshooting steps for the auth flow
- A **past Claude Code session** where you debugged a similar problem
- A **Stack Overflow page** you viewed yesterday about JWT refresh tokens

All without you copying or pasting anything.

## Cost

| Model | Purpose | Daily Cost |
|-------|---------|-----------|
| GPT-4.1-nano | Screenshot descriptions | ~$0.15 |
| text-embedding-3-small | Vector embeddings | ~$0.01 |
| **Total** | | **< $0.20/day** |

## Built For

**GenAI Genesis 2026** — Canada's Largest AI Hackathon

### Sponsor Track Alignment
- **Moorcheh AI** — Direct integration for semantic memory with explainable retrieval
- **Bitdeer** — Production-ready architecture, < $0.20/day operating cost
- **Google** — Empowers individual productivity through context-aware AI agents
- **IBM** — Multi-modal data pipeline with semantic indexing and vector search

## License

MIT
