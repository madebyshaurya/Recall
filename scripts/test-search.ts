import { supabase } from '../packages/shared/src/supabase.js';
import { embedText } from '../packages/shared/src/embeddings.js';

async function main() {
  console.log('Testing semantic search...\n');

  const query = 'code editor TypeScript';
  console.log(`Query: "${query}"`);

  const embedding = await embedText(query);
  console.log(`Embedding generated: ${embedding.length} dims`);

  const embeddingStr = `[${embedding.join(',')}]`;

  // Test RPC
  console.log('\nTesting RPC search_memories...');
  const { data: rpcData, error: rpcError } = await supabase.rpc('search_memories', {
    query_embedding: embeddingStr,
    match_threshold: 0.1,
    match_count: 10,
    source_filter: null,
  });

  if (rpcError) {
    console.error('RPC Error:', rpcError);
  } else {
    console.log(`RPC Results: ${rpcData?.length || 0}`);
    for (const r of (rpcData || [])) {
      console.log(`  [${r.source}] sim=${r.similarity?.toFixed(3)} ${r.content?.substring(0, 80)}...`);
    }
  }

  // Test direct SQL via execute_sql pattern
  console.log('\nTesting direct cosine distance query...');
  const { data: directData, error: directError } = await supabase
    .from('memories')
    .select('id, source, content, captured_at')
    .eq('is_duplicate', false)
    .limit(5);

  if (directError) {
    console.error('Direct Error:', directError);
  } else {
    console.log(`Direct Results: ${directData?.length || 0}`);
    for (const r of (directData || [])) {
      console.log(`  [${r.source}] ${r.content?.substring(0, 80)}...`);
    }
  }
}

main().catch(console.error);
