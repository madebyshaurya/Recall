# Recall — The Unified AI Memory

> Your AI agents are smart, but they're blind to your full context. Recall gives them the memory they deserve.

Recall is an intelligent desktop companion that creates a **unified, semantic memory layer** across your screen activity, Slack, Notion, and AI agent sessions (Claude Code, Cursor, etc.). It exposes this memory via a **Model Context Protocol (MCP) server**, making any AI agent context-aware across your entire digital workspace.

## What It Does

- **Screen Capture** — Event-driven + interval-based screen capture with GPT-4.1-nano vision for rich semantic descriptions
- **Multi-Source Ingestion** — Pulls context from Slack conversations, Notion pages, and AI agent chat histories
- **Semantic Search** — All memories embedded via `text-embedding-3-small` and stored in Supabase pgvector for fast similarity search
- **MCP Server** — Exposes `search_memory`, `get_recent_context`, `get_source_context`, and `save_memory` tools for any MCP-compatible agent
- **Proactive Suggestions** — Desktop notifications when your current work matches relevant context from other sources
- **Explainable Retrieval** — Moorcheh AI integration for high-fidelity semantic memory with explainable results

## Architecture

```
Screen Capture + Slack + Notion + AI Agents
                    ↓
        Intelligence Pipeline (Node.js)
      gpt-4.1-nano → text-embedding-3-small
                    ↓
     Supabase pgvector + Moorcheh Semantic Memory
                    ↓
              MCP Server (TypeScript)
                    ↓
     Claude Code / Cursor / Any MCP Agent
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Desktop App | Tauri v2 + React 19 + TypeScript |
| Capture Engine | Node.js + Screenpipe |
| Vision AI | OpenAI GPT-4.1-nano |
| Embeddings | OpenAI text-embedding-3-small (1536-dim) |
| Vector Database | Supabase Postgres + pgvector |
| Semantic Memory | Moorcheh AI |
| MCP Server | TypeScript + @modelcontextprotocol/sdk |
| UI Components | shadcn/ui + Magic UI + Aceternity UI |

## Project Structure

```
recall/
├── apps/desktop/          # Tauri v2 + React desktop app
├── packages/
│   ├── shared/            # Shared types, config, OpenAI helpers
│   ├── capture-engine/    # Screen + Slack + Notion + Agent ingestion
│   ├── mcp-server/        # MCP server for AI agent integration
│   └── moorcheh-bridge/   # Python bridge for Moorcheh SDK
├── supabase/migrations/   # Database schema
└── scripts/               # Test and seed scripts
```

## Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Rust (for Tauri)
- Python 3.10+ (for Moorcheh bridge)
- [Screenpipe](https://github.com/screenpipe/screenpipe) installed

### Installation

```bash
git clone https://github.com/madebyshaurya/Recall.git
cd Recall
pnpm install
```

### Environment

Copy `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Required keys:
- `OPENAI_API_KEY` — for embeddings and vision
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — for vector storage
- `MOORCHEH_API_KEY` — for semantic memory
- `SLACK_BOT_TOKEN` — for Slack integration
- `NOTION_INTEGRATION_TOKEN` — for Notion integration

### Database

Run the migration in Supabase SQL Editor:

```sql
-- See supabase/migrations/001_initial_schema.sql
```

### Running

```bash
# Start capture engine
pnpm dev:capture

# Start MCP server (configure in Claude Code/Cursor)
pnpm dev:mcp

# Start desktop app
pnpm dev:desktop

# Start Moorcheh bridge
pnpm dev:moorcheh
```

### Using with Claude Code

Add to your Claude Code MCP config:

```json
{
  "mcpServers": {
    "recall": {
      "command": "npx",
      "args": ["tsx", "packages/mcp-server/src/index.ts"],
      "env": {
        "OPENAI_API_KEY": "your-key",
        "SUPABASE_URL": "your-url",
        "SUPABASE_SERVICE_ROLE_KEY": "your-key"
      }
    }
  }
}
```

## Demo

> "What do you know about auth token refresh issues I've been working on?"

Recall searches across your screen captures, Slack threads, Notion docs, and past Claude Code sessions to give your AI agent the full picture — without you manually copy-pasting context.

## Built For

**GenAI Genesis 2026** — Canada's Largest AI Hackathon

### Sponsor Track Alignment

- **Moorcheh AI** — Direct integration for semantic memory with explainable retrieval
- **Bitdeer** — Production-ready architecture (Tauri + Rust), < $0.30/day operating cost
- **Google** — Empowers individual productivity through context-aware AI agents
- **IBM** — Multi-modal data pipeline with semantic indexing and vector search analytics

## License

MIT
