"use client";

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
    <div className="flex gap-1">
      {FILTERS.map((source) => {
        const isActive = active === source;
        const config = source === "all" ? null : SOURCE_CONFIG[source];
        return (
          <button
            key={source}
            onClick={() => onChange(source)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 ${
              isActive
                ? "bg-white text-neutral-900"
                : "text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.05]"
            }`}
          >
            {config && (
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  isActive ? "bg-neutral-900" : config.color
                }`}
              />
            )}
            {config ? config.label : "All"}
          </button>
        );
      })}
    </div>
  );
}
