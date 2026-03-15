"use client";

import { SOURCE_CONFIG, type MemorySource } from "@/lib/types";

// "ai_agents" is a virtual filter that matches claude_code, cursor, and mcp_log
export type FilterValue = MemorySource | "all" | "ai_agents";

const FILTERS: { value: FilterValue; label: string; color?: string }[] = [
  { value: "all", label: "All" },
  { value: "screen", label: "Screen", color: "bg-blue-500" },
  { value: "slack", label: "Slack", color: "bg-purple-500" },
  { value: "notion", label: "Notion", color: "bg-emerald-500" },
  { value: "ai_agents", label: "AI Agents", color: "bg-orange-500" },
];

// Maps filter value to actual source values for querying
export function getSourcesForFilter(filter: FilterValue): MemorySource[] | null {
  switch (filter) {
    case "all":
      return null;
    case "ai_agents":
      return ["claude_code", "cursor", "mcp_log"];
    default:
      return [filter];
  }
}

export function SourceFilter({
  active,
  onChange,
}: {
  active: FilterValue;
  onChange: (source: FilterValue) => void;
}) {
  return (
    <div className="flex gap-1">
      {FILTERS.map(({ value, label, color }) => {
        const isActive = active === value;
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 ${
              isActive
                ? "bg-white text-neutral-900"
                : "text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.05]"
            }`}
          >
            {color && (
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  isActive ? "bg-neutral-900" : color
                }`}
              />
            )}
            {label}
          </button>
        );
      })}
    </div>
  );
}
