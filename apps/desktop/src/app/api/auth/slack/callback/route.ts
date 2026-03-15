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
  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: `${req.nextUrl.origin}/api/auth/slack/callback`,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.ok) {
    console.error("Slack OAuth failed:", tokenData.error);
    return NextResponse.redirect(new URL("/?error=slack_auth_failed", req.url));
  }

  // Store connection
  await supabase.from("connections").upsert(
    {
      provider: "slack",
      access_token: tokenData.access_token,
      workspace_name: tokenData.team?.name || "Slack Workspace",
      status: "active",
    },
    { onConflict: "provider" }
  );

  return NextResponse.redirect(new URL("/?connected=slack", req.url));
}
