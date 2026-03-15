"use client";

import { Search, Loader2, X } from "lucide-react";

export function SearchBar({
  value,
  onChange,
  isSearching,
}: {
  value: string;
  onChange: (v: string) => void;
  isSearching: boolean;
}) {
  return (
    <div className="relative">
      {isSearching ? (
        <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 animate-spin" />
      ) : (
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
      )}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search your unified memory..."
        className="w-full h-10 pl-10 pr-10 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/10 focus:bg-white/[0.05] transition-all"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
