import { supabase } from '../../../packages/shared/src/supabase.js';
import { embedText } from '../../../packages/shared/src/embeddings.js';
import { execFileSync } from 'child_process';

const suggestedIds = new Set<string>();

interface Suggestion {
  source: string;
  content: string;
  similarity: number;
  source_url?: string;
}

export async function checkForSuggestions(): Promise<void> {
  try {
    // Get last 3 screen captures as "current context"
    const { data: recentScreens } = await supabase
      .from('memories')
      .select('content')
      .eq('source', 'screen')
      .eq('is_duplicate', false)
      .order('captured_at', { ascending: false })
      .limit(3);

    if (!recentScreens || recentScreens.length === 0) return;

    // Combine into a context query
    const contextQuery = recentScreens.map((s) => s.content).join(' ');
    const truncated = contextQuery.substring(0, 500);

    // Embed and search for cross-source matches
    const embedding = await embedText(truncated);
    const embeddingStr = `[${embedding.join(',')}]`;

    const { data: matches } = await supabase.rpc('search_memories', {
      query_embedding: embeddingStr,
      match_threshold: 0.4,
      match_count: 5,
      source_filter: null,
    });

    if (!matches) return;

    // Find matches from DIFFERENT sources (not screen)
    const crossSourceMatches = (matches as Suggestion[]).filter(
      (m: { source: string; similarity: number; id?: string }) =>
        m.source !== 'screen' &&
        m.similarity > 0.4 &&
        !suggestedIds.has((m as { id?: string }).id || '')
    );

    if (crossSourceMatches.length === 0) return;

    const best = crossSourceMatches[0];
    const matchId = (best as unknown as { id: string }).id;
    suggestedIds.add(matchId);

    // Send macOS notification
    const sourceLabel =
      best.source === 'slack' ? 'Slack thread' :
      best.source === 'notion' ? 'Notion page' :
      best.source === 'claude_code' ? 'Claude Code session' :
      best.source === 'mcp_log' ? 'saved memory' :
      best.source;

    const title = 'Recall';
    const message = `Related ${sourceLabel} found: "${best.content.substring(0, 100)}..."`;

    try {
      execFileSync('osascript', [
        '-e',
        `display notification "${message.replace(/"/g, '\\"')}" with title "${title}"`,
      ]);
      console.log(`[suggest] 🔔 Notification sent: ${sourceLabel} (${(best.similarity * 100).toFixed(0)}% match)`);
    } catch {
      console.log(`[suggest] Would notify: ${message}`);
    }
  } catch (err) {
    console.error('[suggest] Error:', err instanceof Error ? err.message : err);
  }
}

export function startSuggestionLoop(intervalMs = 300000) {
  console.log(`[suggest] Proactive suggestions every ${intervalMs / 1000}s`);
  setInterval(() => {
    checkForSuggestions().catch(() => {});
  }, intervalMs);
}
