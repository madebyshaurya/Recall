"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Brain, Monitor, Hash, FileText, Bot, Zap } from "lucide-react";

export function StatsBar() {
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const { count: total } = await supabase
        .from("memories")
        .select("*", { count: "exact", head: true })
        .eq("is_duplicate", false);

      const { count: screen } = await supabase
        .from("memories")
        .select("*", { count: "exact", head: true })
        .eq("source", "screen")
        .eq("is_duplicate", false);

      const { count: slack } = await supabase
        .from("memories")
        .select("*", { count: "exact", head: true })
        .eq("source", "slack")
        .eq("is_duplicate", false);

      const { count: notion } = await supabase
        .from("memories")
        .select("*", { count: "exact", head: true })
        .eq("source", "notion")
        .eq("is_duplicate", false);

      const { count: agents } = await supabase
        .from("memories")
        .select("*", { count: "exact", head: true })
        .in("source", ["claude_code", "cursor", "mcp_log"])
        .eq("is_duplicate", false);

      // Get last capture time
      const { data: latest } = await supabase
        .from("memories")
        .select("captured_at")
        .order("captured_at", { ascending: false })
        .limit(1)
        .single();

      return {
        total: total || 0,
        screen: screen || 0,
        slack: slack || 0,
        notion: notion || 0,
        agents: agents || 0,
        lastCapture: latest?.captured_at || null,
      };
    },
  });

  const items = [
    { icon: Brain, label: "Total Memories", value: stats?.total ?? 0, color: "text-white" },
    { icon: Monitor, label: "Screen", value: stats?.screen ?? 0, color: "text-blue-400" },
    { icon: Hash, label: "Slack", value: stats?.slack ?? 0, color: "text-purple-400" },
    { icon: FileText, label: "Notion", value: stats?.notion ?? 0, color: "text-emerald-400" },
    { icon: Bot, label: "Agents", value: stats?.agents ?? 0, color: "text-orange-400" },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {items.map(({ icon: Icon, label, value, color }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/30 px-4 py-3"
        >
          <Icon className={`h-4 w-4 ${color}`} />
          <div>
            <p className="text-lg font-semibold font-mono tabular-nums">{value}</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">
              {label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
