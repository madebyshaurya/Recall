"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Brain, Monitor, Hash, FileText, Bot } from "lucide-react";

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

      return {
        total: total || 0,
        screen: screen || 0,
        slack: slack || 0,
        notion: notion || 0,
        agents: agents || 0,
      };
    },
  });

  const items = [
    {
      icon: Brain,
      label: "Total",
      value: stats?.total ?? 0,
      color: "text-white",
      bg: "bg-white/5",
      border: "border-white/10",
    },
    {
      icon: Monitor,
      label: "Screen",
      value: stats?.screen ?? 0,
      color: "text-blue-400",
      bg: "bg-blue-500/5",
      border: "border-blue-500/10",
    },
    {
      icon: Hash,
      label: "Slack",
      value: stats?.slack ?? 0,
      color: "text-purple-400",
      bg: "bg-purple-500/5",
      border: "border-purple-500/10",
    },
    {
      icon: FileText,
      label: "Notion",
      value: stats?.notion ?? 0,
      color: "text-emerald-400",
      bg: "bg-emerald-500/5",
      border: "border-emerald-500/10",
    },
    {
      icon: Bot,
      label: "Agents",
      value: stats?.agents ?? 0,
      color: "text-orange-400",
      bg: "bg-orange-500/5",
      border: "border-orange-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-2">
      {items.map(({ icon: Icon, label, value, color, bg, border }) => (
        <div
          key={label}
          className={`relative overflow-hidden rounded-xl border ${border} ${bg} px-4 py-3.5`}
        >
          <div className="flex items-center gap-2.5">
            <Icon className={`h-4 w-4 ${color} shrink-0`} />
            <div className="min-w-0">
              <p className="text-xl font-semibold font-mono tabular-nums leading-none">
                {value}
              </p>
              <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-widest">
                {label}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
