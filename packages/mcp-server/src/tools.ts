import { z } from 'zod';
import { searchMemories, getRecentMemories, saveMemory } from './search.js';
import type { MemorySource } from '../../../packages/shared/src/types.js';

// Tool definitions for MCP
export const TOOLS = [
  {
    name: 'search_memory',
    description:
      "Search the user's unified memory across screen captures, Slack, Notion, and AI agent sessions. Use this to find relevant context from the user's digital workspace.",
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query',
        },
        source: {
          type: 'string',
          enum: ['screen', 'slack', 'notion', 'claude_code', 'cursor', 'mcp_log'],
          description: 'Optional: filter by source type',
        },
        limit: {
          type: 'number',
          description: 'Max results to return (default 10)',
        },
        time_range: {
          type: 'string',
          enum: ['last_hour', 'last_day', 'last_week'],
          description: 'Optional: filter by time range',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_recent_context',
    description:
      "Get the user's recent activity and context from the last N minutes. Shows what the user has been working on across all sources.",
    inputSchema: {
      type: 'object' as const,
      properties: {
        minutes: {
          type: 'number',
          description: 'How far back to look in minutes (default 30)',
        },
        source: {
          type: 'string',
          enum: ['screen', 'slack', 'notion', 'claude_code', 'cursor', 'mcp_log'],
          description: 'Optional: filter by source type',
        },
      },
    },
  },
  {
    name: 'get_source_context',
    description:
      'Search within a specific source (Slack, Notion, screen captures, AI agent sessions).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        source: {
          type: 'string',
          enum: ['screen', 'slack', 'notion', 'claude_code', 'cursor'],
          description: 'The source to search within',
        },
        query: {
          type: 'string',
          description: 'What to search for',
        },
        limit: {
          type: 'number',
          description: 'Max results (default 10)',
        },
      },
      required: ['source', 'query'],
    },
  },
  {
    name: 'save_memory',
    description:
      'Explicitly save an important piece of context to the unified memory. Use this when the user asks you to remember something.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        content: {
          type: 'string',
          description: 'The information to remember',
        },
        metadata: {
          type: 'object',
          description: 'Optional additional context tags',
        },
      },
      required: ['content'],
    },
  },
];

// Tool handlers
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case 'search_memory': {
      const query = args.query as string;
      const source = args.source as MemorySource | undefined;
      const limit = (args.limit as number) || 10;
      const timeRange = args.time_range as 'last_hour' | 'last_day' | 'last_week' | undefined;

      const results = await searchMemories(query, { source, limit, timeRange });

      if (results.length === 0) {
        return 'No relevant memories found for this query.';
      }

      const formatted = results.map((r, i) => {
        const time = new Date(r.captured_at).toLocaleString();
        const similarity = (r.similarity * 100).toFixed(1);
        const url = r.source_url ? `\n   URL: ${r.source_url}` : '';
        return `${i + 1}. [${r.source}] (${similarity}% match, ${time})${url}\n   ${r.content}`;
      });

      return `Found ${results.length} relevant memories:\n\n${formatted.join('\n\n')}`;
    }

    case 'get_recent_context': {
      const minutes = (args.minutes as number) || 30;
      const source = args.source as MemorySource | undefined;

      const memories = await getRecentMemories(minutes, source);

      if (memories.length === 0) {
        return `No activity found in the last ${minutes} minutes.`;
      }

      const formatted = memories.map((m) => {
        const time = new Date(m.captured_at).toLocaleString();
        return `[${m.source}] (${time})\n   ${m.content}`;
      });

      return `Recent activity (last ${minutes} minutes):\n\n${formatted.join('\n\n')}`;
    }

    case 'get_source_context': {
      const source = args.source as MemorySource;
      const query = args.query as string;
      const limit = (args.limit as number) || 10;

      const results = await searchMemories(query, { source, limit });

      if (results.length === 0) {
        return `No relevant ${source} memories found.`;
      }

      const formatted = results.map((r, i) => {
        const time = new Date(r.captured_at).toLocaleString();
        const similarity = (r.similarity * 100).toFixed(1);
        const url = r.source_url ? `\n   URL: ${r.source_url}` : '';
        return `${i + 1}. (${similarity}% match, ${time})${url}\n   ${r.content}`;
      });

      return `Found ${results.length} ${source} memories:\n\n${formatted.join('\n\n')}`;
    }

    case 'save_memory': {
      const content = args.content as string;
      const metadata = (args.metadata as Record<string, unknown>) || {};

      const memory = await saveMemory(content, metadata);

      if (!memory) {
        return 'Failed to save memory.';
      }

      return `Memory saved successfully (id: ${memory.id}).`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}
