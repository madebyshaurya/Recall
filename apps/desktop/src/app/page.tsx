"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Memory, SearchResult } from "@/lib/types";
import { StatsBar } from "@/components/stats-bar";
import { SearchBar } from "@/components/search-bar";
import {
  SourceFilter,
  getSourcesForFilter,
  type FilterValue,
} from "@/components/source-filter";
import { MemoryCard } from "@/components/memory-card";
import { Brain, Zap, Sparkles } from "lucide-react";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<FilterValue>("all");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch timeline memories
  const { data: memories = [] } = useQuery<Memory[]>({
    queryKey: ["memories", sourceFilter],
    queryFn: async () => {
      const sources = getSourcesForFilter(sourceFilter);
      let query = supabase
        .from("memories")
        .select(
          "id, source, content, metadata, source_url, captured_at, session_id, is_duplicate"
        )
        .eq("is_duplicate", false)
        .order("captured_at", { ascending: false })
        .limit(100);

      if (sources) {
        query = query.in("source", sources);
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
      const sources = getSourcesForFilter(sourceFilter);
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: debouncedQuery,
          source: sources ? sources[0] : null, // RPC only supports single source filter
          limit: 20,
        }),
      });
      const { results } = await res.json();
      // If we have multiple source filters, filter client-side
      if (sources && sources.length > 1) {
        return (results || []).filter((r: SearchResult) =>
          sources.includes(r.source)
        );
      }
      return results || [];
    },
    enabled: !!debouncedQuery && debouncedQuery.length >= 2,
  });

  const displayData = debouncedQuery ? searchResults : memories;
  const isShowingSearch = !!debouncedQuery;

  return (
    <div className="min-h-screen bg-[#09090b] selection:bg-white/10">
      {/* Dot grid background */}
      <div className="fixed inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Subtle top glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08]">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight leading-none">
                Recall
              </h1>
              <p className="text-[11px] text-neutral-600 mt-0.5">
                Unified AI Memory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/[0.15]">
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </div>
              <span className="text-[11px] text-emerald-400 font-medium">
                Live
              </span>
            </div>
          </div>
        </header>

        {/* Stats */}
        <section className="mb-8">
          <StatsBar />
        </section>

        {/* Search */}
        <section className="mb-3">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            isSearching={isSearching}
          />
        </section>

        {/* Filters + count */}
        <section className="flex items-center justify-between mb-5">
          <SourceFilter active={sourceFilter} onChange={setSourceFilter} />
          <div className="flex items-center gap-1.5 text-neutral-600">
            {isShowingSearch && (
              <Sparkles className="h-3 w-3 text-blue-400" />
            )}
            <span className="text-[11px] font-mono">
              {displayData.length} {isShowingSearch ? "results" : "memories"}
            </span>
          </div>
        </section>

        {/* Memory list */}
        <section className="space-y-0.5">
          {displayData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-neutral-600">
              <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                <Zap className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-neutral-500 mb-1">
                {isShowingSearch
                  ? "No matching memories"
                  : "No memories captured yet"}
              </p>
              <p className="text-[12px] text-neutral-600 mb-3">
                {isShowingSearch
                  ? "Try a different search query"
                  : "Start the capture engine to begin recording context"}
              </p>
              {!isShowingSearch && (
                <code className="text-[11px] text-neutral-500 bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 rounded-lg font-mono">
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
        </section>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-neutral-700">
          <span>Recall v0.1.0 — GenAI Genesis 2026</span>
          <span>Powered by Moorcheh AI + Supabase pgvector</span>
        </footer>
      </div>
    </div>
  );
}
