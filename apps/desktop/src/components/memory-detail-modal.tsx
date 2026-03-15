"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pencil, Trash2, ExternalLink, Save, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Memory, MemorySource } from "@/lib/types";
import { SOURCE_CONFIG } from "@/lib/types";
import { toast } from "sonner";

interface MemoryDetailModalProps {
  memory: Memory | null;
  onClose: () => void;
}

export function MemoryDetailModal({ memory, onClose }: MemoryDetailModalProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!memory) return null;

  const config = SOURCE_CONFIG[memory.source] || {
    label: memory.source,
    color: "bg-gray-500",
    icon: "Terminal",
  };
  const metadata = memory.metadata || {};

  const handleEdit = () => {
    setEditContent(memory.content);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("memories")
        .update({ content: editContent })
        .eq("id", memory.id);

      if (error) throw error;

      toast.success("Memory updated");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update memory";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/memories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: memory.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      toast.success("Memory deleted");
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete memory";
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <AnimatePresence>
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
          className="relative w-full max-w-xl max-h-[80vh] overflow-y-auto rounded-xl themed-border shadow-2xl"
          style={{ background: "var(--theme-card)" }}
        >
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: "var(--theme-border)", background: "var(--theme-card)" }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium text-white ${config.color}`}
              >
                {config.label}
              </span>
              <span className="text-[11px] themed-text-muted font-mono">
                {new Date(memory.captured_at).toLocaleString()}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-white/[0.08] transition-colors"
            >
              <X className="h-4 w-4 themed-text-muted" />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 py-4">
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={8}
                  className="w-full rounded-lg border px-3 py-2.5 text-[13px] leading-relaxed resize-y bg-white/[0.03] themed-text-secondary focus:outline-none focus:ring-1"
                  style={{
                    borderColor: "var(--theme-border)",
                  }}
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-medium themed-text-muted hover:bg-white/[0.06] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white transition-colors"
                    style={{ background: "var(--theme-accent)" }}
                  >
                    {isSaving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[13px] themed-text-secondary leading-relaxed whitespace-pre-wrap">
                {memory.content}
              </p>
            )}
          </div>

          {/* Metadata pills */}
          {Object.keys(metadata).length > 0 && (
            <div className="px-5 pb-4">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(metadata).map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.04] border"
                    style={{ borderColor: "var(--theme-border)" }}
                  >
                    <span className="themed-text-muted">{key}:</span>
                    <span className="themed-text-secondary">
                      {String(value)}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Source URL */}
          {memory.source_url && (
            <div className="px-5 pb-4">
              <a
                href={memory.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] hover:underline"
                style={{ color: "var(--theme-accent)" }}
              >
                <ExternalLink className="h-3 w-3" />
                {memory.source_url}
              </a>
            </div>
          )}

          {/* Actions */}
          <div
            className="flex items-center justify-end gap-2 px-5 py-3 border-t"
            style={{ borderColor: "var(--theme-border)" }}
          >
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-red-400">
                  Delete this memory?
                </span>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium themed-text-muted hover:bg-white/[0.06] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  Confirm
                </button>
              </div>
            ) : (
              <>
                {!isEditing && (
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium themed-text-secondary hover:bg-white/[0.06] transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                )}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
