import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST() {
  // Get Slack token from connections
  const { data: conn } = await supabase
    .from("connections")
    .select("access_token")
    .eq("provider", "slack")
    .eq("status", "active")
    .single();

  if (!conn?.access_token) {
    return NextResponse.json({ error: "Slack not connected" }, { status: 400 });
  }

  const token = conn.access_token;

  // Get channels
  const channelsRes = await fetch(
    "https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=20",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const channelsData = await channelsRes.json();

  if (!channelsData.ok) {
    return NextResponse.json(
      { error: channelsData.error },
      { status: 500 }
    );
  }

  let totalIngested = 0;

  // Get recent messages from each channel (last 24 hours)
  for (const channel of channelsData.channels || []) {
    const oldest = String(Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000));

    const historyRes = await fetch(
      `https://slack.com/api/conversations.history?channel=${channel.id}&oldest=${oldest}&limit=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const historyData = await historyRes.json();

    if (!historyData.ok) continue;

    const messages = (historyData.messages || [])
      .filter((m: { text: string; subtype?: string }) => m.text && !m.subtype)
      .map((m: { text: string }) => m.text);

    if (messages.length === 0) continue;

    // Batch into conversation chunks (~500 tokens each)
    const chunks: string[] = [];
    let current = `#${channel.name}:\n`;
    for (const msg of messages) {
      if ((current + msg).length > 1500) {
        chunks.push(current);
        current = `#${channel.name}:\n`;
      }
      current += `- ${msg}\n`;
    }
    if (current.length > 20) chunks.push(current);

    // Embed and store each chunk
    for (const chunk of chunks) {
      const embRes = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });

      await supabase.from("memories").insert({
        source: "slack",
        content: chunk,
        embedding: JSON.stringify(embRes.data[0].embedding),
        metadata: {
          channel_name: channel.name,
          channel_id: channel.id,
        },
        source_url: `https://slack.com/archives/${channel.id}`,
        session_id: `slack-sync-${new Date().toISOString().split("T")[0]}`,
      });

      totalIngested++;
    }
  }

  return NextResponse.json({ count: totalIngested, provider: "slack" });
}
