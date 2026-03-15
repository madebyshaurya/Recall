# Recall — Pitch Script

Target: ~2-3 minutes total

---

## 1. HOOK / PROBLEM (30s)

> "Imagine you've been debugging an auth issue for the past hour. You checked Stack Overflow, your teammate posted a fix in Slack, and there's a troubleshooting doc in Notion. Now you open Claude Code to help — and it has no idea any of that happened.
>
> Every AI assistant today starts from zero. It doesn't know what you were just looking at, what your team discussed, or what your docs say. You spend more time re-explaining context than actually getting help.
>
> We asked: what if your AI could just remember?"

---

## 2. INTRODUCE RECALL (30s)

> "This is Recall — a unified memory layer for AI agents.
>
> Recall captures context from your screen, Slack conversations, Notion pages, and project documentation. It processes everything into semantic embeddings and stores them in a vector database. Then it exposes this memory through MCP — the Model Context Protocol — so any AI agent can search it.
>
> That means Claude Code, Cursor, Windsurf — any MCP-compatible tool gets instant access to everything you've been working on. No copy-pasting. No re-explaining. Your AI just knows."

---

## 3. LIVE DEMO (60-90s)

> "Let me show you how this works."

### 3a. Show the Dashboard (~15s)
> "Here's the Recall dashboard. You can see a timeline of everything captured — screen activity, Slack messages, Notion pages, and ingested documentation. Each memory is searchable by meaning, not just keywords."

**Action:** Show localhost:3000 with the memory timeline. Filter by different sources.

### 3b. Show MCP Integration (~20s)
> "Now let's see this from the AI agent's perspective. I'll ask Claude Code a question."

**Action:** In Claude Code, run:
- *"What have I been working on in the last 30 minutes?"*
→ Show Recall returning screen context

### 3c. Show Doc Ingestion (~20s)
> "Recall can also auto-detect your project's tech stack and ingest relevant documentation."

**Action:** In Claude Code, run:
- *"Ingest docs for my project dependencies"*
→ Show it detecting packages and ingesting docs

### 3d. The "Wow" Moment — Cross-Source Query (~20s)
> "Here's where it gets powerful. Watch what happens when I ask about something that spans multiple sources."

**Action:** In Claude Code, run your teammate's prepared query sequence. For example:
- *"What do you know about [the topic you've been working on]?"*
→ Show Recall returning results from screen captures AND documentation AND Slack/Notion

> "One question. Context from every source. That's the power of unified memory."

---

## 4. CONCLUSION (20s)

> "Recall gives AI agents the memory they deserve. One memory layer, every source, any AI agent.
>
> It runs on OpenAI for embeddings, Supabase for vector storage, Moorcheh for explainable retrieval, and the open MCP standard — all for less than 20 cents a day.
>
> We're [team name], and this is Recall. Thank you."

---

## Timing Summary

| Section | Duration |
|---------|----------|
| Hook / Problem | 30s |
| Introduce Recall | 30s |
| Live Demo | 60-90s |
| Conclusion | 20s |
| **Total** | **~2-3 min** |

## Tips

- Keep the demo moving — cut dead air, speed up loading in post if recording
- The "wow" moment is the cross-source query — make sure you have data from multiple sources seeded before recording
- Speak to the *problem* first, the *tech* second — judges care about impact
- If short on time, cut 3c (doc ingestion) — the cross-source query is the stronger demo moment
