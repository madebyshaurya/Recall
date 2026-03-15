"use client";

import { Card } from "@/components/ui/card";
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
} from "lucide-react";
import { motion } from "framer-motion";

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
  const config = SOURCE_CONFIG[memory.source];
  const Icon = ICONS[config.icon as keyof typeof ICONS] || Terminal;
  const metadata = memory.metadata || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
    >
      <Card className="relative overflow-hidden border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900/80 transition-colors group">
        {/* Source color indicator */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 ${config.color}`}
        />

        <div className="p-4 pl-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-neutral-400" />
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-4 bg-neutral-800 text-neutral-400 font-mono"
              >
                {config.label}
              </Badge>
              {metadata.app_name && (
                <span className="text-[10px] text-neutral-500 font-mono">
                  {metadata.app_name as string}
                </span>
              )}
              {metadata.window_title && (
                <span className="text-[10px] text-neutral-600 font-mono truncate max-w-[200px]">
                  — {metadata.window_title as string}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {similarity !== undefined && (
                <span className="text-[10px] font-mono text-neutral-500">
                  {(similarity * 100).toFixed(0)}%
                </span>
              )}
              <span className="text-[10px] text-neutral-500 font-mono">
                {timeAgo(memory.captured_at)}
              </span>
            </div>
          </div>

          {/* Content */}
          <p className="text-sm text-neutral-300 leading-relaxed line-clamp-3">
            {memory.content}
          </p>

          {/* Footer */}
          {memory.source_url && (
            <a
              href={memory.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              Open source
            </a>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
