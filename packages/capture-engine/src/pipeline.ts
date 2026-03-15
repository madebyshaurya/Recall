import { describeScreenshot } from '../../../packages/shared/src/vision.js';
import { embedText } from '../../../packages/shared/src/embeddings.js';
import { supabase } from '../../../packages/shared/src/supabase.js';
import { isDuplicate } from './dedup.js';
import type { Memory, MemorySource } from '../../../packages/shared/src/types.js';

interface CaptureInput {
  imageBase64?: string;
  text?: string;
  source: MemorySource;
  metadata: Record<string, unknown>;
  sourceUrl?: string;
}

export async function processCapture(input: CaptureInput): Promise<Memory | null> {
  try {
    // Step 1: Get text content
    let content: string;
    if (input.text) {
      content = input.text;
    } else if (input.imageBase64) {
      content = await describeScreenshot(input.imageBase64);
    } else {
      console.log('  [skip] No content to process');
      return null;
    }

    if (!content || content.length < 10) {
      console.log('  [skip] Content too short');
      return null;
    }

    // Step 2: Generate embedding
    const embedding = await embedText(content);

    // Step 3: Check deduplication (only for screen captures)
    if (input.source === 'screen' && isDuplicate(embedding)) {
      console.log('  [dedup] Skipping duplicate capture');
      return null;
    }

    // Step 4: Write to Supabase
    const { data, error } = await supabase
      .from('memories')
      .insert({
        source: input.source,
        content,
        embedding: JSON.stringify(embedding),
        metadata: input.metadata,
        source_url: input.sourceUrl || null,
        session_id: `session-${new Date().toISOString().split('T')[0]}`,
      })
      .select('id, source, content, metadata, source_url, captured_at, session_id, is_duplicate')
      .single();

    if (error) {
      console.error('  [error] Supabase insert failed:', error.message);
      return null;
    }

    return data as Memory;
  } catch (err) {
    console.error('  [error] Pipeline failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
