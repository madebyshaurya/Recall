# Recall Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified AI memory desktop app + MCP server that captures screen activity, Slack, Notion, and AI agent sessions, making them searchable by any MCP-compatible AI agent.

**Architecture:** Screenpipe sidecar for screen capture → Node.js intelligence pipeline (gpt-4.1-nano + text-embedding-3-small) → Supabase pgvector + Moorcheh for storage → TypeScript MCP server for AI agent access → Tauri + React desktop app for dashboard.

**Tech Stack:** Tauri v2, React 19, TypeScript, Supabase (pgvector), OpenAI API, Screenpipe, Moorcheh Python SDK, @modelcontextprotocol/sdk

**Spec:** `STRATEGY.md` (root)

---

## Step 1: Monorepo + Supabase Foundation

**What we're building:** pnpm monorepo skeleton, Supabase project with pgvector schema, shared config.

**Stop point:** You can run a script that writes a test row to Supabase `memories` table and reads it back.

**Files:**
- Create: `package.json` (root workspace)
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.env`
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `packages/shared/package.json`
- Create: `packages/shared/src/supabase.ts` — shared Supabase client
- Create: `packages/shared/src/types.ts` — shared TypeScript types (Memory, Connection, etc.)
- Create: `packages/shared/src/config.ts` — env var loading
- Create: `packages/shared/tsconfig.json`
- Create: `scripts/test-supabase.ts` — quick test script

### Steps

- [ ] **Step 1.1: Initialize monorepo**

Create root `package.json` with pnpm workspaces, `pnpm-workspace.yaml`, and base tsconfig.

```bash
cd /Users/shauryagupta/Downloads/recall
pnpm init
```

Then create `pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

And `tsconfig.base.json` with strict mode, ES2022 target, NodeNext module resolution.

- [ ] **Step 1.2: Create Supabase project**

Go to https://supabase.com/dashboard → New Project → name it "recall".
Save the URL, anon key, and service role key to `.env`.

- [ ] **Step 1.3: Run database migration**

Create `supabase/migrations/001_initial_schema.sql` with the full schema from STRATEGY.md:
- Enable pgvector extension
- `memories` table with vector(1536) column
- `connections` table
- `capture_settings` table
- `search_memories` function
- All indexes

Run it via Supabase SQL Editor or CLI.

- [ ] **Step 1.4: Create shared package**

`packages/shared/` with:
- `src/types.ts` — `Memory`, `Connection`, `CaptureSettings` interfaces
- `src/supabase.ts` — initialized Supabase client using env vars
- `src/config.ts` — loads `.env` via dotenv, exports all config
- `src/index.ts` — barrel export

- [ ] **Step 1.5: Write and run Supabase test script**

`scripts/test-supabase.ts` — inserts a test memory row (with a dummy 1536-dim vector), reads it back, deletes it. Run with `npx tsx scripts/test-supabase.ts`.

**Verify:** Script prints the inserted row successfully.

- [ ] **Step 1.6: Commit**

```bash
git init
git add -A
git commit -m "feat: monorepo skeleton + supabase schema + shared package"
```

---

## Step 2: OpenAI Helpers (Embeddings + Vision)

**What we're building:** Reusable OpenAI helpers for embedding text and describing screenshots. These are the intelligence building blocks everything else depends on.

**Stop point:** You can run a script that embeds a text string and describes an image file, both printing results.

**Files:**
- Create: `packages/shared/src/embeddings.ts` — `embedText(text) → number[]`
- Create: `packages/shared/src/vision.ts` — `describeScreenshot(imageBase64) → string`
- Create: `scripts/test-openai.ts` — test both functions

### Steps

- [ ] **Step 2.1: Create embeddings helper**

`packages/shared/src/embeddings.ts`:
- `embedText(text: string): Promise<number[]>` — calls OpenAI `text-embedding-3-small`, returns 1536-dim vector
- `embedTexts(texts: string[]): Promise<number[][]>` — batch version

- [ ] **Step 2.2: Create vision helper**

`packages/shared/src/vision.ts`:
- `describeScreenshot(imageBase64: string): Promise<string>` — sends image to `gpt-4.1-nano` with the prompt from STRATEGY.md, returns text description
- Accepts base64 PNG, returns concise description

- [ ] **Step 2.3: Test both**

`scripts/test-openai.ts`:
- Embed the string "debugging auth token refresh in React app" → print vector length (should be 1536)
- Take a screenshot via `screencapture -x /tmp/test-screenshot.png`, read as base64, send to vision → print description

```bash
npx tsx scripts/test-openai.ts
```

**Verify:** Embedding returns 1536-dim array. Vision returns a meaningful description of your current screen.

- [ ] **Step 2.4: Commit**

```bash
git add packages/shared/src/embeddings.ts packages/shared/src/vision.ts scripts/test-openai.ts
git commit -m "feat: openai embedding + vision helpers"
```

---

## Step 3: Capture Engine — Screen Capture Pipeline

**What we're building:** The core capture loop. Polls screenpipe (or falls back to `screencapture` CLI), describes screenshots via gpt-4.1-nano, embeds, deduplicates, writes to Supabase.

**Stop point:** The capture engine runs as a background process, and after 2-3 minutes you see memories appearing in Supabase with real screen descriptions.

**Files:**
- Create: `packages/capture-engine/package.json`
- Create: `packages/capture-engine/tsconfig.json`
- Create: `packages/capture-engine/src/index.ts` — main capture loop
- Create: `packages/capture-engine/src/screenpipe.ts` — screenpipe REST client
- Create: `packages/capture-engine/src/fallback-capture.ts` — macOS screencapture CLI fallback
- Create: `packages/capture-engine/src/dedup.ts` — cosine similarity dedup
- Create: `packages/capture-engine/src/pipeline.ts` — orchestrates: capture → describe → embed → store

### Steps

- [ ] **Step 3.1: Scaffold capture-engine package**

`packages/capture-engine/package.json` with dependencies: `openai`, `@supabase/supabase-js`, `dotenv`. Inherits from shared package.

- [ ] **Step 3.2: Build screenpipe client**

`src/screenpipe.ts`:
- `getLatestCaptures(since: Date): Promise<ScreenpipeCapture[]>` — polls `http://localhost:3030/search` for OCR frames since timestamp
- `isScreenpipeRunning(): Promise<boolean>` — health check
- Types for screenpipe API response

- [ ] **Step 3.3: Build fallback capture**

`src/fallback-capture.ts`:
- `captureScreen(): Promise<string>` — runs `screencapture -x /tmp/recall-capture.png`, returns base64
- `getActiveWindow(): Promise<{title: string, app: string}>` — runs `osascript` to get frontmost app + window title
- This is the fallback if screenpipe isn't running

- [ ] **Step 3.4: Build deduplication**

`src/dedup.ts`:
- `cosineSimilarity(a: number[], b: number[]): number`
- `isDuplicate(newEmbedding: number[], lastEmbedding: number[], threshold = 0.90): boolean`
- Keep last embedding in memory for fast comparison

- [ ] **Step 3.5: Build pipeline orchestrator**

`src/pipeline.ts`:
- `processCapture(imageBase64: string, metadata: object): Promise<Memory | null>`
  1. Call `describeScreenshot(imageBase64)` → get text description
  2. Call `embedText(description)` → get vector
  3. Check `isDuplicate()` against last embedding → skip if duplicate
  4. Write to Supabase `memories` table with source='screen', metadata={window_title, app_name}
  5. Return the stored memory or null if duplicate

- [ ] **Step 3.6: Build main capture loop**

`src/index.ts`:
- On start, check if screenpipe is running → use screenpipe client or fallback
- Hybrid capture logic:
  - Poll active window title every 2s
  - If title changed → capture immediately
  - If 60s since last capture → capture anyway (fallback timer)
- Each capture goes through `processCapture()` pipeline
- Log each capture to console: `[screen] Captured: "VS Code — auth.ts" (stored/duplicate)`

- [ ] **Step 3.7: Run and verify**

```bash
cd packages/capture-engine
npx tsx src/index.ts
```

Let it run for 2-3 minutes. Switch between a few apps.

**Verify:**
- Console shows captures happening on app switch + time fallback
- Supabase `memories` table has rows with source='screen', real descriptions, embeddings
- Duplicates are being skipped (check console logs)

- [ ] **Step 3.8: Commit**

```bash
git add packages/capture-engine/
git commit -m "feat: screen capture engine with vision + embedding + dedup pipeline"
```

---

## Step 4: MCP Server — Core Tools

**What we're building:** TypeScript MCP server that exposes `search_memory`, `get_recent_context`, `get_source_context`, and `save_memory` tools. Any MCP-compatible agent can query the unified memory.

**Stop point:** You can configure Claude Code to use the MCP server, ask "what was on my screen recently?", and get real results from Supabase.

**Files:**
- Create: `packages/mcp-server/package.json`
- Create: `packages/mcp-server/tsconfig.json`
- Create: `packages/mcp-server/src/index.ts` — MCP server entry, stdio transport
- Create: `packages/mcp-server/src/tools.ts` — all 4 tool handlers
- Create: `packages/mcp-server/src/search.ts` — Supabase pgvector search logic

### Steps

- [ ] **Step 4.1: Scaffold MCP server package**

`packages/mcp-server/package.json` with dependencies: `@modelcontextprotocol/sdk`, `@supabase/supabase-js`, `openai`, `dotenv`.

- [ ] **Step 4.2: Build search logic**

`src/search.ts`:
- `searchMemories(query: string, opts?: {source?, limit?, timeRange?}): Promise<Memory[]>`
  1. Embed the query via `embedText(query)`
  2. Call Supabase RPC `search_memories` with the embedding
  3. Return ranked results
- `getRecentMemories(minutes: number, source?: string): Promise<Memory[]>`
  - Simple time-based query on `captured_at`
- `saveMemory(content: string, metadata?: object): Promise<Memory>`
  - Embed content, write to Supabase with source='mcp_log'

- [ ] **Step 4.3: Build tool handlers**

`src/tools.ts`:
- Define all 4 tools with their JSON schemas (name, description, inputSchema)
- Handler function for each that calls the search logic
- `search_memory` → `searchMemories(query, {source, limit, time_range})`
- `get_recent_context` → `getRecentMemories(minutes, source)`
- `get_source_context` → `searchMemories(query, {source, limit})`
- `save_memory` → `saveMemory(content, metadata)`
- Each handler also logs the interaction to Supabase as an `mcp_log` memory (bidirectional logging)

- [ ] **Step 4.4: Build MCP server entry**

`src/index.ts`:
- Create MCP server with `@modelcontextprotocol/sdk`
- Register all 4 tools
- Use stdio transport
- Add `bin` entry to package.json so it can be invoked as `npx recall-mcp`

- [ ] **Step 4.5: Test with Claude Code**

Add to Claude Code MCP config (`~/.claude/settings.json` or project-level):
```json
{
  "mcpServers": {
    "recall": {
      "command": "npx",
      "args": ["tsx", "/Users/shauryagupta/Downloads/recall/packages/mcp-server/src/index.ts"],
      "env": {
        "OPENAI_API_KEY": "...",
        "SUPABASE_URL": "...",
        "SUPABASE_SERVICE_ROLE_KEY": "..."
      }
    }
  }
}
```

Start a new Claude Code session and ask:
- "What was on my screen recently?" → should return screen captures from Step 3
- "Search my memory for [topic you were working on]" → should return semantically relevant results
- "Remember that the API key is stored in vault-prod" → should save a new memory

**Verify:** All 4 tools work. Results come from Supabase. Bidirectional logging creates `mcp_log` entries.

- [ ] **Step 4.6: Commit**

```bash
git add packages/mcp-server/
git commit -m "feat: MCP server with search_memory, get_recent_context, get_source_context, save_memory"
```

---

## Step 5: Slack Integration

**What we're building:** Slack message ingestion. Polls channels for new messages, embeds them, stores in Supabase.

**Stop point:** Slack messages from your workspace appear in Supabase `memories` table, and you can search for them via the MCP server.

**Files:**
- Create: `packages/capture-engine/src/slack.ts` — Slack API client + ingestion
- Modify: `packages/capture-engine/src/index.ts` — add Slack polling to main loop

### Steps

- [ ] **Step 5.1: Create Slack App**

Go to https://api.slack.com/apps → Create New App → From Scratch.
- Add Bot Token Scopes: `channels:history`, `channels:read`, `groups:history`, `groups:read`
- Install to workspace
- Copy Bot User OAuth Token → add to `.env` as `SLACK_BOT_TOKEN`

- [ ] **Step 5.2: Build Slack ingestion**

`packages/capture-engine/src/slack.ts`:
- `fetchNewMessages(channelId: string, since: Date): Promise<SlackMessage[]>`
- `ingestSlackMessages(): Promise<void>`
  1. List channels via `conversations.list`
  2. For each channel, fetch messages since last poll
  3. Batch messages into ~500 token conversation chunks
  4. Embed each chunk
  5. Write to Supabase with source='slack', metadata={channel_name, channel_id}, source_url=slack permalink
- Track last polled timestamp per channel

- [ ] **Step 5.3: Add Slack to main capture loop**

Modify `packages/capture-engine/src/index.ts`:
- Add Slack polling interval (every 60 seconds)
- Run alongside screen capture (non-blocking)

- [ ] **Step 5.4: Test end-to-end**

1. Run capture engine: `npx tsx packages/capture-engine/src/index.ts`
2. Send a few messages in a Slack channel
3. Wait 60s for poll
4. Check Supabase for `source='slack'` rows
5. In Claude Code (with MCP): "What are the recent Slack discussions?"

**Verify:** Slack messages appear in Supabase. MCP search returns them. Permalinks work.

- [ ] **Step 5.5: Commit**

```bash
git add packages/capture-engine/src/slack.ts packages/capture-engine/src/index.ts
git commit -m "feat: slack message ingestion pipeline"
```

---

## Step 6: Notion Integration

**What we're building:** Notion page ingestion. Polls for recently modified pages, extracts content, embeds, stores.

**Stop point:** Notion pages appear in Supabase and are searchable via MCP.

**Files:**
- Create: `packages/capture-engine/src/notion.ts` — Notion API client + ingestion
- Modify: `packages/capture-engine/src/index.ts` — add Notion polling

### Steps

- [ ] **Step 6.1: Create Notion Integration**

Go to https://www.notion.so/my-integrations → New Integration.
- Give it read access to content
- Share target pages/databases with the integration
- Copy token → add to `.env` as `NOTION_INTEGRATION_TOKEN`

- [ ] **Step 6.2: Build Notion ingestion**

`packages/capture-engine/src/notion.ts`:
- `fetchRecentlyModifiedPages(since: Date): Promise<NotionPage[]>`
  - Uses Notion `search` API with `last_edited_time` filter
- `extractPageContent(pageId: string): Promise<string>`
  - Fetches all blocks, extracts text recursively (paragraphs, headings, lists, code blocks)
- `ingestNotionPages(): Promise<void>`
  1. Fetch recently modified pages
  2. Extract text from each
  3. Chunk into ~500 token segments
  4. Embed each chunk
  5. Write to Supabase with source='notion', metadata={page_title, page_id}, source_url=notion URL

- [ ] **Step 6.3: Add Notion to main capture loop**

Poll every 5 minutes (Notion content changes less frequently).

- [ ] **Step 6.4: Test end-to-end**

1. Edit a Notion page with some distinctive content
2. Run capture engine, wait for Notion poll
3. Check Supabase for `source='notion'` rows
4. In Claude Code: "What do my Notion notes say about [topic]?"

**Verify:** Notion content searchable via MCP.

- [ ] **Step 6.5: Commit**

```bash
git add packages/capture-engine/src/notion.ts packages/capture-engine/src/index.ts
git commit -m "feat: notion page ingestion pipeline"
```

---

## Step 7: AI Agent Session Capture

**What we're building:** File watchers for Claude Code and Cursor conversation histories. Also bidirectional MCP logging (already partially done in Step 4).

**Stop point:** Past Claude Code conversations appear as searchable memories. An agent in one session can find context from a different session.

**Files:**
- Create: `packages/capture-engine/src/agent-watcher.ts` — file watchers for agent sessions
- Modify: `packages/capture-engine/src/index.ts` — add agent watchers to main loop

### Steps

- [ ] **Step 7.1: Research agent data locations**

Find where Claude Code and Cursor store conversation data:
- Claude Code: `~/.claude/projects/` — JSONL conversation files
- Cursor: `~/Library/Application Support/Cursor/` — chat history

Examine the file formats to know how to parse them.

- [ ] **Step 7.2: Build agent watcher**

`packages/capture-engine/src/agent-watcher.ts`:
- Use `chokidar` to watch for file changes in agent data directories
- On change: parse new conversation turns (since last read)
- For each turn: extract the human message + assistant response as content
- Embed and store with source='claude_code' or source='cursor'
- Metadata: {project_path, conversation_id, role}

- [ ] **Step 7.3: Add to main loop**

Start file watchers when capture engine boots.

- [ ] **Step 7.4: Test**

1. Run capture engine
2. Have a conversation in Claude Code about a specific topic
3. Check Supabase for `source='claude_code'` rows
4. In a NEW Claude Code session with MCP: "What did I discuss in my last coding session?"

**Verify:** Cross-session context works. This is a key demo moment.

- [ ] **Step 7.5: Commit**

```bash
git add packages/capture-engine/src/agent-watcher.ts packages/capture-engine/src/index.ts
git commit -m "feat: ai agent session capture (claude code + cursor file watchers)"
```

---

## Step 8: Moorcheh Integration

**What we're building:** Python bridge that dual-writes to Moorcheh alongside Supabase. MCP search also queries Moorcheh for explainable retrieval. This wins the sponsor track.

**Stop point:** Memories are stored in both Supabase and Moorcheh. MCP search returns Moorcheh results with explanations.

**Files:**
- Create: `packages/moorcheh-bridge/main.py` — FastAPI server wrapping Moorcheh SDK
- Create: `packages/moorcheh-bridge/requirements.txt`
- Create: `packages/shared/src/moorcheh.ts` — TypeScript client that calls the Python bridge
- Modify: `packages/capture-engine/src/pipeline.ts` — dual-write to Moorcheh
- Modify: `packages/mcp-server/src/search.ts` — also query Moorcheh

### Steps

- [ ] **Step 8.1: Build Python Moorcheh bridge**

`packages/moorcheh-bridge/main.py` — FastAPI server on port 8100:
- `POST /store` — stores a memory in Moorcheh (content, namespace, metadata)
- `POST /search` — searches Moorcheh (query, namespace, limit)
- `GET /health` — health check
- Uses `moorcheh` Python SDK with namespaces: screen, slack, notion, claude_code, cursor, mcp_log

`requirements.txt`: moorcheh, fastapi, uvicorn

- [ ] **Step 8.2: Build TypeScript Moorcheh client**

`packages/shared/src/moorcheh.ts`:
- `storeMoorcheh(content: string, namespace: string, metadata: object): Promise<void>`
- `searchMoorcheh(query: string, namespace?: string, limit?: number): Promise<MoorchehResult[]>`
- Both call the Python bridge via HTTP (localhost:8100)

- [ ] **Step 8.3: Add dual-write to pipeline**

Modify `packages/capture-engine/src/pipeline.ts`:
- After writing to Supabase, also call `storeMoorcheh()` (fire-and-forget, don't block on it)
- If Moorcheh is down, log warning but continue (Supabase is primary)

- [ ] **Step 8.4: Add Moorcheh to MCP search**

Modify `packages/mcp-server/src/search.ts`:
- `searchMemories()` now queries both Supabase AND Moorcheh
- Merge results, deduplicate by content similarity
- Include Moorcheh's explanation in the response

- [ ] **Step 8.5: Test**

1. Start Moorcheh bridge: `cd packages/moorcheh-bridge && uvicorn main:app --port 8100`
2. Run capture engine — verify dual-writes (check Moorcheh dashboard if available)
3. In Claude Code: search for something → verify Moorcheh results appear alongside Supabase results

**Verify:** Dual-write works. MCP returns merged results. Moorcheh explanations visible.

- [ ] **Step 8.6: Commit**

```bash
git add packages/moorcheh-bridge/ packages/shared/src/moorcheh.ts
git add packages/capture-engine/src/pipeline.ts packages/mcp-server/src/search.ts
git commit -m "feat: moorcheh integration with dual-write + merged search"
```

---

## Step 9: Tauri Desktop App — Shell + Timeline

**What we're building:** Tauri v2 desktop app with React frontend. Main view is the memory timeline with semantic search. System tray for capture status.

**Stop point:** A working desktop app that shows your memories in a scrollable timeline and lets you search them semantically.

**Files:**
- Create: `apps/desktop/` — full Tauri v2 + React + TypeScript scaffold
- Create: `apps/desktop/src/lib/supabase.ts` — browser-side Supabase client
- Create: `apps/desktop/src/hooks/useMemories.ts` — fetch memories hook
- Create: `apps/desktop/src/hooks/useSearch.ts` — semantic search hook
- Create: `apps/desktop/src/components/MemoryCard.tsx` — single memory entry
- Create: `apps/desktop/src/components/SearchBar.tsx` — search input
- Create: `apps/desktop/src/components/SourceFilter.tsx` — filter chips
- Create: `apps/desktop/src/pages/Timeline.tsx` — main timeline view
- Create: `apps/desktop/src/App.tsx` — router + layout

### Steps

- [ ] **Step 9.1: Scaffold Tauri app**

```bash
cd apps
pnpm create tauri-app desktop --template react-ts
cd desktop
pnpm add @supabase/supabase-js @tanstack/react-query tailwindcss
```

Set up Tailwind, configure Tauri for macOS.

- [ ] **Step 9.2: Build Supabase client + hooks**

`src/lib/supabase.ts` — Supabase client initialized from env/config.

`src/hooks/useMemories.ts`:
- `useMemories(source?: string)` — fetches recent memories from Supabase, sorted by `captured_at desc`
- Uses TanStack Query with auto-refetch every 10s

`src/hooks/useSearch.ts`:
- `useSearch(query: string)` — calls a Supabase Edge Function or direct RPC to embed query + search
- Returns ranked results with similarity scores
- Note: For search, we need to embed the query client-side. Add an API route or edge function that takes a query string, embeds it via OpenAI, and calls `search_memories` RPC.

- [ ] **Step 9.3: Build UI components**

`MemoryCard.tsx`:
- Source icon (screen=monitor, slack=hash, notion=doc, agents=bot)
- Content preview (first 200 chars)
- Timestamp (relative: "2 min ago", "1 hour ago")
- App/window name from metadata
- Color-coded left border by source
- Click to expand full content

`SearchBar.tsx`:
- Text input with search icon
- Debounced input (300ms)
- Loading spinner during search

`SourceFilter.tsx`:
- Horizontal filter chips: All | Screen | Slack | Notion | AI Agents
- Active state styling

- [ ] **Step 9.4: Build Timeline page**

`src/pages/Timeline.tsx`:
- SearchBar at top
- SourceFilter below search
- When no search query: show chronological memories via `useMemories()`
- When search query entered: show ranked results via `useSearch()`
- Each result rendered as `MemoryCard`
- Empty state: "No memories yet. Start the capture engine to begin."

- [ ] **Step 9.5: Set up App shell + routing**

`src/App.tsx`:
- TanStack Query provider
- Simple tab navigation: Timeline | Connections | Settings
- Timeline as default view
- Basic layout with sidebar or top nav

- [ ] **Step 9.6: Configure Tauri system tray**

In `src-tauri/src/main.rs` (or `lib.rs`):
- Add system tray icon
- Tray menu: "Open Recall", "Pause Capture", "Quit"
- Tray icon changes based on capture status

- [ ] **Step 9.7: Test**

```bash
cd apps/desktop
pnpm tauri dev
```

**Verify:**
- App opens and shows memory timeline
- Memories from screen capture, Slack, Notion appear
- Semantic search returns relevant results
- Source filters work
- System tray icon visible

- [ ] **Step 9.8: Commit**

```bash
git add apps/desktop/
git commit -m "feat: tauri desktop app with memory timeline + semantic search"
```

---

## Step 10: Connections Page + Settings

**What we're building:** UI pages for managing integrations (Slack, Notion) and capture settings.

**Stop point:** User can see connected accounts and adjust capture settings from the app.

**Files:**
- Create: `apps/desktop/src/pages/Connections.tsx`
- Create: `apps/desktop/src/pages/Settings.tsx`
- Create: `apps/desktop/src/components/ConnectionCard.tsx`
- Modify: `apps/desktop/src/App.tsx` — add routes

### Steps

- [ ] **Step 10.1: Build Connections page**

`Connections.tsx`:
- Grid of `ConnectionCard` components
- Each card: provider icon, name, status badge, last sync time
- Connect/Disconnect button (for hackathon: just updates Supabase `connections` table status)
- Cards for: Slack, Notion, Claude Code, Cursor, Screen Capture (always on)

- [ ] **Step 10.2: Build Settings page**

`Settings.tsx`:
- Capture interval slider (15s - 120s)
- Idle timeout slider (1min - 10min)
- Excluded apps list (text input to add, X to remove)
- Enabled sources toggles
- Reads/writes to Supabase `capture_settings` table
- Save button

- [ ] **Step 10.3: Wire up navigation**

Add tab links in App.tsx for Timeline, Connections, Settings.

- [ ] **Step 10.4: Test**

**Verify:** Both pages render, settings save to Supabase, connection status shows correctly.

- [ ] **Step 10.5: Commit**

```bash
git add apps/desktop/src/pages/ apps/desktop/src/components/ConnectionCard.tsx
git commit -m "feat: connections page + settings page"
```

---

## Step 11: Proactive Suggestions (Desktop Notifications)

**What we're building:** Background process that periodically checks if current screen context matches memories from other sources, and sends a macOS notification if so.

**Stop point:** While working, you get a desktop notification like "Related Slack thread found: 'Auth token refresh'" without asking for it.

**Files:**
- Create: `packages/capture-engine/src/suggestions.ts` — proactive suggestion engine
- Modify: `packages/capture-engine/src/index.ts` — add suggestion loop

### Steps

- [ ] **Step 11.1: Build suggestion engine**

`packages/capture-engine/src/suggestions.ts`:
- `checkForSuggestions(): Promise<Suggestion | null>`
  1. Get the last 3 screen capture descriptions
  2. Combine into a "current context" query
  3. Search Supabase for matches with similarity > 0.85 from DIFFERENT sources (not 'screen')
  4. If match found from slack/notion/agent that hasn't been suggested before, return it
- `sendNotification(suggestion: Suggestion): void`
  - Uses `node-notifier` or `osascript` to send macOS notification
  - Title: "Recall"
  - Body: "Related [source]: [content preview]"
- Track suggested memory IDs to avoid repeating

- [ ] **Step 11.2: Add to main loop**

Run `checkForSuggestions()` every 5 minutes alongside capture.

- [ ] **Step 11.3: Test**

1. Make sure you have Slack/Notion memories about a topic
2. Start working on something related (so screen captures match)
3. Wait for suggestion cycle

**Verify:** Desktop notification appears with relevant cross-source context.

- [ ] **Step 11.4: Commit**

```bash
git add packages/capture-engine/src/suggestions.ts packages/capture-engine/src/index.ts
git commit -m "feat: proactive desktop notifications for cross-source suggestions"
```

---

## Step 12: Demo Polish + Seed Data

**What we're building:** Pre-seeded demo data, polished UI, end-to-end demo rehearsal.

**Stop point:** The full demo script from STRATEGY.md runs flawlessly.

**Files:**
- Create: `scripts/seed-demo-data.ts` — seeds Supabase with compelling demo memories
- Modify: various UI files for polish

### Steps

- [ ] **Step 12.1: Create demo seed script**

`scripts/seed-demo-data.ts`:
- Insert Slack memories: thread about "AuthService token refresh issue", team discussion about deployment
- Insert Notion memories: "Frontend Auth Flow — Troubleshooting" page content, "API Architecture" docs
- Insert screen memories: descriptions of browsing Stack Overflow for auth issues, looking at code in VS Code
- Insert agent memories: past Claude Code conversation about debugging auth
- All with proper embeddings, realistic timestamps (spread over last 3 days), correct metadata

```bash
npx tsx scripts/seed-demo-data.ts
```

- [ ] **Step 12.2: UI polish**

- Refine colors, spacing, typography in the Tauri app
- Make sure source icons are distinct and clear
- Ensure search results look good with similarity scores
- Add Recall logo/branding to the app header
- Loading states and empty states look clean

- [ ] **Step 12.3: End-to-end demo rehearsal**

Run through the exact demo script from STRATEGY.md Section 12:
1. Start all services (capture engine, Moorcheh bridge, MCP server)
2. Open Claude Code with Recall MCP
3. Ask demo queries — verify results are compelling
4. Check proactive notification fires
5. Open desktop app — show timeline and search
6. Time it (target: 2.5 minutes)

- [ ] **Step 12.4: Record backup demo video**

Screen record a clean run of the demo as backup.

- [ ] **Step 12.5: Final commit**

```bash
git add -A
git commit -m "feat: demo seed data + ui polish + final prep"
```

---

## Execution Order Summary

| Step | What | Depends On | Stop & Test |
|------|------|------------|-------------|
| 1 | Monorepo + Supabase | Nothing | Write/read test row |
| 2 | OpenAI helpers | Step 1 | Embed text + describe screenshot |
| 3 | Screen capture engine | Steps 1, 2 | Memories appear in Supabase |
| 4 | MCP server | Steps 1, 2, 3 | Claude Code queries work |
| 5 | Slack integration | Steps 1, 2 | Slack messages in Supabase + MCP |
| 6 | Notion integration | Steps 1, 2 | Notion pages in Supabase + MCP |
| 7 | AI agent capture | Steps 1, 2 | Cross-session context works |
| 8 | Moorcheh integration | Steps 1-7 | Dual-write + merged search |
| 9 | Desktop app (timeline) | Steps 1-4 | App shows memories + search |
| 10 | Connections + Settings | Step 9 | UI pages work |
| 11 | Proactive suggestions | Steps 3-7 | Desktop notifications fire |
| 12 | Demo polish | All | Full demo runs in 2.5 min |
