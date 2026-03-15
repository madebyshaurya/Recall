import { embedText } from '../packages/shared/src/embeddings.js';
import { describeScreenshot } from '../packages/shared/src/vision.js';
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';

async function main() {
  // Test 1: Embedding
  console.log('Test 1: Embedding text...');
  const embedding = await embedText('debugging auth token refresh in React app');
  console.log(`✓ Embedding generated: ${embedding.length} dimensions`);
  console.log(`  First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);

  // Test 2: Vision (screenshot)
  console.log('\nTest 2: Describing screenshot...');
  const screenshotPath = '/tmp/recall-test-screenshot.png';
  execFileSync('screencapture', ['-x', screenshotPath]);
  const imageBase64 = readFileSync(screenshotPath).toString('base64');
  console.log(`  Screenshot captured (${(imageBase64.length / 1024).toFixed(0)} KB base64)`);

  const description = await describeScreenshot(imageBase64);
  console.log(`✓ Description: ${description}`);

  console.log('\nAll OpenAI tests passed!');
}

main().catch(console.error);
