import { config } from './config.js';

const BASE_URL = 'https://api.moorcheh.ai/v1';

async function moorchehFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.moorcheh.apiKey,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[moorcheh] ${res.status} ${path}: ${text}`);
    return null;
  }
  return res.json();
}

// Single namespace to stay within free tier (5 namespace limit)
const NAMESPACE = 'recall-screen';

export async function initMoorchehNamespaces(): Promise<void> {
  // Try to create, will 409 if exists — that's fine
  await moorchehFetch('/namespaces', {
    method: 'POST',
    body: JSON.stringify({ namespace_name: NAMESPACE, type: 'text' }),
  });
  console.log('[moorcheh] Namespace ready');
}

export async function storeMoorcheh(
  content: string,
  source: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const namespace = NAMESPACE;
  const docId = `${source}-${Date.now()}`;

  await moorchehFetch(`/namespaces/${namespace}/documents`, {
    method: 'POST',
    body: JSON.stringify({
      documents: [
        {
          id: docId,
          text: content,
          metadata: {
            source,
            captured_at: new Date().toISOString(),
            ...metadata,
          },
        },
      ],
    }),
  });
}

export interface MoorchehSearchResult {
  id: string;
  text: string;
  score: number;
  metadata: Record<string, unknown>;
}

export async function searchMoorcheh(
  query: string,
  source?: string,
  limit: number = 10
): Promise<MoorchehSearchResult[]> {
  const namespaces = [NAMESPACE];

  const data = await moorchehFetch('/search', {
    method: 'POST',
    body: JSON.stringify({
      query,
      namespaces,
      top_k: limit,
      threshold: 0.2,
    }),
  });

  if (!data || !data.results) return [];
  return data.results;
}
