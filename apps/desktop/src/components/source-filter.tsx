"use client";

import { Badge } from "@/components/ui/badge";
import { SOURCE_CONFIG, type MemorySource } from "@/lib/types";

const FILTERS: (MemorySource | "all")[] = [
  "all",
  "screen",
  "slack",
  "notion",
  "claude_code",
  "cursor",
];

export function SourceFilter({
  active,
  onChange,
}: {
  active: MemorySource | "all";
  onChange: (source: MemorySource | "all") => void;
}) {
  return (
    <div className="flex gap-1.5">
      {FILTERS.map((source) => {
        const isActive = active === source;
        const config = source === "all" ? null : SOURCE_CONFIG[source];
        return (
          <button
            key={source}
            onClick={() => onChange(source)}
            className="focus:outline-none"
          >
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={`cursor-pointer text-[11px] px-2.5 py-0.5 transition-colors ${
                isActive
                  ? "bg-white text-neutral-900 hover:bg-neutral-200"
                  : "bg-neutral-900 text-neutral-500 border-neutral-800 hover:text-neutral-300 hover:bg-neutral-800"
              }`}
            >
              {config ? (
                <span className="flex items-center gap-1.5">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${config.color}`}
                  />
                  {config.label}
                </span>
              ) : (
                "All"
              )}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
