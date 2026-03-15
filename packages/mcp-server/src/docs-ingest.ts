import Firecrawl from '@mendable/firecrawl-js';
import { PDFParse } from 'pdf-parse';
import TurndownService from 'turndown';
import { config } from '../../../packages/shared/src/config.js';
import { embedTexts } from '../../../packages/shared/src/embeddings.js';
import { supabase } from '../../../packages/shared/src/supabase.js';
import { resolveDocsForDependencies } from './docs-registry.js';

// --- Types ---

interface DocChunk {
  content: string;
  section: string;
  index: number;
}

interface FetchResult {
  markdown: string;
  title: string;
}

interface IngestOptions {
  sourceType?: 'web' | 'pdf' | 'github';
  topic?: string;
  chunkSize?: number;
}

interface IngestResult {
  ingested: number;
  chunks: number;
  errors: string[];
}

// --- Source type detection ---

export function detectSourceType(url: string): 'web' | 'pdf' | 'github' {
  if (url.endsWith('.pdf') || url.includes('.pdf?')) {
    return 'pdf';
  }
  if (url.includes('github.com') || url.includes('raw.githubusercontent.com')) {
    return 'github';
  }
  return 'web';
}

// --- Fetchers ---

async function fetchWeb(url: string): Promise<FetchResult> {
  if (config.firecrawl.apiKey) {
    const firecrawl = new Firecrawl({ apiKey: config.firecrawl.apiKey });
    const result = await firecrawl.scrape(url, { formats: ['markdown'] });
    return {
      markdown: result.markdown || '',
      title: result.metadata?.title || url,
    };
  }

  // Fallback: fetch HTML + convert with Turndown
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  }
  const html = await response.text();
  const turndown = new TurndownService();
  const markdown = turndown.turndown(html);

  // Extract title from HTML
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : url;

  return { markdown, title };
}

async function fetchPdf(url: string): Promise<FetchResult> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`PDF fetch failed: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) });
  const result = await parser.getText();
  await parser.destroy();
  return {
    markdown: result.text,
    title: url.split('/').pop()?.replace('.pdf', '') || url,
  };
}

async function fetchGithub(url: string): Promise<FetchResult> {
  // Convert github.com URLs to raw.githubusercontent.com
  let rawUrl = url;
  if (url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
    rawUrl = url
      .replace('github.com', 'raw.githubusercontent.com')
      .replace('/blob/', '/');
  }

  const headers: Record<string, string> = {};
  if (config.github.token) {
    headers['Authorization'] = `token ${config.github.token}`;
  }

  const response = await fetch(rawUrl, { headers });
  if (!response.ok) {
    throw new Error(`GitHub fetch failed: ${response.status} ${response.statusText}`);
  }
  const markdown = await response.text();

  // Title from filename
  const filename = rawUrl.split('/').pop() || url;
  const title = filename.replace(/\.md$/i, '');

  return { markdown, title };
}

// --- Chunking ---

export function chunkMarkdown(markdown: string, maxTokens: number = 500): DocChunk[] {
  const chunks: DocChunk[] = [];
  const minChunkTokens = 50;

  // Split on ## and ### headings
  const sections = markdown.split(/(?=^#{2,3}\s)/m);
  let chunkIndex = 0;

  for (const section of sections) {
    const lines = section.trim();
    if (!lines) continue;

    // Extract section heading
    const headingMatch = lines.match(/^(#{2,3}\s.+)/);
    const sectionHeading = headingMatch ? headingMatch[1].replace(/^#+\s*/, '') : 'Introduction';

    const estimatedTokens = lines.length / 4;

    if (estimatedTokens <= maxTokens) {
      // Section fits in one chunk
      if (estimatedTokens >= minChunkTokens) {
        chunks.push({ content: lines, section: sectionHeading, index: chunkIndex++ });
      }
    } else {
      // Sub-split on paragraph boundaries
      const paragraphs = lines.split(/\n\n+/);
      let current = '';

      for (const para of paragraphs) {
        const combinedTokens = (current.length + para.length + 2) / 4;
        if (current && combinedTokens > maxTokens) {
          if (current.length / 4 >= minChunkTokens) {
            chunks.push({ content: current.trim(), section: sectionHeading, index: chunkIndex++ });
          }
          current = para;
        } else {
          current = current ? `${current}\n\n${para}` : para;
        }
      }

      // Flush remaining
      if (current.trim() && current.length / 4 >= minChunkTokens) {
        chunks.push({ content: current.trim(), section: sectionHeading, index: chunkIndex++ });
      }
    }
  }

  return chunks;
}

// --- Dedup (delete-and-reinsert) ---

async function deleteExistingChunks(sourceUrl: string): Promise<number> {
  const { data, error } = await supabase
    .from('memories')
    .delete()
    .eq('source', 'docs')
    .eq('source_url', sourceUrl)
    .select('id');

  if (error) {
    console.error('Error deleting existing chunks:', error.message);
    return 0;
  }
  return data?.length || 0;
}

// --- Check if docs already ingested for a URL ---

async function isAlreadyIngested(sourceUrl: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('memories')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'docs')
    .eq('source_url', sourceUrl);

  if (error) return false;
  return (count || 0) > 0;
}

// --- Main orchestrator ---

export async function ingestDocUrls(
  urls: string[],
  options: IngestOptions = {}
): Promise<IngestResult> {
  const { topic, chunkSize = 500 } = options;
  const result: IngestResult = { ingested: 0, chunks: 0, errors: [] };

  for (const url of urls) {
    try {
      const sourceType = options.sourceType || detectSourceType(url);
      console.log(`[docs] Fetching ${sourceType}: ${url}`);

      // Fetch content
      let fetched: FetchResult;
      switch (sourceType) {
        case 'pdf':
          fetched = await fetchPdf(url);
          break;
        case 'github':
          fetched = await fetchGithub(url);
          break;
        default:
          fetched = await fetchWeb(url);
          break;
      }

      if (!fetched.markdown || fetched.markdown.length < 40) {
        result.errors.push(`${url}: content too short or empty`);
        continue;
      }

      // Chunk
      const chunks = chunkMarkdown(fetched.markdown, chunkSize);
      if (chunks.length === 0) {
        result.errors.push(`${url}: no chunks produced`);
        continue;
      }

      console.log(`[docs] ${fetched.title}: ${chunks.length} chunks`);

      // Delete old chunks for this URL
      const deleted = await deleteExistingChunks(url);
      if (deleted > 0) {
        console.log(`[docs] Replaced ${deleted} existing chunks for ${url}`);
      }

      // Batch embed
      const texts = chunks.map((c) => c.content);
      const embeddings = await embedTexts(texts);

      // Batch insert
      const rows = chunks.map((chunk, i) => ({
        source: 'docs',
        content: chunk.content,
        embedding: JSON.stringify(embeddings[i]),
        metadata: {
          title: fetched.title,
          section_heading: chunk.section,
          topic: topic || null,
          chunk_index: chunk.index,
          source_type: sourceType,
        },
        source_url: url,
        session_id: `docs-${new Date().toISOString().split('T')[0]}`,
      }));

      const { error } = await supabase.from('memories').insert(rows);
      if (error) {
        result.errors.push(`${url}: Supabase insert failed: ${error.message}`);
        continue;
      }

      result.ingested++;
      result.chunks += chunks.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`${url}: ${msg}`);
    }
  }

  return result;
}

// --- Dependency-based ingestion ---

interface DepsIngestResult extends IngestResult {
  skipped: number;
  resolved: string[];
}

export async function ingestFromDependencies(
  dependencies: string[],
  options: IngestOptions = {}
): Promise<DepsIngestResult> {
  const resolved = resolveDocsForDependencies(dependencies);
  const result: DepsIngestResult = {
    ingested: 0,
    chunks: 0,
    errors: [],
    skipped: 0,
    resolved: resolved.map((r) => r.name),
  };

  if (resolved.length === 0) {
    return result;
  }

  for (const entry of resolved) {
    // Check which URLs are already ingested
    const urlsToIngest: string[] = [];
    for (const url of entry.urls) {
      if (await isAlreadyIngested(url)) {
        result.skipped++;
        console.log(`[docs] Already ingested: ${entry.name} (${url})`);
      } else {
        urlsToIngest.push(url);
      }
    }

    if (urlsToIngest.length === 0) continue;

    // Ingest the new URLs
    const subResult = await ingestDocUrls(urlsToIngest, {
      ...options,
      topic: options.topic || entry.name,
    });

    result.ingested += subResult.ingested;
    result.chunks += subResult.chunks;
    result.errors.push(...subResult.errors);
  }

  return result;
}
