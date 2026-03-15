"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Monitor,
  Bell,
  Clock,
  Shield,
  Save,
  Plus,
  X,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface Settings {
  id?: string;
  capture_interval_seconds: number;
  idle_timeout_seconds: number;
  enabled_sources: string[];
  excluded_apps: string[];
  notifications_enabled?: boolean;
  notification_interval_minutes?: number;
}

const DEFAULT_SETTINGS: Settings = {
  capture_interval_seconds: 60,
  idle_timeout_seconds: 120,
  enabled_sources: ["screen", "slack", "notion", "ai_agents"],
  excluded_apps: [],
  notifications_enabled: true,
  notification_interval_minutes: 5,
};

const SOURCE_OPTIONS = [
  { id: "screen", label: "Screen Capture", description: "Capture and describe your screen activity" },
  { id: "slack", label: "Slack", description: "Index messages from connected Slack workspace" },
  { id: "notion", label: "Notion", description: "Index pages from connected Notion workspace" },
  { id: "ai_agents", label: "AI Agent Sessions", description: "Capture Claude Code and Cursor conversations" },
];

export function Settings() {
  const queryClient = useQueryClient();
  const [newApp, setNewApp] = useState("");
  const [localSettings, setLocalSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const { data: savedSettings, isLoading } = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("capture_settings")
        .select("*")
        .limit(1)
        .single();
      return data || DEFAULT_SETTINGS;
    },
  });

  useEffect(() => {
    if (savedSettings) {
      setLocalSettings({
        ...DEFAULT_SETTINGS,
        ...savedSettings,
      });
    }
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: async (settings: Settings) => {
      if (settings.id) {
        await supabase
          .from("capture_settings")
          .update({
            capture_interval_seconds: settings.capture_interval_seconds,
            idle_timeout_seconds: settings.idle_timeout_seconds,
            enabled_sources: settings.enabled_sources,
            excluded_apps: settings.excluded_apps,
          })
          .eq("id", settings.id);
      } else {
        await supabase.from("capture_settings").insert({
          capture_interval_seconds: settings.capture_interval_seconds,
          idle_timeout_seconds: settings.idle_timeout_seconds,
          enabled_sources: settings.enabled_sources,
          excluded_apps: settings.excluded_apps,
        });
      }
    },
    onSuccess: () => {
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const toggleSource = (sourceId: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      enabled_sources: prev.enabled_sources.includes(sourceId)
        ? prev.enabled_sources.filter((s) => s !== sourceId)
        : [...prev.enabled_sources, sourceId],
    }));
  };

  const addExcludedApp = () => {
    if (newApp && !localSettings.excluded_apps.includes(newApp)) {
      setLocalSettings((prev) => ({
        ...prev,
        excluded_apps: [...prev.excluded_apps, newApp],
      }));
      setNewApp("");
    }
  };

  const removeExcludedApp = (app: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      excluded_apps: prev.excluded_apps.filter((a) => a !== app),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Capture Settings */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Monitor className="h-4 w-4 text-blue-400" />
          <h3 className="text-[13px] font-semibold">Capture</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-neutral-500 uppercase tracking-wider mb-2 block">
              Capture Interval
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={15}
                max={120}
                step={5}
                value={localSettings.capture_interval_seconds}
                onChange={(e) =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    capture_interval_seconds: Number(e.target.value),
                  }))
                }
                className="flex-1 accent-blue-500 h-1"
              />
              <span className="text-[12px] font-mono text-neutral-300 w-12 text-right">
                {localSettings.capture_interval_seconds}s
              </span>
            </div>
            <p className="text-[10px] text-neutral-600 mt-1">
              Fallback capture interval when no app switch is detected
            </p>
          </div>

          <div>
            <label className="text-[11px] text-neutral-500 uppercase tracking-wider mb-2 block">
              Idle Timeout
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={30}
                max={600}
                step={30}
                value={localSettings.idle_timeout_seconds}
                onChange={(e) =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    idle_timeout_seconds: Number(e.target.value),
                  }))
                }
                className="flex-1 accent-blue-500 h-1"
              />
              <span className="text-[12px] font-mono text-neutral-300 w-12 text-right">
                {Math.floor(localSettings.idle_timeout_seconds / 60)}m
              </span>
            </div>
            <p className="text-[10px] text-neutral-600 mt-1">
              Pause capturing after this period of inactivity
            </p>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-emerald-400" />
          <h3 className="text-[13px] font-semibold">Data Sources</h3>
        </div>

        <div className="space-y-2">
          {SOURCE_OPTIONS.map((source) => {
            const enabled = localSettings.enabled_sources.includes(source.id);
            return (
              <button
                key={source.id}
                onClick={() => toggleSource(source.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all text-left ${
                  enabled
                    ? "border-white/[0.08] bg-white/[0.03]"
                    : "border-transparent bg-transparent opacity-50"
                }`}
              >
                <div>
                  <p className="text-[12px] font-medium">{source.label}</p>
                  <p className="text-[10px] text-neutral-600">{source.description}</p>
                </div>
                <div
                  className={`w-8 h-4.5 rounded-full relative transition-colors ${
                    enabled ? "bg-blue-500" : "bg-neutral-800"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      enabled ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-4 w-4 text-orange-400" />
          <h3 className="text-[13px] font-semibold">Proactive Suggestions</h3>
        </div>

        <div className="space-y-3">
          <button
            onClick={() =>
              setLocalSettings((prev) => ({
                ...prev,
                notifications_enabled: !prev.notifications_enabled,
              }))
            }
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03]"
          >
            <div>
              <p className="text-[12px] font-medium">Desktop Notifications</p>
              <p className="text-[10px] text-neutral-600">
                Get notified when your current work matches context from other sources
              </p>
            </div>
            <div
              className={`w-8 h-4.5 rounded-full relative transition-colors ${
                localSettings.notifications_enabled ? "bg-orange-500" : "bg-neutral-800"
              }`}
            >
              <div
                className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                  localSettings.notifications_enabled ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>

          {localSettings.notifications_enabled && (
            <div className="px-3">
              <label className="text-[11px] text-neutral-500 uppercase tracking-wider mb-2 block">
                Check Interval
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={localSettings.notification_interval_minutes || 5}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      notification_interval_minutes: Number(e.target.value),
                    }))
                  }
                  className="flex-1 accent-orange-500 h-1"
                />
                <span className="text-[12px] font-mono text-neutral-300 w-12 text-right">
                  {localSettings.notification_interval_minutes || 5}m
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Privacy — Excluded Apps */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-red-400" />
          <h3 className="text-[13px] font-semibold">Privacy</h3>
        </div>

        <label className="text-[11px] text-neutral-500 uppercase tracking-wider mb-2 block">
          Excluded Apps
        </label>
        <p className="text-[10px] text-neutral-600 mb-3">
          Screen captures will be skipped when these apps are in focus
        </p>

        <div className="flex gap-2 mb-3">
          <input
            value={newApp}
            onChange={(e) => setNewApp(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addExcludedApp()}
            placeholder="e.g. 1Password, Banking App..."
            className="flex-1 h-8 px-3 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[12px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/10"
          />
          <button
            onClick={addExcludedApp}
            className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-neutral-400 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {localSettings.excluded_apps.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {localSettings.excluded_apps.map((app) => (
              <span
                key={app}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-[11px] text-red-400"
              >
                {app}
                <button onClick={() => removeExcludedApp(app)}>
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-neutral-700 italic">No apps excluded</p>
        )}
      </div>

      {/* Save Button */}
      <button
        onClick={() => saveMutation.mutate(localSettings)}
        disabled={saveMutation.isPending}
        className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-white text-neutral-900 text-[13px] font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-50"
      >
        {saveMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saveMutation.isSuccess ? (
          <Check className="h-4 w-4" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {saveMutation.isPending ? "Saving..." : saveMutation.isSuccess ? "Saved" : "Save Settings"}
      </button>
    </div>
  );
}
