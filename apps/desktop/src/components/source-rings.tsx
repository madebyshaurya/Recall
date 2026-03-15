"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const SOURCES = [
  { id: "screen", label: "Screen", color: "#3b82f6" },
  { id: "slack", label: "Slack", color: "#a855f7" },
  { id: "notion", label: "Notion", color: "#10b981" },
  { id: "claude_code", label: "Claude", color: "#f97316" },
  { id: "mcp_log", label: "MCP", color: "#6b7280" },
];

export function SourceRings() {
  const { data: counts = {} } = useQuery({
    queryKey: ["source-rings"],
    queryFn: async () => {
      const result: Record<string, number> = {};
      for (const s of SOURCES) {
        const { count } = await supabase
          .from("memories")
          .select("*", { count: "exact", head: true })
          .eq("source", s.id)
          .eq("is_duplicate", false);
        result[s.id] = count || 0;
      }
      return result;
    },
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="flex items-center gap-6">
      {/* Concentric rings */}
      <div className="relative w-[120px] h-[120px]">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          {SOURCES.map((source, i) => {
            const radius = 52 - i * 10;
            const circumference = 2 * Math.PI * radius;
            const pct = (counts[source.id] || 0) / total;
            const dashLength = circumference * Math.min(pct * SOURCES.length, 1);

            return (
              <g key={source.id}>
                {/* Background ring */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth="6"
                />
                {/* Filled ring */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={source.color}
                  strokeWidth="6"
                  strokeDasharray={`${dashLength} ${circumference}`}
                  strokeLinecap="round"
                  opacity={0.8}
                  className="transition-all duration-1000"
                />
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold font-mono">{total}</span>
          <span className="text-[8px] text-neutral-600 uppercase tracking-widest">Total</span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-1.5">
        {SOURCES.map((source) => (
          <div key={source.id} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: source.color }}
            />
            <span className="text-[11px] text-neutral-400 w-14">{source.label}</span>
            <span className="text-[11px] font-mono text-neutral-300">
              {counts[source.id] || 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
