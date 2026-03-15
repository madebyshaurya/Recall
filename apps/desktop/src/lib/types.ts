export type MemorySource = "screen" | "slack" | "notion" | "claude_code" | "cursor" | "mcp_log" | "docs";

export interface Memory {
  id: string;
  source: MemorySource;
  content: string;
  metadata: Record<string, unknown>;
  source_url?: string;
  captured_at: string;
  session_id?: string;
  is_duplicate: boolean;
}

export interface SearchResult extends Memory {
  similarity: number;
}

export const SOURCE_CONFIG: Record<
  MemorySource,
  { label: string; color: string; icon: string }
> = {
  screen: { label: "Screen", color: "bg-blue-500", icon: "Monitor" },
  slack: { label: "Slack", color: "bg-purple-500", icon: "Hash" },
  notion: { label: "Notion", color: "bg-emerald-500", icon: "FileText" },
  claude_code: { label: "Claude Code", color: "bg-orange-500", icon: "Bot" },
  cursor: { label: "Cursor", color: "bg-yellow-500", icon: "MousePointer" },
  mcp_log: { label: "MCP Log", color: "bg-gray-500", icon: "Terminal" },
  docs: { label: "Docs", color: "bg-teal-500", icon: "BookOpen" },
};
