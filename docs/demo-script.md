# Recall Demo Script (~2 min)

## Pre-recording Setup

- [ ] Screenpipe running (`screenpipe --disable-audio`)
- [ ] Capture engine running (`npm run dev:capture`) — let it run for 5+ min
- [ ] Desktop app running (`cd apps/desktop && npm run dev`)
- [ ] MCP server configured for Claude Code (`npm run setup`)
- [ ] Clean desktop, close distracting apps/tabs
- [ ] Demo data seeded if needed (`npm run seed:demo`)

---

## Script

### 1. HOOK — The Problem (10s)

> **Voiceover:** "Every time you start a conversation with an AI coding assistant, it starts from scratch — no idea what you've been working on, what's in your Slack, or what your docs say."

**Screen:** Show opening Claude Code with an empty conversation.

---

### 2. INTRO — What is Recall (10s)

> **Voiceover:** "Recall gives AI agents memory. It captures your screen, Slack, Notion, and documentation into a unified semantic memory layer — and any AI agent can search it."

**Screen:** Show the Recall dashboard (localhost:3000) with the memory timeline populating.

---

### 3. LIVE CONTEXT — Screen Capture (15s)

> **Voiceover:** "Recall captures what you're working on in real time using Screenpipe. It describes your screen activity and stores it as searchable memories."

**Screen:** Show the dashboard timeline with screen captures appearing. Click on one to show the content description. Filter by "Screen" source.

---

### 4. MCP INTEGRATION — AI Agent Queries (30s)

> **Voiceover:** "Any MCP-compatible agent — Claude Code, Cursor, Windsurf — can query your memory."

**Screen:** In Claude Code, run your team's sequence of queries. For example:

- *"What have I been working on in the last 30 minutes?"*
  → Show Recall returning screen context
- *"Search my memory for [topic you were working on]"*
  → Show semantic search results with similarity scores

---

### 5. DOC INGESTION — Context-Aware Docs (30s)

> **Voiceover:** "Recall can also ingest documentation for your project's dependencies — so your AI assistant has the reference material it needs."

**Screen:** In Claude Code:

- *"Ingest the docs for my project dependencies"*
  → Show `ingest_docs` being called with dependencies from package.json
  → Show "Ingested X pages into Y chunks" response
- *"Search my docs for [a relevant topic]"*
  → Show doc chunks coming back with source URLs

---

### 6. CLOSE — The Payoff (15s)

> **Voiceover:** "With Recall, your AI assistant knows what you've been doing, what your team discussed, and what the docs say — all from a single unified memory."

**Screen:** Show the dashboard with all sources visible (screen, docs, etc.). End on the Recall logo or GitHub repo.

---

## Recording Tips

- Record at 1920x1080 or higher
- Use a clean terminal theme with large font (14-16pt)
- Pause briefly between sections so you can cut/trim in editing
- Record voiceover separately for cleaner audio (or use Loom for screen+voice together)
- Speed up any waiting/loading sections in post (2-4x)

---

## Teammate Query Sequence

> **[INSERT YOUR TEAMMATE'S QUERIES HERE]**
>
> Replace section 4 with the actual sequence of queries your teammate has prepared. Keep the same structure: show the query, then show Recall's response.
