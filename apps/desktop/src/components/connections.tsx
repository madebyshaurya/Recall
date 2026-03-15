"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  ExternalLink,
  RefreshCw,
  Check,
  X,
  Loader2,
  Plus,
  Unplug,
} from "lucide-react";
import { toast } from "sonner";

interface ConnectionStatus {
  provider: string;
  status: "connected" | "disconnected";
  workspace_name?: string;
  connected_at?: string;
  item_count?: number;
}

const INTEGRATIONS = [
  {
    id: "slack",
    name: "Slack",
    description: "Import messages from your Slack workspace channels",
    logo: "https://svgl.app/library/slack.svg",
    authType: "oauth" as const,
  },
  {
    id: "notion",
    name: "Notion",
    description: "Import pages and docs from your Notion workspace",
    logo: "https://svgl.app/library/notion.svg",
    authType: "oauth" as const,
  },
];

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}


export function Connections() {
  const queryClient = useQueryClient();
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);

  const { data: connections = [] } = useQuery<ConnectionStatus[]>({
    queryKey: ["connections"],
    queryFn: async () => {
      const { data } = await supabase
        .from("connections")
        .select("*")
        .order("connected_at", { ascending: false });

      // Get counts per provider
      const results: ConnectionStatus[] = [];
      for (const integration of INTEGRATIONS) {
        const conn = (data || []).find(
          (c: { provider: string }) => c.provider === integration.id && c.status === "active"
        );

        const { count } = await supabase
          .from("memories")
          .select("*", { count: "exact", head: true })
          .eq("source", integration.id);

        results.push({
          provider: integration.id,
          status: conn ? "connected" : "disconnected",
          workspace_name: conn?.workspace_name,
          connected_at: conn?.connected_at,
          item_count: count || 0,
        });
      }
      return results;
    },
  });

  const connectProvider = (provider: string) => {
    if (provider === "slack") {
      const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
      if (!clientId) {
        toast.error("Slack Client ID not configured. Set NEXT_PUBLIC_SLACK_CLIENT_ID in .env.local");
        return;
      }
      const redirectUri = encodeURIComponent(
        `${window.location.origin}/api/auth/slack/callback`
      );
      const scopes = encodeURIComponent(
        "channels:history,channels:read,groups:history,groups:read"
      );
      window.location.href = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`;
    } else if (provider === "notion") {
      const clientId = process.env.NEXT_PUBLIC_NOTION_CLIENT_ID;
      if (!clientId) {
        toast.error("Notion Client ID not configured. Set NEXT_PUBLIC_NOTION_CLIENT_ID in .env.local");
        return;
      }
      const redirectUri = encodeURIComponent(
        `${window.location.origin}/api/auth/notion/callback`
      );
      window.location.href = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${redirectUri}`;
    }
  };

  const syncProvider = async (provider: string) => {
    setSyncingProvider(provider);
    try {
      const res = await fetch(`/api/sync/${provider}`, { method: "POST" });
      const data = await res.json();
      if (data.error) {
        toast.error(`Sync failed: ${data.error}`);
      } else {
        toast.success(`Synced ${data.count || 0} items from ${provider}`);
        queryClient.invalidateQueries({ queryKey: ["memories"] });
        queryClient.invalidateQueries({ queryKey: ["stats"] });
        queryClient.invalidateQueries({ queryKey: ["connections"] });
      }
    } catch {
      toast.error(`Failed to sync ${provider}`);
    } finally {
      setSyncingProvider(null);
    }
  };

  const disconnectProvider = async (provider: string) => {
    await supabase
      .from("connections")
      .update({ status: "disconnected" })
      .eq("provider", provider);
    toast.success(`${provider} disconnected`);
    queryClient.invalidateQueries({ queryKey: ["connections"] });
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {INTEGRATIONS.map((integration) => {
          const conn = connections.find(
            (c) => c.provider === integration.id
          );
          const isConnected = conn?.status === "connected";
          const isSyncing = syncingProvider === integration.id;

          return (
            <div
              key={integration.id}
              className={`relative rounded-xl border p-4 transition-all ${
                isConnected
                  ? "border-white/[0.08] bg-white/[0.02]"
                  : "border-dashed border-white/[0.06] bg-transparent"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src={integration.logo}
                    alt={integration.name}
                    className="w-7 h-7"
                  />
                  <div>
                    <h3 className="text-[13px] font-medium">
                      {integration.name}
                    </h3>
                    <p className="text-[10px] text-neutral-600">
                      {integration.description}
                    </p>
                  </div>
                </div>

                {isConnected && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10">
                    <Check className="h-2.5 w-2.5 text-emerald-400" />
                    <span className="text-[9px] text-emerald-400 font-medium">
                      Connected
                    </span>
                  </div>
                )}
              </div>

              {isConnected ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-neutral-500 font-mono">
                      {conn?.item_count || 0} memories
                    </span>
                    {conn?.connected_at && (
                      <span className="text-[10px] text-neutral-600">
                        Synced {timeAgo(conn.connected_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => syncProvider(integration.id)}
                      disabled={isSyncing}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-neutral-400 hover:text-white hover:bg-white/[0.05] transition-all disabled:opacity-50"
                    >
                      {isSyncing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Sync
                    </button>
                    <button
                      onClick={() => disconnectProvider(integration.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-neutral-600 hover:text-red-400 hover:bg-red-500/5 transition-all"
                    >
                      <Unplug className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => connectProvider(integration.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 transition-all"
                >
                  <Plus className="h-3 w-3" />
                  Connect
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
