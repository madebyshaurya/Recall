"use client";

import { Badge } from "@/components/ui/badge";
import { SOURCE_CONFIG, type Memory } from "@/lib/types";
import {
  Monitor,
  Hash,
  FileText,
  Bot,
  MousePointer,
  Terminal,
  ExternalLink,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const ICONS = {
  Monitor,
  Hash,
  FileText,
  Bot,
  MousePointer,
  Terminal,
};

function timeAgo(date: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function MemoryCard({
  memory,
  similarity,
  index = 0,
}: {
  memory: Memory;
  similarity?: number;
  index?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = SOURCE_CONFIG[memory.source];
  const Icon = ICONS[config.icon as keyof typeof ICONS] || Terminal;
  const metadata = memory.metadata || {};
  const isLong = memory.content.length > 200;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.15 }}
    >
      <div
        onClick={() => isLong && setExpanded(!expanded)}
        className={`group relative rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200 ${isLong ? "cursor-pointer" : ""}`}
      >
        {/* Source color accent */}
        <div
          className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${config.color} opacity-60`}
        />

        <div className="px-4 py-3 pl-5">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className={`flex items-center justify-center w-5 h-5 rounded-md ${config.color}/10`}
            >
              <Icon className="h-3 w-3 text-neutral-400" />
            </div>
            <span className="text-[11px] font-medium text-neutral-400">
              {config.label}
            </span>
            {metadata.app_name && (
              <>
                <span className="text-neutral-700">·</span>
                <span className="text-[11px] text-neutral-500">
                  {metadata.app_name as string}
                </span>
              </>
            )}
            {metadata.window_title &&
              (metadata.window_title as string).length > 0 && (
                <>
                  <span className="text-neutral-700">·</span>
                  <span className="text-[11px] text-neutral-600 truncate max-w-[250px]">
                    {metadata.window_title as string}
                  </span>
                </>
              )}

            <div className="ml-auto flex items-center gap-2 shrink-0">
              {similarity !== undefined && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono"
                >
                  {(similarity * 100).toFixed(0)}% match
                </Badge>
              )}
              <div className="flex items-center gap-1 text-neutral-600">
                <Clock className="h-2.5 w-2.5" />
                <span className="text-[10px] font-mono">
                  {timeAgo(memory.captured_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <p
            className={`text-[13px] text-neutral-300 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}
          >
            {memory.content}
          </p>

          {/* Expand hint */}
          {isLong && !expanded && (
            <span className="text-[10px] text-neutral-600 mt-1 inline-block">
              Click to expand
            </span>
          )}

          {/* Source URL */}
          {memory.source_url && (
            <a
              href={memory.source_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-neutral-500 hover:text-blue-400 transition-colors"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              View source
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
