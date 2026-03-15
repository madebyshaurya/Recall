"use client";

import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";

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
        <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 animate-spin" />
      ) : (
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
      )}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search across all your memory..."
        className="pl-10 bg-neutral-900/50 border-neutral-800 text-neutral-200 placeholder:text-neutral-600 h-11 text-sm focus-visible:ring-neutral-700"
      />
    </div>
  );
}
