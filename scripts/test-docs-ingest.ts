import '../packages/shared/src/config.js';
import { detectSourceType, chunkMarkdown } from '../packages/mcp-server/src/docs-ingest.js';
import { resolveDocsForDependencies } from '../packages/mcp-server/src/docs-registry.js';
import { ingestDocUrls, ingestFromDependencies } from '../packages/mcp-server/src/docs-ingest.js';

async function testUnit() {
  console.log('=== Unit Tests (no API calls) ===\n');

  // Test source type detection
  console.log('--- detectSourceType ---');
  console.log('nextjs.org/docs →', detectSourceType('https://nextjs.org/docs'));
  console.log('paper.pdf →', detectSourceType('https://arxiv.org/pdf/1234.pdf'));
  console.log('github.com/... →', detectSourceType('https://github.com/user/repo/blob/main/README.md'));
  console.log('raw.githubusercontent →', detectSourceType('https://raw.githubusercontent.com/user/repo/main/README.md'));

  // Test registry lookup
  console.log('\n--- resolveDocsForDependencies ---');
  const deps = ['next', 'react', 'tailwindcss', 'some-unknown-pkg', '@supabase/supabase-js', 'express'];
  const resolved = resolveDocsForDependencies(deps);
  console.log(`Input: ${deps.join(', ')}`);
  console.log(`Resolved ${resolved.length} packages:`);
  for (const r of resolved) {
    console.log(`  ${r.pkg} → ${r.name} (${r.urls.length} URL(s))`);
  }

  // Test markdown chunking
  console.log('\n--- chunkMarkdown ---');
  const testMarkdown = `# Getting Started

This is the introduction paragraph with some content.

## Installation

Run the following command to install:

\`\`\`bash
npm install next
\`\`\`

Then create your first page.

## Routing

Next.js uses file-system based routing. Each file in the pages directory becomes a route.

### Dynamic Routes

You can create dynamic routes by adding brackets to a page name, like [id].tsx.

### Nested Routes

Nested folders create nested URL paths automatically.

## API Routes

API routes provide a solution to build your API with Next.js. Any file inside pages/api is treated as an API endpoint.

## Configuration

Next.js can be configured through a next.config.js file in the root of your project directory.`;

  const chunks = chunkMarkdown(testMarkdown, 200);
  console.log(`Produced ${chunks.length} chunks:`);
  for (const chunk of chunks) {
    const tokens = Math.round(chunk.content.length / 4);
    console.log(`  [${chunk.index}] "${chunk.section}" (~${tokens} tokens, ${chunk.content.length} chars)`);
  }
}

async function testLive() {
  console.log('\n=== Live Test (API calls) ===\n');

  // Test ingesting a small GitHub README
  console.log('--- Ingest a GitHub README ---');
  const result = await ingestDocUrls(
    ['https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/README.md'],
    { topic: 'MCP SDK' }
  );
  console.log(`Result: ${result.ingested} page(s), ${result.chunks} chunks`);
  if (result.errors.length > 0) {
    console.log('Errors:', result.errors);
  }

  // Test dependency-based ingestion (should skip the already-ingested MCP SDK)
  console.log('\n--- Ingest from dependencies ---');
  const depsResult = await ingestFromDependencies(
    ['@modelcontextprotocol/sdk', 'vitest', 'unknown-pkg-xyz'],
  );
  console.log(`Resolved: ${depsResult.resolved.join(', ')}`);
  console.log(`Ingested: ${depsResult.ingested}, Skipped: ${depsResult.skipped}, Chunks: ${depsResult.chunks}`);
  if (depsResult.errors.length > 0) {
    console.log('Errors:', depsResult.errors);
  }
}

async function main() {
  const liveMode = process.argv.includes('--live');

  await testUnit();

  if (liveMode) {
    await testLive();
  } else {
    console.log('\n(Run with --live to test actual fetching + embedding + Supabase storage)');
  }
}

main().catch(console.error);
