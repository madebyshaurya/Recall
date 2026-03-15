# Recall — The Unified AI Memory
## Complete Hackathon Strategy & Technical Design

**Hackathon:** GenAI Genesis 2026
**Team:** Solo
**Stack:** Tauri v2 + React + TypeScript, Node.js, Python (Moorcheh bridge), Supabase

---

## 1. What We're Building

Recall is a desktop app that creates a **unified semantic memory** across your screen activity, Slack, Notion, and AI agent sessions (Claude Code, Cursor). It exposes this memory via an **MCP server** so any AI agent can query your full context.

**Two deliverables:**
1. **Desktop App** (Tauri + React) — captures context, shows memory timeline + search, manages connections
2. **MCP Server** (TypeScript + Python Moorcheh bridge) — exposes unified memory to Claude Code, Cursor, etc.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CAPTURE LAYER                           │
│                                                              │
│  Screenpipe (sidecar)     → raw screenshots + window events  │
│  Slack API (polling)      → channel messages                 │
│  Notion API (polling)     → pages and blocks                 │
│  AI Agent Sessions:                                          │
│    → Claude Code (~/.claude/) file watcher                   │
│    → Cursor chat history file watcher                        │
│    → MCP query/response bidirectional logging                │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│             INTELLIGENCE PIPELINE (Node.js)                  │
│                                                              │
│  1. Hybrid capture: event-driven + 60s fallback              │
│  2. gpt-4.1-nano → rich text description of screenshot       │
│  3. text-embedding-3-small → 1536-dim vector embedding       │
│  4. Deduplication: skip if >90% cosine similarity to last    │
│  5. Write to Supabase pgvector + Moorcheh                    │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    STORAGE LAYER                             │
│                                                              │
│  Supabase Postgres + pgvector                                │
│    → vectors, metadata, source tracking                      │
│    → primary search engine (cosine similarity)               │
│  Moorcheh Semantic Memory                                    │
│    → sponsor track integration                               │
│    → explainable retrieval, namespaces per source            │
│  (Screenshots are TRANSIENT — only text/vectors stored)      │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   CONSUMER LAYER                             │
│                                                              │
│  MCP Server (TypeScript)                                     │
│    → search_memory, get_recent_context,                      │
│      get_source_context, save_memory                         │
│    → Python subprocess for Moorcheh API calls                │
│  Tauri Desktop App (React + TypeScript)                      │
│    → Memory timeline with search                             │
│    → Connected accounts management                           │
│    → Capture settings / privacy controls                     │
│  macOS Desktop Notifications                                 │
│    → Proactive contextual suggestions                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Capture Strategy (Hybrid)

### Event-Driven Triggers (capture immediately)
- App/window switch (detected via active window title polling every 2s)
- URL change in browser (window title change)
- Significant typing pause (3-5s after sustained input)

### Time-Based Fallback
- If no event-triggered capture in 60 seconds, capture anyway
- Catches passive activities (reading docs, reviewing PRs)

### Deduplication
- Before storing, compare new text against last stored capture
- If >90% cosine similarity, skip storage
- Prevents redundant captures during idle reading

### Idle Detection
- No mouse/keyboard activity for 2+ minutes → pause capturing
- Resume on first input event

### Privacy
- User-configurable excluded apps list (e.g., password managers, banking)
- All data stored in user's own Supabase project
- Screenshots are transient — deleted after text extraction

---

## 4. AI Models & Costs

| Model | Purpose | Cost | Usage |
|-------|---------|------|-------|
| **gpt-4.1-nano** | Describe screenshots (vision) | $0.10/1M input, $0.40/1M output | ~$0.10-0.20/day |
| **text-embedding-3-small** | Embed text → 1536-dim vectors | $0.02/1M tokens | ~$0.01/day |

**Total cost for 8-hour demo day: < $0.30**

### Screenshot Description Workflow
```
1. Screenpipe captures screenshot
2. Send to gpt-4.1-nano with prompt:
   "Describe what's on this screen. Include: app name, what the user
    is doing, any visible code/text/diagrams, and the broader context
    of the work. Be concise but capture semantic meaning."
3. Response (~100-200 tokens) is the "content" stored in memories table
4. Content is embedded via text-embedding-3-small
5. Vector + content + metadata stored in Supabase pgvector
```

---

## 5. Supabase Database Schema

### Enable pgvector
```sql
create extension if not exists vector;
```

### `memories` — core table
```sql
create table memories (
  id uuid primary key default gen_random_uuid(),
  source text not null,              -- 'screen', 'slack', 'notion', 'claude_code', 'cursor', 'mcp_log'
  content text not null,             -- extracted/described text
  embedding vector(1536),            -- text-embedding-3-small output
  metadata jsonb default '{}',       -- window_title, app_name, channel, page_id, etc.
  source_url text,                   -- link back to original (slack permalink, notion url)
  captured_at timestamptz default now(),
  session_id text,                   -- groups related captures
  is_duplicate boolean default false
);

create index on memories using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index on memories (source);
create index on memories (captured_at desc);
create index on memories using gin (metadata);
```

### `connections` — linked accounts
```sql
create table connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null,            -- 'slack', 'notion', 'google_drive'
  access_token text,
  refresh_token text,
  workspace_name text,
  connected_at timestamptz default now(),
  status text default 'active'
);
```

### `capture_settings` — user preferences
```sql
create table capture_settings (
  id uuid primary key default gen_random_uuid(),
  capture_interval_seconds int default 60,
  idle_timeout_seconds int default 120,
  enabled_sources jsonb default '["screen","slack","notion","ai_agents"]',
  excluded_apps jsonb default '[]',
  created_at timestamptz default now()
);
```

### Semantic Search Function
```sql
create or replace function search_memories(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 10,
  source_filter text default null
)
returns table (
  id uuid,
  source text,
  content text,
  metadata jsonb,
  source_url text,
  captured_at timestamptz,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    m.id, m.source, m.content, m.metadata, m.source_url, m.captured_at,
    1 - (m.embedding <=> query_embedding) as similarity
  from memories m
  where
    m.is_duplicate = false
    and (source_filter is null or m.source = source_filter)
    and 1 - (m.embedding <=> query_embedding) > match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

---

## 6. MCP Server Design

### Tools Exposed

**`search_memory`** — Semantic search across all sources
```json
{
  "name": "search_memory",
  "description": "Search the user's unified memory across screen captures, Slack, Notion, and AI agent sessions",
  "parameters": {
    "query": "string — natural language search query",
    "source": "string? — filter by source: screen, slack, notion, claude_code, cursor",
    "limit": "number? — max results (default 10)",
    "time_range": "string? — 'last_hour', 'last_day', 'last_week'"
  }
}
```

**`get_recent_context`** — Chronological recent activity
```json
{
  "name": "get_recent_context",
  "description": "Get the user's recent activity and context from the last N minutes",
  "parameters": {
    "minutes": "number? — how far back to look (default 30)",
    "source": "string? — filter by source"
  }
}
```

**`get_source_context`** — Source-filtered search
```json
{
  "name": "get_source_context",
  "description": "Search within a specific source (Slack, Notion, screen, etc.)",
  "parameters": {
    "source": "string — 'slack', 'notion', 'screen', 'claude_code', 'cursor'",
    "query": "string — what to search for",
    "limit": "number? — max results (default 10)"
  }
}
```

**`save_memory`** — Explicit memory storage from agents
```json
{
  "name": "save_memory",
  "description": "Explicitly save an important piece of context to the unified memory",
  "parameters": {
    "content": "string — the information to remember",
    "metadata": "object? — additional context tags"
  }
}
```

### MCP Server Architecture
```
TypeScript MCP Server (main)
  ├── @modelcontextprotocol/sdk — handles MCP protocol
  ├── Supabase client — queries pgvector
  ├── OpenAI client — generates embeddings for queries
  ├── Bidirectional logging — captures all MCP interactions as memories
  └── Python subprocess → Moorcheh bridge
       └── moorcheh-python-sdk — queries Moorcheh for sponsor track
```

### Moorcheh Integration
- **Namespaces:** `screen`, `slack`, `notion`, `claude_code`, `cursor`, `mcp_log`
- All memories written to both Supabase AND Moorcheh (dual-write)
- MCP search queries both, merges results
- Moorcheh's explainable retrieval shown in the demo for judges

---

## 7. Desktop App (Tauri + React)

### Pages / Views

**1. Memory Timeline (Main View)**
- Scrollable timeline of all captured context
- Each entry shows: source icon, content preview, timestamp, app/context
- Color-coded by source (screen=blue, slack=purple, notion=green, agents=orange)
- Semantic search bar at top
- Filter chips: All | Screen | Slack | Notion | AI Agents

**2. Search View**
- Full semantic search with results ranked by relevance
- Each result shows similarity score, source, timestamp
- Click to expand full content
- "Search across all your memory" — this is the demo money shot

**3. Connections**
- Cards for each integration (Slack, Notion)
- Connect/disconnect buttons (OAuth flow)
- Status indicator (active, syncing, error)
- Last sync timestamp

**4. Settings**
- Capture frequency slider
- Idle timeout config
- Excluded apps list (add/remove)
- Enabled sources toggles
- API key management

**5. Capture Status (Menubar/Tray)**
- Tray icon showing capture status (active/paused/idle)
- Quick toggle capture on/off
- "Recall is watching" indicator

### Tech Stack
- **Tauri v2** — desktop shell, system tray, native notifications
- **React 18+ with TypeScript** — UI framework
- **TailwindCSS** — styling
- **Supabase JS client** — database queries
- **React Query / TanStack Query** — data fetching + caching

---

## 8. Proactive Suggestions

### How It Works
1. Every 5 minutes (or on significant context change), the suggestion engine runs
2. Takes the last 3-5 screen captures as "current context"
3. Searches unified memory for semantically similar past context
4. If high-similarity matches found from DIFFERENT sources (e.g., current screen matches a Slack conversation), trigger a suggestion
5. Show as macOS native notification via Tauri's notification API

### Suggestion Types
- **Related discussion found:** "A Slack thread about [topic] may be relevant to what you're working on"
- **Relevant docs:** "A Notion page about [topic] might help"
- **Past solution:** "You solved a similar issue last week — here's what you did"
- **Agent context:** "Claude Code discussed [topic] yesterday in a different session"

### Implementation
- Simple semantic similarity threshold (> 0.85 similarity across different sources = trigger)
- No complex LLM reasoning needed — the retrieval IS the intelligence
- Notification includes a deep link to open the relevant memory in the Recall app

---

## 9. Data Ingestion Pipelines

### Screen Capture Pipeline
```
Screenpipe REST API (localhost:3030)
  → Poll every 5s for new captures
  → gpt-4.1-nano: describe screenshot
  → text-embedding-3-small: embed description
  → Deduplicate (cosine similarity check)
  → Write to Supabase + Moorcheh
```

### Slack Pipeline
```
Slack Bot Token (conversations.history API)
  → Poll channels every 60s for new messages
  → Batch messages into conversation chunks
  → text-embedding-3-small: embed each chunk
  → Write to Supabase + Moorcheh (namespace: slack)
  → Store slack permalink as source_url
```

### Notion Pipeline
```
Notion Integration Token (search API + blocks API)
  → Poll for recently modified pages every 5 min
  → Extract page content as plain text
  → Chunk into ~500 token segments
  → text-embedding-3-small: embed each chunk
  → Write to Supabase + Moorcheh (namespace: notion)
  → Store notion page URL as source_url
```

### AI Agent Session Pipeline
```
File Watchers:
  → ~/.claude/ — watch for new/modified conversation files
  → Cursor data dir — watch for chat history changes
  → Parse conversation turns
  → text-embedding-3-small: embed each turn
  → Write to Supabase + Moorcheh (namespace: claude_code / cursor)

MCP Bidirectional Logging:
  → Every tool call to the MCP server is logged
  → Query + response stored as a memory (namespace: mcp_log)
```

---

## 10. Project Structure

```
recall/
├── STRATEGY.md                    # This file
├── .env                           # API keys (gitignored)
├── .gitignore
├── package.json                   # Root workspace
│
├── apps/
│   └── desktop/                   # Tauri v2 + React app
│       ├── src/                   # React frontend
│       │   ├── components/        # UI components
│       │   ├── pages/             # Timeline, Search, Connections, Settings
│       │   ├── hooks/             # Custom hooks (useMemories, useSearch, etc.)
│       │   ├── lib/               # Supabase client, API helpers
│       │   └── App.tsx
│       ├── src-tauri/             # Tauri Rust backend
│       │   ├── src/
│       │   │   └── main.rs        # System tray, notifications, sidecar management
│       │   └── Cargo.toml
│       └── package.json
│
├── packages/
│   ├── mcp-server/                # TypeScript MCP server
│   │   ├── src/
│   │   │   ├── index.ts           # MCP server entry
│   │   │   ├── tools.ts           # search_memory, get_recent_context, etc.
│   │   │   ├── supabase.ts        # Supabase pgvector queries
│   │   │   ├── embeddings.ts      # OpenAI embedding helper
│   │   │   └── moorcheh-bridge.ts # Spawns Python subprocess
│   │   └── package.json
│   │
│   ├── capture-engine/            # Node.js capture + intelligence pipeline
│   │   ├── src/
│   │   │   ├── index.ts           # Main capture loop
│   │   │   ├── screenpipe.ts      # Screenpipe REST API client
│   │   │   ├── vision.ts          # gpt-4.1-nano screenshot description
│   │   │   ├── embeddings.ts      # text-embedding-3-small
│   │   │   ├── dedup.ts           # Deduplication logic
│   │   │   ├── slack.ts           # Slack API ingestion
│   │   │   ├── notion.ts          # Notion API ingestion
│   │   │   ├── agent-watcher.ts   # Claude Code + Cursor file watchers
│   │   │   └── supabase.ts        # Write to Supabase
│   │   └── package.json
│   │
│   └── moorcheh-bridge/           # Python Moorcheh integration
│       ├── main.py                # FastAPI or stdin/stdout bridge
│       ├── requirements.txt       # moorcheh-sdk, etc.
│       └── README.md
│
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql # All tables + functions
```

---

## 11. Environment Variables

```env
# .env (gitignored — NEVER commit)

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Moorcheh
MOORCHEH_API_KEY=...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Slack (setup during hackathon)
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...

# Notion (setup during hackathon)
NOTION_INTEGRATION_TOKEN=ntn_...

# Screenpipe
SCREENPIPE_API_URL=http://localhost:3030
```

---

## 12. Demo Script (The "Wow" Moment)

### Setup Before Demo
- Recall running in background for 30+ min capturing screen activity
- Pre-seed Slack with a conversation about "auth token refresh bug"
- Pre-seed Notion with a page "Frontend Auth Flow — Troubleshooting"
- Have a Claude Code session where you discussed a related issue

### Demo Flow (2.5 minutes)

**1. The Problem (30s)**
- Show yourself struggling with a bug in VS Code
- Try asking Claude Code for help — it gives a generic answer (no context)
- "My AI doesn't know about the Slack discussion or my Notion notes..."

**2. Activate Recall MCP (15s)**
- Show Claude Code now connected to Recall's MCP server
- Ask: "What do you know about auth token refresh issues I've been working on?"
- Claude Code queries Recall → gets context from Slack, Notion, AND past screen captures

**3. The "Wow" (45s)**
- Claude Code responds with SPECIFIC context:
  - "I found a Slack thread where your team discussed this exact issue..."
  - "Your Notion page has troubleshooting steps for this flow..."
  - "You were looking at refreshAccessToken() in utils/auth.ts yesterday..."
- The AI now has FULL CONTEXT across all your tools

**4. Proactive Notification (15s)**
- A desktop notification pops up from Recall:
  "Related: Slack thread 'AuthService token refresh' + Notion page 'Auth Flow Troubleshooting'"
- "Recall doesn't just respond — it proactively surfaces relevant context"

**5. Show the Dashboard (30s)**
- Open Recall desktop app
- Show the memory timeline with entries from screen, Slack, Notion, Claude Code
- Do a semantic search: "auth token" → results from ALL sources
- Show the connections page with Slack + Notion linked

**6. Wrap Up (15s)**
- "Recall gives your AI the memory it deserves"
- "Every AI agent becomes context-aware across your entire digital workspace"
- Mention Moorcheh's role in explainable retrieval

### Key Selling Points for Judges
- **Moorcheh track:** Direct integration, namespaces per source, explainable retrieval
- **Bitdeer track:** Production-ready Tauri + Rust, efficient capture pipeline, < $0.30/day operating cost
- **Google track:** Empowers individual productivity, makes AI agents accessible and effective
- **IBM track:** Multi-modal data pipeline, semantic indexing, vector search analytics

---

## 13. Implementation Order (Solo, 36 Hours)

### Phase 1: Foundation (Hours 1-6)
- [ ] Initialize monorepo (pnpm workspaces)
- [ ] Supabase project setup + run migration SQL
- [ ] Tauri v2 + React app scaffold (use template)
- [ ] Install screenpipe, verify REST API works
- [ ] .env setup with all API keys
- [ ] Basic Supabase client + test write/read

### Phase 2: Capture Engine (Hours 7-14)
- [ ] Screenpipe API client (poll for new captures)
- [ ] gpt-4.1-nano vision integration (describe screenshots)
- [ ] text-embedding-3-small embedding helper
- [ ] Deduplication logic
- [ ] Write pipeline: capture → describe → embed → Supabase + Moorcheh
- [ ] Window title polling for event-driven triggers
- [ ] Idle detection

### Phase 3: Integrations (Hours 15-20)
- [ ] Slack API setup (OAuth or bot token)
- [ ] Slack message ingestion pipeline
- [ ] Notion API setup (integration token)
- [ ] Notion page ingestion pipeline
- [ ] Claude Code file watcher
- [ ] MCP bidirectional logging

### Phase 4: MCP Server (Hours 21-26)
- [ ] TypeScript MCP server scaffold (@modelcontextprotocol/sdk)
- [ ] search_memory tool (Supabase pgvector query)
- [ ] get_recent_context tool
- [ ] get_source_context tool
- [ ] save_memory tool
- [ ] Moorcheh Python bridge (subprocess)
- [ ] Test with Claude Code manually

### Phase 5: Desktop App UI (Hours 27-32)
- [ ] Memory timeline view (main page)
- [ ] Semantic search with results
- [ ] Connections page (Slack, Notion status)
- [ ] Settings page (capture controls, excluded apps)
- [ ] System tray icon + capture status
- [ ] macOS notification for proactive suggestions

### Phase 6: Demo Polish (Hours 33-36)
- [ ] Pre-seed demo data (Slack thread, Notion page, screen captures)
- [ ] Practice demo script end-to-end
- [ ] Bug fixes, edge cases
- [ ] Record backup demo video
- [ ] Devpost submission

---

## 14. Key Dependencies

```json
{
  "desktop": {
    "@tauri-apps/cli": "^2.x",
    "@tauri-apps/api": "^2.x",
    "react": "^19.x",
    "tailwindcss": "^4.x",
    "@tanstack/react-query": "^5.x",
    "@supabase/supabase-js": "^2.x"
  },
  "mcp-server": {
    "@modelcontextprotocol/sdk": "latest",
    "@supabase/supabase-js": "^2.x",
    "openai": "^4.x"
  },
  "capture-engine": {
    "openai": "^4.x",
    "@supabase/supabase-js": "^2.x",
    "@slack/web-api": "^7.x",
    "@notionhq/client": "^2.x",
    "chokidar": "^4.x"
  },
  "moorcheh-bridge (Python)": {
    "moorcheh": "latest",
    "fastapi": "latest",
    "uvicorn": "latest"
  }
}
```

---

## 15. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Screenpipe doesn't work on macOS | Fallback: `screencapture` CLI + `osascript` for window title. 30 min to build. |
| Slack/Notion OAuth takes too long | Use bot tokens directly (no OAuth flow). Hardcode workspace. |
| Moorcheh API issues | Supabase pgvector is primary. Moorcheh is bonus for sponsor track. |
| Tauri build issues | Fallback: Electron. Or just build MCP server + web dashboard (skip desktop app). |
| Running out of time on UI | Skip settings page. Focus on timeline + search only. |
| Demo data not compelling | Pre-seed 2 hours before demo. Script the exact queries. |

---

## 16. What Makes This Win

1. **Not another chatbot** — it's infrastructure that makes ALL your AI agents smarter
2. **Cross-source intelligence** — the magic is when Slack context helps your coding agent
3. **Bidirectional AI learning** — agents both READ from and WRITE to the unified memory
4. **Production-viable costs** — < $0.30/day to run
5. **Privacy-first** — user owns their data (their own Supabase), screenshots never stored
6. **MCP standard** — works with any MCP-compatible agent, not locked to one tool
