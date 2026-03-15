import { supabase } from '../packages/shared/src/supabase.js';
import { createInterface } from 'readline';

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => {
    rl.question('⚠️  This will delete ALL memories. Are you sure? (y/N): ', resolve);
  });
  rl.close();

  if (answer.toLowerCase() !== 'y') {
    console.log('Cancelled.');
    return;
  }

  console.log('\nClearing all data...\n');

  const { count: memCount, error: memErr } = await supabase
    .from('memories')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select('*', { count: 'exact', head: true });

  if (memErr) {
    // delete doesn't return count easily, just do it
    await supabase.from('memories').delete().gte('captured_at', '1970-01-01');
  }

  console.log('✓ Memories cleared');

  await supabase.from('connections').delete().gte('connected_at', '1970-01-01');
  console.log('✓ Connections cleared');

  await supabase.from('capture_settings').delete().gte('created_at', '1970-01-01');
  console.log('✓ Settings cleared');

  console.log('\n🧹 All data cleared. Run `npm run seed:demo` to re-seed demo data.');
}

main().catch(console.error);
