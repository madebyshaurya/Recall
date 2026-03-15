-- Recall: Initial Schema
-- Run this in Supabase SQL Editor

-- Enable pgvector extension
create extension if not exists vector;

-- Core memories table
create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  content text not null,
  embedding vector(1536),
  metadata jsonb default '{}',
  source_url text,
  captured_at timestamptz default now(),
  session_id text,
  is_duplicate boolean default false
);

-- Indexes
create index if not exists idx_memories_embedding on memories using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists idx_memories_source on memories (source);
create index if not exists idx_memories_captured_at on memories (captured_at desc);
create index if not exists idx_memories_metadata on memories using gin (metadata);

-- Connected accounts
create table if not exists connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  access_token text,
  refresh_token text,
  workspace_name text,
  connected_at timestamptz default now(),
  status text default 'active'
);

-- User capture preferences
create table if not exists capture_settings (
  id uuid primary key default gen_random_uuid(),
  capture_interval_seconds int default 60,
  idle_timeout_seconds int default 120,
  enabled_sources jsonb default '["screen","slack","notion","ai_agents"]',
  excluded_apps jsonb default '[]',
  created_at timestamptz default now()
);

-- Semantic search function
create or replace function search_memories(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 10,
  source_filter text default null
)
returns table (
  id uuid,
  source text,
  content text,
  metadata jsonb,
  source_url text,
  captured_at timestamptz,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    m.id, m.source, m.content, m.metadata, m.source_url, m.captured_at,
    1 - (m.embedding <=> query_embedding) as similarity
  from memories m
  where
    m.is_duplicate = false
    and (source_filter is null or m.source = source_filter)
    and 1 - (m.embedding <=> query_embedding) > match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
end;
$$;
