# Recall — Pitch & Demo Script

## Target Prize Categories

| Prize | Fit | Strategy |
|-------|-----|----------|
| **Moorcheh AI: Best AI App with Efficient Memory** | PRIMARY | Direct Moorcheh integration, dual-write, semantic retrieval across sources |
| **Bitdeer: Best Production-Ready AI Tool** | STRONG | Real-world pain point, production architecture, < $0.20/day cost |
| **Google: Best AI for Community Impact** | GOOD | Empowers every knowledge worker, open-source, MCP standard |

---

## Bold Facts for Slides

### The Problem (use these stats)
- **Knowledge workers switch apps 1,200 times per day** (Harvard Business Review)
- **The average worker uses 9.4 apps daily** and spends **30% of their day searching for information** (McKinsey)
- **$1.3 trillion in productivity lost annually** in the US alone due to information silos (IDC)
- AI coding assistants are now used by **92% of developers** but they have **zero memory** across sessions
- The average developer has context spread across **6+ tools**: IDE, Slack, Docs, Browser, Terminal, AI Assistant

### The Solution (impact stats)
- Recall captures context **every time you switch apps** — zero manual effort
- Semantic search across **6 data sources** in one query
- Costs less than **$0.20/day** to run — cheaper than a cup of coffee
- Works with **any MCP-compatible agent** — Claude Code, Cursor, and growing
- **5 MCP tools** exposed to AI agents: search, context, save, source filter, sync
- Screen descriptions via **GPT-4.1-nano** — understands diagrams, code, and UI, not just text
- **1,536-dimensional embeddings** for precise semantic matching
- **Moorcheh AI** provides explainable retrieval — you can ask *why* a result was returned

---

## Pitch Script — 2 MINUTES (strict)

**Format:** 2 min pitch + 2 min Q&A (sponsor) or 2.5 min pitch + 2.5 min Q&A (rounds 1 & 2)

### [0:00–0:15] THE HOOK

> "Your AI assistant uses 9 apps worth of context — but remembers none of it. Every session starts blind. **Recall fixes that.**"

### [0:15–0:30] WHAT IT IS

> "Recall is a unified AI memory. It captures your screen activity, Slack conversations, Notion docs, and past AI sessions — embeds everything semantically — and exposes it to any AI agent via the Model Context Protocol. One query, all your context."

### [0:30–1:15] LIVE DEMO (45 seconds — this wins it)

**Show dashboard** (5s): "Here's Recall running — memories from 5 different sources, real-time."

**Switch to Claude Code** and type:
```
What do you know about the auth token refresh issue our team has been working on?
```

**Claude responds** with Slack threads + Notion docs + past AI sessions + screen captures.

> "Four sources. One query. Zero copy-pasting. Claude went from blind to fully context-aware."

**Quick save** (10s): Type `Remember that the API rate limit was increased to 1000 req/min` → saved instantly.

### [1:15–1:40] HOW & WHY

> "GPT-4.1-nano describes your screen. text-embedding-3-small creates 1536-dim vectors. Supabase pgvector and Moorcheh AI store and retrieve semantically. All for under 20 cents a day. Event-driven capture with dedup — no wasted resources. Privacy-first — your data stays in your own database."

### [1:40–1:55] FUTURE

> "Today: individual developers. Tomorrow: team-based unified memory. Onboard a new engineer who can ask their AI 'how does this codebase work?' and get answers from months of team context."

### [1:55–2:00] CLOSE

> "Recall. Your AI's memory, unified. Thank you."

---

## Slide Deck Content (for each slide)

### Slide 1: Title
- **Recall** — The Unified AI Memory
- One line: "Your AI agents are smart, but they're blind to your full context."

### Slide 2: The Problem
- Stat: "Knowledge workers spend 30% of their day searching for information"
- Visual: Fragmented apps (Slack, Notion, VS Code, Chrome) all disconnected
- "Your AI has ZERO memory across sessions and tools"

### Slide 3: The Solution
- Architecture diagram (simple)
- "6 data sources → 1 semantic memory → any AI agent"

### Slide 4: Demo
- Live or embedded video
- "Watch Claude Code find relevant Slack threads, Notion docs, and past sessions — all from one query"

### Slide 5: Technical Architecture
- Capture pipeline: Event-driven + GPT-4.1-nano + text-embedding-3-small
- Storage: Supabase pgvector + Moorcheh AI
- Consumer: MCP Server → Claude Code / Cursor
- "Powered by Moorcheh's semantic memory engine for explainable retrieval"

### Slide 6: Why It Wins
- $0.20/day cost
- Privacy-first (your data, your Supabase)
- MCP standard (future-proof)
- Production-grade architecture

### Slide 7: Future
- Team-based unified memory
- Personal knowledge graphs
- Domain-specific versions
- "The infrastructure layer for the AI-native workplace"

### Slide 8: Thank You
- "Recall: Giving your AI the memory it deserves"
- GitHub link
- QR code to demo

---

## Exact Claude Code Demo Commands

Run these in order during the live demo. Make sure `npm run seed:demo` has been run first.

### Query 1: Cross-Source Search (THE WOW MOMENT)
```
What do you know about the auth token refresh issue our team has been working on?
```
**What happens:** Claude calls `search_memory`. Returns hits from:
- Slack thread (team discussing the bug)
- Notion doc (troubleshooting steps)
- Screen capture (VS Code with auth.ts open)
- Past Claude Code session (debugging conversation)

**What to say:** "Without Recall, Claude would say 'I don't have context.' With Recall, it pulled from FOUR different sources in one query."

### Query 2: Source-Specific Search
```
Show me what my Slack team said about the deployment
```
**What happens:** Claude calls `get_source_context` with source="slack". Returns the #devops CI/CD pipeline message.

**What to say:** "You can also filter by source — just Slack, just Notion, just screen captures."

### Query 3: Save a Memory
```
Remember that the API rate limit was increased to 1000 requests per minute last week
```
**What happens:** Claude calls `save_memory`. Confirms stored.

**What to say:** "It goes both ways. AI agents don't just READ from the memory — they WRITE to it."

### Query 4: Retrieve What You Just Saved
```
What do you know about our API rate limits?
```
**What happens:** Claude calls `search_memory`. Returns what you just saved 10 seconds ago.

**What to say:** "And it's immediately searchable. Bidirectional memory."

### Query 5: Recent Context
```
What was on my screen in the last hour?
```
**What happens:** Claude calls `get_recent_context`. Returns your actual recent screen captures.

**What to say:** "Recall sees everything you do — every app switch, every document, every code file."

### Query 6: Sync Trigger (if time allows)
```
Sync my Slack messages to get the latest
```
**What happens:** Claude calls `sync_source`. Reports items synced.

**What to say:** "AI agents can even trigger data refreshes. No manual syncing needed."

### Priority Order
**Must show:** Query 1, 3, 4 (cross-source search + bidirectional memory)
**Nice to show:** Query 5 (recent context)
**Bonus:** Query 2, 6 (source filter, sync)

---

## Devpost Submission Text

### Inspiration

Every day, knowledge workers drown in fragmented context. We use 9+ apps daily, and our AI assistants — the tools meant to boost our productivity — are completely blind to this context. Your Claude Code session doesn't know about the Slack thread where your team discussed the bug you're fixing. Your Cursor assistant can't see the Notion doc with the architecture decisions. Every AI session starts from scratch.

We asked: **What if your AI agent could remember everything?**

### What it does

Recall is a desktop companion that creates a unified, semantic memory across your entire digital workspace:

- **Screen Activity** — Captures screenshots on app switches, describes them with GPT-4.1-nano vision, and indexes the semantic meaning
- **Slack Messages** — Connects to your workspace via OAuth and indexes channel conversations
- **Notion Pages** — Connects via OAuth and indexes your docs
- **AI Agent Sessions** — Watches Claude Code and Cursor conversation histories
- **Explicit Memories** — AI agents can save important context via MCP

All of this is embedded into 1,536-dimensional vectors and made searchable via a Model Context Protocol (MCP) server. Any MCP-compatible AI agent can query your unified memory with natural language.

### How we built it

- **Capture Engine** (Node.js/TypeScript) — Event-driven screen capture with macOS screencapture CLI, hybrid timing (app-switch detection + 60s fallback), cosine-similarity deduplication
- **Vision AI** — GPT-4.1-nano describes screenshots semantically (understanding diagrams, code, UI elements)
- **Embeddings** — text-embedding-3-small generates 1,536-dim vectors for all content
- **Storage** — Supabase Postgres with pgvector extension for fast cosine similarity search
- **Moorcheh AI** — Dual-write to Moorcheh's semantic memory engine for explainable retrieval with source namespaces
- **MCP Server** (TypeScript) — 5 tools: search_memory, get_recent_context, get_source_context, save_memory, sync_source
- **Dashboard** (Next.js 16 + React 19) — Real-time memory timeline, semantic search, source filters, Slack/Notion OAuth connections
- **Setup Wizard** — CLI tool that auto-detects Claude Code/Cursor and configures MCP

### Challenges we ran into

- Balancing capture frequency vs. API costs (solved with event-driven + dedup — screens that don't change aren't re-processed)
- Supabase pgvector RPC embedding format compatibility
- Moorcheh free tier namespace limits (consolidated to single namespace with source metadata)
- Making semantic search feel instant despite network round-trips to embedding API

### Accomplishments that we're proud of

- **Cross-source context retrieval** — A single query returns relevant results from Slack, Notion, screen captures, AND past AI sessions
- **Under $0.20/day** operating cost for continuous capture
- **5 MCP tools** that work with any compatible agent out of the box
- **One-command setup** — `npm run setup` auto-configures everything
- **Proactive suggestions** — Desktop notifications when your current work matches relevant context from other tools

### What we learned

- The MCP protocol is a powerful standard for making AI agents composable
- Event-driven capture with deduplication is far more efficient than continuous recording
- GPT-4.1-nano is remarkably good at understanding screenshots semantically, not just extracting text
- Moorcheh's semantic memory engine provides a richer retrieval experience than raw vector search alone

### What's next for Recall

- **Team-based unified memory** — Shared context across teams with permission controls
- **Personal knowledge graphs** — Evolve from flat memories to connected knowledge
- **More integrations** — Google Drive, GitHub, Linear, email
- **Domain-specific versions** — Legal, medical, engineering
- **Advanced proactive agents** — AI that takes action (draft emails, summarize meetings) based on observed context

### Built with

TypeScript, Node.js, Next.js, React, Supabase, pgvector, OpenAI GPT-4.1-nano, OpenAI text-embedding-3-small, Moorcheh AI, Model Context Protocol (MCP), Tailwind CSS, shadcn/ui, Framer Motion
