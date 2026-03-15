import { z } from 'zod';
import { searchMemories, getRecentMemories, saveMemory } from './search.js';
import { ingestDocUrls, ingestFromDependencies } from './docs-ingest.js';
import type { MemorySource } from '../../../packages/shared/src/types.js';

const SOURCE_ENUM = ['screen', 'slack', 'notion', 'claude_code', 'cursor', 'mcp_log', 'docs'];

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
          enum: SOURCE_ENUM,
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
          enum: SOURCE_ENUM,
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
          enum: SOURCE_ENUM,
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
  {
    name: 'sync_source',
    description:
      'Trigger a sync/refresh of a connected data source (Slack or Notion) to fetch the latest data into the unified memory. Use this when the user wants fresh data from their integrations.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        source: {
          type: 'string',
          enum: ['slack', 'notion'],
          description: 'The source to sync',
        },
      },
      required: ['source'],
    },
  },
  {
    name: 'ingest_docs',
    description:
      'Fetch, parse, chunk, and store documentation into memory. Supports web pages, PDFs, and GitHub markdown files. Use the `dependencies` param to auto-ingest docs for project dependencies (e.g. pass package names from package.json). Already-ingested docs are skipped automatically.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'URLs to ingest (web pages, PDFs, or GitHub markdown files)',
        },
        dependencies: {
          type: 'array',
          items: { type: 'string' },
          description: 'Package names to look up in the docs registry (e.g. ["next", "react", "tailwindcss"]). Docs for recognized packages are auto-fetched.',
        },
        source_type: {
          type: 'string',
          enum: ['web', 'pdf', 'github'],
          description: 'Optional: type of source. Auto-detected from URL if omitted.',
        },
        topic: {
          type: 'string',
          description: 'Optional: topic label for filtering (e.g. "Next.js", "React")',
        },
        chunk_size: {
          type: 'number',
          description: 'Target tokens per chunk (default 500)',
        },
      },
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

    case 'sync_source': {
      const source = args.source as string;
      try {
        // Call the Next.js sync API
        const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
        const res = await fetch(`${dashboardUrl}/api/sync/${source}`, {
          method: 'POST',
        });
        const data = await res.json();
        if (data.error) {
          return `Sync failed: ${data.error}`;
        }
        return `Successfully synced ${data.count || 0} items from ${source}.`;
      } catch (err) {
        return `Sync failed: ${err instanceof Error ? err.message : 'connection error'}. Make sure the dashboard is running (npm run dev:dashboard).`;
      }
    }

    case 'ingest_docs': {
      const urls = args.urls as string[] | undefined;
      const dependencies = args.dependencies as string[] | undefined;
      const sourceType = args.source_type as 'web' | 'pdf' | 'github' | undefined;
      const topic = args.topic as string | undefined;
      const chunkSize = args.chunk_size as number | undefined;

      if (!urls && !dependencies) {
        return 'Please provide either `urls` or `dependencies` to ingest.';
      }

      const parts: string[] = [];

      // Handle dependency-based ingestion
      if (dependencies && dependencies.length > 0) {
        const depsResult = await ingestFromDependencies(dependencies, { sourceType, topic, chunkSize });
        if (depsResult.resolved.length > 0) {
          parts.push(`Dependencies: found docs for ${depsResult.resolved.join(', ')}.`);
        }
        if (depsResult.ingested > 0) {
          parts.push(`Ingested ${depsResult.ingested} page(s) into ${depsResult.chunks} chunks.`);
        }
        if (depsResult.skipped > 0) {
          parts.push(`Skipped ${depsResult.skipped} already-ingested URL(s).`);
        }
        if (depsResult.errors.length > 0) {
          parts.push(`Errors:\n${depsResult.errors.join('\n')}`);
        }
        const unrecognized = dependencies.filter(
          (d) => !depsResult.resolved.some((r) => r.toLowerCase().includes(d.toLowerCase()) || d.includes(r.toLowerCase()))
        );
        if (unrecognized.length > 0 && depsResult.resolved.length < dependencies.length) {
          parts.push(`No docs registered for: ${unrecognized.join(', ')}`);
        }
      }

      // Handle direct URL ingestion
      if (urls && urls.length > 0) {
        const urlResult = await ingestDocUrls(urls, { sourceType, topic, chunkSize });
        parts.push(`URLs: ingested ${urlResult.ingested} page(s) into ${urlResult.chunks} chunks.`);
        if (urlResult.errors.length > 0) {
          parts.push(`Errors:\n${urlResult.errors.join('\n')}`);
        }
      }

      return parts.join('\n');
    }

    default:
      return `Unknown tool: ${name}`;
  }
}
