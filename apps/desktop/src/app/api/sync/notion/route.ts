import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function getNotionPageContent(
  pageId: string,
  token: string
): Promise<string> {
  const res = await fetch(
    `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
      },
    }
  );
  const data = await res.json();
  if (!data.results) return "";

  const texts: string[] = [];
  for (const block of data.results) {
    const type = block.type;
    const content = block[type];
    if (content?.rich_text) {
      const text = content.rich_text
        .map((t: { plain_text: string }) => t.plain_text)
        .join("");
      if (text) texts.push(text);
    }
    if (type === "code" && content?.rich_text) {
      const code = content.rich_text
        .map((t: { plain_text: string }) => t.plain_text)
        .join("");
      if (code) texts.push(`\`\`\`\n${code}\n\`\`\``);
    }
  }
  return texts.join("\n");
}

export async function POST() {
  // Get Notion token from connections
  const { data: conn } = await supabase
    .from("connections")
    .select("access_token")
    .eq("provider", "notion")
    .eq("status", "active")
    .single();

  if (!conn?.access_token) {
    return NextResponse.json(
      { error: "Notion not connected" },
      { status: 400 }
    );
  }

  const token = conn.access_token;

  // Search for recently modified pages
  const searchRes = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      filter: { property: "object", value: "page" },
      sort: { direction: "descending", timestamp: "last_edited_time" },
      page_size: 20,
    }),
  });

  const searchData = await searchRes.json();
  if (!searchData.results) {
    return NextResponse.json(
      { error: "Failed to search Notion" },
      { status: 500 }
    );
  }

  let totalIngested = 0;

  for (const page of searchData.results) {
    const pageId = page.id;
    const title =
      page.properties?.title?.title?.[0]?.plain_text ||
      page.properties?.Name?.title?.[0]?.plain_text ||
      "Untitled";
    const url = page.url || "";

    // Get page content
    const content = await getNotionPageContent(pageId, token);
    if (!content || content.length < 20) continue;

    // Chunk if too long
    const fullText = `${title}\n\n${content}`;
    const chunks: string[] = [];
    if (fullText.length <= 2000) {
      chunks.push(fullText);
    } else {
      for (let i = 0; i < fullText.length; i += 1500) {
        chunks.push(fullText.substring(i, i + 1500));
      }
    }

    for (const chunk of chunks) {
      const embRes = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });

      await supabase.from("memories").insert({
        source: "notion",
        content: chunk,
        embedding: JSON.stringify(embRes.data[0].embedding),
        metadata: {
          page_title: title,
          page_id: pageId,
        },
        source_url: url,
        session_id: `notion-sync-${new Date().toISOString().split("T")[0]}`,
      });

      totalIngested++;
    }
  }

  return NextResponse.json({ count: totalIngested, provider: "notion" });
}
