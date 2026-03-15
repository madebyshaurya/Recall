# Recall — Claude Code Instructions

## Memory

ALWAYS use the Recall MCP tools for memory operations. NEVER use Claude's built-in memory system.

- To search for context: use the `search_memory` tool
- To get recent activity: use the `get_recent_context` tool
- To search a specific source: use the `get_source_context` tool
- To save/remember something: use the `save_memory` tool
- To refresh Slack or Notion data: use the `sync_source` tool

When the user asks you to "remember" something, use `save_memory` — not Claude's internal memory.
When the user asks "what was I working on" or "what do you know about X", use `search_memory` first.

## About This Project

Recall is a unified AI memory system. It captures screen activity, Slack messages, Notion pages, and AI agent sessions into a searchable semantic memory layer via Supabase pgvector and Moorcheh AI. This MCP server gives you access to all of that context.
