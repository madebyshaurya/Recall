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

  const { error: e1 } = await supabase.from('memories').delete().neq('source', '___never___');
  console.log(e1 ? `✗ Memories: ${e1.message}` : '✓ Memories cleared');

  const { error: e2 } = await supabase.from('connections').delete().neq('provider', '___never___');
  console.log(e2 ? `✗ Connections: ${e2.message}` : '✓ Connections cleared');

  const { error: e3 } = await supabase.from('capture_settings').delete().neq('capture_interval_seconds', -999);
  console.log(e3 ? `✗ Settings: ${e3.message}` : '✓ Settings cleared');

  console.log('\n🧹 All data cleared. Run `npm run seed:demo` to re-seed.');
}

main().catch(console.error);
