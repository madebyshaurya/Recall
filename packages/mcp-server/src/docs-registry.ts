// Curated mapping of package names to their key documentation URLs.
// Each entry has 1-3 URLs for the most important doc pages (not full site crawls).

interface DocEntry {
  name: string;
  urls: string[];
}

export const DOCS_REGISTRY: Record<string, DocEntry> = {
  // --- JavaScript / TypeScript frameworks ---
  'next': { name: 'Next.js', urls: [
    'https://nextjs.org/docs/getting-started/installation',
    'https://nextjs.org/docs/app/building-your-application/routing',
  ]},
  'react': { name: 'React', urls: [
    'https://react.dev/reference/react',
  ]},
  'vue': { name: 'Vue.js', urls: [
    'https://vuejs.org/guide/introduction.html',
  ]},
  'svelte': { name: 'Svelte', urls: [
    'https://svelte.dev/docs/introduction',
  ]},
  'angular': { name: 'Angular', urls: [
    'https://angular.dev/overview',
  ]},
  '@angular/core': { name: 'Angular', urls: [
    'https://angular.dev/overview',
  ]},

  // --- Node.js / Backend ---
  'express': { name: 'Express', urls: [
    'https://expressjs.com/en/api.html',
  ]},
  'fastify': { name: 'Fastify', urls: [
    'https://fastify.dev/docs/latest/Reference/Server/',
  ]},
  'hono': { name: 'Hono', urls: [
    'https://hono.dev/docs/',
  ]},

  // --- CSS / UI ---
  'tailwindcss': { name: 'Tailwind CSS', urls: [
    'https://tailwindcss.com/docs/installation',
  ]},
  'shadcn-ui': { name: 'shadcn/ui', urls: [
    'https://ui.shadcn.com/docs',
  ]},

  // --- Databases / ORMs ---
  'prisma': { name: 'Prisma', urls: [
    'https://www.prisma.io/docs/orm',
  ]},
  'drizzle-orm': { name: 'Drizzle ORM', urls: [
    'https://orm.drizzle.team/docs/overview',
  ]},
  '@supabase/supabase-js': { name: 'Supabase', urls: [
    'https://supabase.com/docs/reference/javascript/introduction',
  ]},

  // --- AI / ML ---
  'openai': { name: 'OpenAI', urls: [
    'https://platform.openai.com/docs/api-reference',
  ]},
  '@anthropic-ai/sdk': { name: 'Anthropic SDK', urls: [
    'https://docs.anthropic.com/en/api/getting-started',
  ]},
  'langchain': { name: 'LangChain', urls: [
    'https://js.langchain.com/docs/introduction/',
  ]},

  // --- Testing ---
  'vitest': { name: 'Vitest', urls: [
    'https://vitest.dev/guide/',
  ]},
  'jest': { name: 'Jest', urls: [
    'https://jestjs.io/docs/getting-started',
  ]},
  'playwright': { name: 'Playwright', urls: [
    'https://playwright.dev/docs/intro',
  ]},

  // --- Build tools ---
  'vite': { name: 'Vite', urls: [
    'https://vite.dev/guide/',
  ]},
  'esbuild': { name: 'esbuild', urls: [
    'https://esbuild.github.io/api/',
  ]},

  // --- Python ---
  'fastapi': { name: 'FastAPI', urls: [
    'https://fastapi.tiangolo.com/',
  ]},
  'django': { name: 'Django', urls: [
    'https://docs.djangoproject.com/en/stable/intro/overview/',
  ]},
  'flask': { name: 'Flask', urls: [
    'https://flask.palletsprojects.com/en/stable/quickstart/',
  ]},
  'pandas': { name: 'Pandas', urls: [
    'https://pandas.pydata.org/docs/getting_started/intro_tutorials/',
  ]},
  'numpy': { name: 'NumPy', urls: [
    'https://numpy.org/doc/stable/user/absolute_beginners.html',
  ]},
  'pytorch': { name: 'PyTorch', urls: [
    'https://pytorch.org/docs/stable/index.html',
  ]},
  'torch': { name: 'PyTorch', urls: [
    'https://pytorch.org/docs/stable/index.html',
  ]},

  // --- Rust ---
  'tokio': { name: 'Tokio', urls: [
    'https://tokio.rs/tokio/tutorial',
  ]},
  'axum': { name: 'Axum', urls: [
    'https://docs.rs/axum/latest/axum/',
  ]},

  // --- Go ---
  'gin': { name: 'Gin', urls: [
    'https://gin-gonic.com/docs/',
  ]},

  // --- MCP ---
  '@modelcontextprotocol/sdk': { name: 'MCP SDK', urls: [
    'https://modelcontextprotocol.io/introduction',
  ]},
};

// Look up dependencies and return the doc URLs to ingest
export function resolveDocsForDependencies(
  dependencies: string[]
): { name: string; urls: string[]; pkg: string }[] {
  const results: { name: string; urls: string[]; pkg: string }[] = [];
  const seen = new Set<string>();

  for (const dep of dependencies) {
    const entry = DOCS_REGISTRY[dep];
    if (entry && !seen.has(entry.name)) {
      seen.add(entry.name);
      results.push({ ...entry, pkg: dep });
    }
  }

  return results;
}
