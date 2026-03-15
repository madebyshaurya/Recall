import { supabase } from '../packages/shared/src/supabase.js';

async function main() {
  console.log('Testing Supabase connection...\n');

  // Create a dummy 1536-dim vector
  const dummyEmbedding = new Array(1536).fill(0).map(() => Math.random() * 2 - 1);

  // Insert test memory
  const { data: inserted, error: insertError } = await supabase
    .from('memories')
    .insert({
      source: 'screen',
      content: 'Test memory: user was browsing GitHub looking at Recall repository',
      embedding: JSON.stringify(dummyEmbedding),
      metadata: { window_title: 'GitHub - Recall', app_name: 'Chrome' },
      session_id: 'test-session',
    })
    .select()
    .single();

  if (insertError) {
    console.error('INSERT FAILED:', insertError.message);
    process.exit(1);
  }
  console.log('✓ Insert successful:', inserted.id);
  console.log('  Source:', inserted.source);
  console.log('  Content:', inserted.content);
  console.log('  Metadata:', inserted.metadata);

  // Read it back
  const { data: fetched, error: fetchError } = await supabase
    .from('memories')
    .select('id, source, content, metadata, captured_at')
    .eq('id', inserted.id)
    .single();

  if (fetchError) {
    console.error('FETCH FAILED:', fetchError.message);
    process.exit(1);
  }
  console.log('\n✓ Fetch successful:', fetched.id);

  // Clean up
  const { error: deleteError } = await supabase
    .from('memories')
    .delete()
    .eq('id', inserted.id);

  if (deleteError) {
    console.error('DELETE FAILED:', deleteError.message);
    process.exit(1);
  }
  console.log('✓ Cleanup successful\n');

  console.log('All Supabase tests passed!');
}

main().catch(console.error);
