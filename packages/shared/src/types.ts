export type MemorySource = 'screen' | 'slack' | 'notion' | 'claude_code' | 'cursor' | 'mcp_log' | 'docs';

export interface Memory {
  id: string;
  source: MemorySource;
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  source_url?: string;
  captured_at: string;
  session_id?: string;
  is_duplicate: boolean;
}

export interface Connection {
  id: string;
  provider: string;
  access_token?: string;
  refresh_token?: string;
  workspace_name?: string;
  connected_at: string;
  status: 'active' | 'disconnected' | 'error';
}

export interface CaptureSettings {
  id: string;
  capture_interval_seconds: number;
  idle_timeout_seconds: number;
  enabled_sources: string[];
  excluded_apps: string[];
  created_at: string;
}

export interface SearchResult {
  id: string;
  source: MemorySource;
  content: string;
  metadata: Record<string, unknown>;
  source_url?: string;
  captured_at: string;
  similarity: number;
}
