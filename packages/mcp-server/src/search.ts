import { supabase } from '../../../packages/shared/src/supabase.js';
import { embedText } from '../../../packages/shared/src/embeddings.js';
import type { SearchResult, Memory, MemorySource } from '../../../packages/shared/src/types.js';

interface SearchOptions {
  source?: MemorySource;
  limit?: number;
  timeRange?: 'last_hour' | 'last_day' | 'last_week';
}

function getTimeFilter(timeRange?: string): Date | null {
  if (!timeRange) return null;
  const now = new Date();
  switch (timeRange) {
    case 'last_hour': return new Date(now.getTime() - 60 * 60 * 1000);
    case 'last_day': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'last_week': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    default: return null;
  }
}

export async function searchMemories(
  query: string,
  opts: SearchOptions = {}
): Promise<SearchResult[]> {
  const { source, limit = 10, timeRange } = opts;

  // Embed the query
  const queryEmbedding = await embedText(query);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  // Query via RPC
  const { data, error } = await supabase.rpc('search_memories', {
    query_embedding: embeddingStr,
    match_threshold: 0.1,
    match_count: limit,
    source_filter: source || null,
  });

  if (error) {
    console.error('Search error:', error.message);
    return [];
  }

  let results = (data || []) as SearchResult[];

  // Apply time filter if specified
  const timeFilterDate = getTimeFilter(timeRange);
  if (timeFilterDate) {
    results = results.filter(
      (r) => new Date(r.captured_at) >= timeFilterDate
    );
  }

  return results;
}

export async function getRecentMemories(
  minutes: number = 30,
  source?: MemorySource
): Promise<Memory[]> {
  const since = new Date(Date.now() - minutes * 60 * 1000);

  let query = supabase
    .from('memories')
    .select('id, source, content, metadata, source_url, captured_at, session_id, is_duplicate')
    .gte('captured_at', since.toISOString())
    .eq('is_duplicate', false)
    .order('captured_at', { ascending: false })
    .limit(20);

  if (source) {
    query = query.eq('source', source);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Recent memories error:', error.message);
    return [];
  }

  return (data || []) as Memory[];
}

export async function saveMemory(
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<Memory | null> {
  const embedding = await embedText(content);

  const { data, error } = await supabase
    .from('memories')
    .insert({
      source: 'mcp_log',
      content,
      embedding: JSON.stringify(embedding),
      metadata,
      session_id: `mcp-${new Date().toISOString().split('T')[0]}`,
    })
    .select('id, source, content, metadata, source_url, captured_at, session_id, is_duplicate')
    .single();

  if (error) {
    console.error('Save memory error:', error.message);
    return null;
  }

  return data as Memory;
}
