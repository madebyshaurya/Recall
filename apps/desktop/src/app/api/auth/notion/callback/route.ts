import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", req.url));
  }

  // Exchange code for token
  const credentials = Buffer.from(
    `${process.env.NEXT_PUBLIC_NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
  ).toString("base64");

  const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${req.nextUrl.origin}/api/auth/notion/callback`,
    }),
  });

  const tokenData = await tokenRes.json();

  if (tokenData.error) {
    console.error("Notion OAuth failed:", tokenData.error);
    return NextResponse.redirect(
      new URL("/?error=notion_auth_failed", req.url)
    );
  }

  // Store connection
  await supabase.from("connections").upsert(
    {
      provider: "notion",
      access_token: tokenData.access_token,
      workspace_name: tokenData.workspace_name || "Notion Workspace",
      status: "active",
    },
    { onConflict: "provider" }
  );

  return NextResponse.redirect(new URL("/?connected=notion", req.url));
}
