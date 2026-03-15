"use client";

import { SOURCE_CONFIG, type Memory } from "@/lib/types";
import {
  Monitor,
  Hash,
  FileText,
  Bot,
  MousePointer,
  Terminal,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.substring(0, len).trimEnd() + "...";
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
  const config = SOURCE_CONFIG[memory.source] || { label: memory.source, color: "bg-gray-500", icon: "Terminal" };
  const Icon = ICONS[config.icon as keyof typeof ICONS] || Terminal;
  const metadata = memory.metadata || {};
  const isLong = memory.content.length > 120;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.015, duration: 0.12 }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left group relative rounded-lg themed-border transition-all duration-150"
      >
        {/* Compact row */}
        <div className="flex items-center gap-2.5 px-3 py-2">
          {/* Source dot */}
          <div
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.color}`}
          />

          {/* Icon */}
          <Icon className="h-3.5 w-3.5 themed-text-muted shrink-0" />

          {/* Content preview */}
          <span className="text-[12px] themed-text-secondary truncate flex-1 min-w-0">
            {expanded ? memory.content : truncate(memory.content, 120)}
          </span>

          {/* Meta */}
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {similarity !== undefined && (
              <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                {(similarity * 100).toFixed(0)}%
              </span>
            )}

            {metadata.app_name && (
              <span className="text-[10px] themed-text-muted font-mono hidden sm:inline">
                {metadata.app_name as string}
              </span>
            )}

            <span className="text-[10px] themed-text-muted font-mono w-6 text-right">
              {timeAgo(memory.captured_at)}
            </span>

            <ChevronDown
              className={`h-3 w-3 themed-text-muted transition-transform duration-150 ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 pt-0">
                <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                  <p className="text-[12px] themed-text-secondary leading-relaxed whitespace-pre-wrap">
                    {memory.content}
                  </p>

                  {/* Metadata row */}
                  <div className="flex items-center gap-3 mt-3 pt-2 border-t border-white/[0.04]">
                    <span className="text-[10px] text-neutral-600">
                      <span className="text-neutral-500">{config.label}</span>
                    </span>
                    {metadata.app_name && (
                      <span className="text-[10px] text-neutral-600">
                        App:{" "}
                        <span className="text-neutral-500">
                          {metadata.app_name as string}
                        </span>
                      </span>
                    )}
                    {metadata.window_title &&
                      (metadata.window_title as string).length > 0 && (
                        <span className="text-[10px] text-neutral-600 truncate max-w-[300px]">
                          Window:{" "}
                          <span className="text-neutral-500">
                            {metadata.window_title as string}
                          </span>
                        </span>
                      )}
                    <span className="text-[10px] text-neutral-600">
                      {new Date(memory.captured_at).toLocaleString()}
                    </span>
                    {memory.source_url && (
                      <a
                        href={memory.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[10px] text-neutral-500 hover:text-blue-400 transition-colors ml-auto"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        Source
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </motion.div>
  );
}
