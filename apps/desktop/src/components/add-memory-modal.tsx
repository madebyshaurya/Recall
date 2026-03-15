"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, Loader2, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { MemorySource } from "@/lib/types";
import { toast } from "sonner";

const SOURCES: MemorySource[] = [
  "screen",
  "slack",
  "notion",
  "claude_code",
  "cursor",
  "mcp_log",
  "docs",
];

interface AddMemoryModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddMemoryModal({ open, onClose }: AddMemoryModalProps) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [source, setSource] = useState<MemorySource>("screen");
  const [sourceUrl, setSourceUrl] = useState("");
  const [metaPairs, setMetaPairs] = useState<{ key: string; value: string }[]>(
    []
  );
  const [isSaving, setIsSaving] = useState(false);

  const addMetaPair = () => {
    setMetaPairs((p) => [...p, { key: "", value: "" }]);
  };

  const removeMetaPair = (index: number) => {
    setMetaPairs((p) => p.filter((_, i) => i !== index));
  };

  const updateMetaPair = (
    index: number,
    field: "key" | "value",
    val: string
  ) => {
    setMetaPairs((p) =>
      p.map((pair, i) => (i === index ? { ...pair, [field]: val } : pair))
    );
  };

  const resetForm = () => {
    setContent("");
    setSource("screen");
    setSourceUrl("");
    setMetaPairs([]);
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }

    setIsSaving(true);
    try {
      const metadata: Record<string, string> = {};
      for (const pair of metaPairs) {
        if (pair.key.trim()) {
          metadata[pair.key.trim()] = pair.value;
        }
      }

      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          source,
          source_url: sourceUrl.trim() || undefined,
          metadata,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create memory");
      }

      toast.success("Memory added");
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      resetForm();
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to add memory";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl themed-border shadow-2xl"
            style={{ background: "var(--theme-card)" }}
          >
            {/* Header */}
            <div
              className="sticky top-0 flex items-center justify-between px-5 py-4 border-b"
              style={{
                borderColor: "var(--theme-border)",
                background: "var(--theme-card)",
              }}
            >
              <h2 className="text-[14px] font-semibold themed-text">
                Add Memory
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-white/[0.08] transition-colors"
              >
                <X className="h-4 w-4 themed-text-muted" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Content */}
              <div>
                <label className="block text-[11px] themed-text-muted uppercase tracking-wider font-medium mb-1.5">
                  Content *
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  placeholder="Enter memory content..."
                  className="w-full rounded-lg border px-3 py-2.5 text-[13px] leading-relaxed resize-y bg-white/[0.03] themed-text-secondary placeholder:text-neutral-600 focus:outline-none focus:ring-1"
                  style={{ borderColor: "var(--theme-border)" }}
                />
              </div>

              {/* Source */}
              <div>
                <label className="block text-[11px] themed-text-muted uppercase tracking-wider font-medium mb-1.5">
                  Source
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as MemorySource)}
                  className="w-full rounded-lg border px-3 py-2 text-[13px] bg-white/[0.03] themed-text-secondary focus:outline-none focus:ring-1 appearance-none cursor-pointer"
                  style={{ borderColor: "var(--theme-border)" }}
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s} className="bg-neutral-900 text-neutral-200">
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source URL */}
              <div>
                <label className="block text-[11px] themed-text-muted uppercase tracking-wider font-medium mb-1.5">
                  Source URL (optional)
                </label>
                <input
                  type="text"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border px-3 py-2 text-[13px] bg-white/[0.03] themed-text-secondary placeholder:text-neutral-600 focus:outline-none focus:ring-1"
                  style={{ borderColor: "var(--theme-border)" }}
                />
              </div>

              {/* Metadata */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] themed-text-muted uppercase tracking-wider font-medium">
                    Metadata
                  </label>
                  <button
                    onClick={addMetaPair}
                    className="flex items-center gap-1 text-[11px] font-medium hover:bg-white/[0.06] px-2 py-0.5 rounded-md transition-colors"
                    style={{ color: "var(--theme-accent)" }}
                  >
                    <Plus className="h-3 w-3" />
                    Add field
                  </button>
                </div>
                <div className="space-y-2">
                  {metaPairs.map((pair, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={pair.key}
                        onChange={(e) =>
                          updateMetaPair(i, "key", e.target.value)
                        }
                        placeholder="key"
                        className="flex-1 rounded-lg border px-2.5 py-1.5 text-[12px] bg-white/[0.03] themed-text-secondary placeholder:text-neutral-600 focus:outline-none focus:ring-1"
                        style={{ borderColor: "var(--theme-border)" }}
                      />
                      <input
                        type="text"
                        value={pair.value}
                        onChange={(e) =>
                          updateMetaPair(i, "value", e.target.value)
                        }
                        placeholder="value"
                        className="flex-1 rounded-lg border px-2.5 py-1.5 text-[12px] bg-white/[0.03] themed-text-secondary placeholder:text-neutral-600 focus:outline-none focus:ring-1"
                        style={{ borderColor: "var(--theme-border)" }}
                      />
                      <button
                        onClick={() => removeMetaPair(i)}
                        className="p-1 rounded-md hover:bg-red-500/10 text-red-400 transition-colors"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-end gap-2 px-5 py-3 border-t"
              style={{ borderColor: "var(--theme-border)" }}
            >
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium themed-text-muted hover:bg-white/[0.06] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !content.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium text-white transition-colors disabled:opacity-50"
                style={{ background: "var(--theme-accent)" }}
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                Save Memory
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
