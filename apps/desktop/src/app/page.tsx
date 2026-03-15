"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Memory, MemorySource, SearchResult } from "@/lib/types";
import { StatsBar } from "@/components/stats-bar";
import { SearchBar } from "@/components/search-bar";
import { SourceFilter } from "@/components/source-filter";
import { MemoryCard } from "@/components/memory-card";
import { Brain, Zap, Activity } from "lucide-react";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<MemorySource | "all">("all");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch timeline memories
  const { data: memories = [] } = useQuery<Memory[]>({
    queryKey: ["memories", sourceFilter],
    queryFn: async () => {
      let query = supabase
        .from("memories")
        .select(
          "id, source, content, metadata, source_url, captured_at, session_id, is_duplicate"
        )
        .eq("is_duplicate", false)
        .order("captured_at", { ascending: false })
        .limit(50);

      if (sourceFilter !== "all") {
        query = query.eq("source", sourceFilter);
      }

      const { data } = await query;
      return (data || []) as Memory[];
    },
    enabled: !debouncedQuery,
  });

  // Semantic search
  const { data: searchResults = [], isFetching: isSearching } = useQuery<
    SearchResult[]
  >({
    queryKey: ["search", debouncedQuery, sourceFilter],
    queryFn: async () => {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: debouncedQuery,
          source: sourceFilter === "all" ? null : sourceFilter,
          limit: 20,
        }),
      });
      const { results } = await res.json();
      return results || [];
    },
    enabled: !!debouncedQuery && debouncedQuery.length >= 2,
  });

  const displayData = debouncedQuery ? searchResults : memories;
  const isShowingSearch = !!debouncedQuery;

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Subtle grid background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-neutral-800">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Recall</h1>
              <p className="text-[11px] text-neutral-500">
                Unified AI Memory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              <Activity className="h-3 w-3 text-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-mono">
                Capturing
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6">
          <StatsBar />
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              isSearching={isSearching}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <SourceFilter active={sourceFilter} onChange={setSourceFilter} />
          <span className="text-[11px] text-neutral-600 font-mono">
            {displayData.length}{" "}
            {isShowingSearch ? "results" : "memories"}
          </span>
        </div>

        {/* Memory list */}
        <div className="space-y-2">
          {displayData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-600">
              <Zap className="h-8 w-8 mb-3" />
              <p className="text-sm">
                {isShowingSearch
                  ? "No results found"
                  : "No memories yet. Start the capture engine."}
              </p>
              {!isShowingSearch && (
                <code className="mt-2 text-[11px] text-neutral-700 bg-neutral-900 px-2 py-1 rounded">
                  npm run dev:capture
                </code>
              )}
            </div>
          ) : (
            displayData.map((item, i) => (
              <MemoryCard
                key={item.id}
                memory={item}
                similarity={
                  isShowingSearch
                    ? (item as SearchResult).similarity
                    : undefined
                }
                index={i}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
