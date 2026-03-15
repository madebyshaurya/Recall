"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const SOURCE_COLORS: Record<string, string> = {
  screen: "#3b82f6",
  slack: "#a855f7",
  notion: "#10b981",
  claude_code: "#f97316",
  cursor: "#eab308",
  mcp_log: "#6b7280",
};

export function ActivityChart() {
  const { data: chartData = [] } = useQuery({
    queryKey: ["activity-chart"],
    queryFn: async () => {
      const { data } = await supabase
        .from("memories")
        .select("source, captured_at")
        .eq("is_duplicate", false)
        .order("captured_at", { ascending: true });

      if (!data || data.length === 0) return [];

      // Group into hourly buckets
      const buckets = new Map<string, Record<string, number>>();

      for (const m of data) {
        const date = new Date(m.captured_at);
        const hour = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;

        if (!buckets.has(hour)) {
          buckets.set(hour, { screen: 0, slack: 0, notion: 0, claude_code: 0, cursor: 0, mcp_log: 0 });
        }
        const bucket = buckets.get(hour)!;
        bucket[m.source] = (bucket[m.source] || 0) + 1;
      }

      return Array.from(buckets.entries()).map(([time, counts]) => ({
        time,
        ...counts,
      }));
    },
  });

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[140px] text-[11px] text-neutral-700">
        No activity data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          {Object.entries(SOURCE_COLORS).map(([source, color]) => (
            <linearGradient key={source} id={`gradient-${source}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <XAxis
          dataKey="time"
          tick={{ fontSize: 9, fill: "#525252" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 9, fill: "#525252" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#171717",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#d4d4d4",
          }}
          itemStyle={{ color: "#d4d4d4", fontSize: "10px" }}
          labelStyle={{ color: "#737373", fontSize: "10px" }}
        />
        {Object.entries(SOURCE_COLORS).map(([source, color]) => (
          <Area
            key={source}
            type="monotone"
            dataKey={source}
            stackId="1"
            stroke={color}
            fill={`url(#gradient-${source})`}
            strokeWidth={1.5}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
