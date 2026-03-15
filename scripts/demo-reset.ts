import { supabase } from '../packages/shared/src/supabase.js';
import { embedText } from '../packages/shared/src/embeddings.js';

const DEMO_MEMORIES = [
  {
    source: 'slack',
    content: '#engineering:\nSarah: Hey, anyone seeing issues with the AuthService token refresh? Users are getting logged out after exactly 1 hour.\nMike: Yeah, I noticed that too. The refresh token endpoint is returning 401. I think the issue is in refreshAccessToken() — it\'s not sending the correct grant_type.\nSarah: Found it! The token refresh was using "authorization_code" instead of "refresh_token" as the grant type. PR #432 incoming.',
    metadata: { channel_name: 'engineering', channel_id: 'C01234' },
    source_url: 'https://slack.com/archives/C01234',
    hoursAgo: 48,
  },
  {
    source: 'slack',
    content: '#engineering:\nMike: @sarah your PR looks good but can you also add the token expiry buffer? We should refresh 5 minutes before expiry, not at expiry.\nSarah: Good call, updated. Also added retry logic with exponential backoff for the refresh endpoint.\nLead: Approved and merged. Nice catch team. Let\'s add monitoring for token refresh failures to the Grafana dashboard.',
    metadata: { channel_name: 'engineering', channel_id: 'C01234' },
    source_url: 'https://slack.com/archives/C01234',
    hoursAgo: 46,
  },
  {
    source: 'slack',
    content: '#devops:\nCI/CD pipeline completed for v2.4.1. Auth service changes deployed to staging.\nAll integration tests passing. Token refresh fix confirmed working in staging environment.\nProduction deploy scheduled for tomorrow 9am EST. Rollback plan: revert to v2.4.0 image.',
    metadata: { channel_name: 'devops', channel_id: 'C05678' },
    source_url: 'https://slack.com/archives/C05678',
    hoursAgo: 24,
  },
  {
    source: 'notion',
    content: 'Frontend Auth Flow — Troubleshooting\n\nCommon Issues:\n1. Token Refresh Failures: Check that refreshAccessToken() in utils/auth.ts uses grant_type="refresh_token". Previously was incorrectly set to "authorization_code".\n2. Session Expiry: Default token TTL is 3600s (1 hour). Refresh should trigger at 3300s (5 min buffer).\n3. CORS Issues: Ensure the auth endpoint allows credentials from the frontend origin.\n\nDebugging Steps:\n- Check browser DevTools Network tab for 401 responses on /api/auth/refresh\n- Verify refresh_token is stored in httpOnly cookie\n- Check server logs for "invalid_grant" errors',
    metadata: { page_title: 'Frontend Auth Flow — Troubleshooting', page_id: 'page-001' },
    source_url: 'https://notion.so/frontend-auth-flow',
    hoursAgo: 72,
  },
  {
    source: 'notion',
    content: 'API Architecture — Authentication Service\n\nThe AuthService handles all user authentication flows:\n- Login: POST /api/auth/login → returns access_token + refresh_token\n- Refresh: POST /api/auth/refresh → requires valid refresh_token cookie\n- Logout: POST /api/auth/logout → invalidates all tokens\n\nKey files:\n- src/services/AuthService.ts — main service class\n- src/utils/auth.ts — helper functions including refreshAccessToken()\n- src/middleware/authMiddleware.ts — JWT verification middleware\n\nThe refresh flow uses rotating refresh tokens. Each refresh invalidates the old token and issues a new pair.',
    metadata: { page_title: 'API Architecture — Authentication Service', page_id: 'page-002' },
    source_url: 'https://notion.so/api-architecture-auth',
    hoursAgo: 120,
  },
  {
    source: 'screen',
    content: 'The user has VS Code open with the file src/utils/auth.ts visible. The code shows a function called refreshAccessToken() that makes a POST request to /api/auth/refresh. The function accepts a refresh token parameter and sends it with grant_type set to "refresh_token". There\'s a try-catch block handling token refresh failures with retry logic.',
    metadata: { app_name: 'VS Code', window_title: 'auth.ts — project', capture_method: 'fallback' },
    hoursAgo: 2,
  },
  {
    source: 'screen',
    content: 'The user is viewing a GitHub pull request #432 titled "Fix token refresh grant_type and add expiry buffer". The PR shows changes to src/utils/auth.ts where grant_type was changed from "authorization_code" to "refresh_token". The PR has 3 approvals and all CI checks are passing. Comments show discussion about adding monitoring.',
    metadata: { app_name: 'Chrome', window_title: 'PR #432 — GitHub', capture_method: 'fallback' },
    hoursAgo: 6,
  },
  {
    source: 'screen',
    content: 'The user is browsing Stack Overflow looking at a question titled "JWT refresh token returns 401 invalid_grant". The accepted answer explains that refresh tokens must use grant_type="refresh_token" not "authorization_code", and recommends implementing a token refresh buffer of 5 minutes before actual expiry.',
    metadata: { app_name: 'Chrome', window_title: 'Stack Overflow', capture_method: 'fallback' },
    hoursAgo: 50,
  },
  {
    source: 'claude_code',
    content: '[User] I\'m getting 401 errors when trying to refresh auth tokens. The refresh endpoint keeps returning invalid_grant. Can you help me debug this?\n[Assistant] Looking at your refreshAccessToken() function in utils/auth.ts, I can see the issue. You\'re using grant_type: "authorization_code" but for token refresh, it should be grant_type: "refresh_token". The authorization_code grant type is only used during the initial OAuth flow.',
    metadata: { role: 'conversation', session_id: 'session-debug-auth' },
    hoursAgo: 49,
  },
  {
    source: 'claude_code',
    content: '[User] Thanks that fixed it. Should I also add some kind of buffer so we refresh before the token actually expires?\n[Assistant] Yes, that\'s a best practice. Add a buffer of about 5 minutes (300 seconds). Check the token\'s exp claim, and trigger refresh when current_time > exp - 300. This prevents edge cases where the token expires between the check and the actual API call. Also consider adding exponential backoff retry logic for the refresh endpoint.',
    metadata: { role: 'conversation', session_id: 'session-debug-auth' },
    hoursAgo: 49,
  },
  {
    source: 'mcp_log',
    content: 'The deploy key for production auth service is stored in vault-prod under the path secret/auth-service/jwt-signing-key. Last rotated on March 10, 2026.',
    metadata: { saved_by: 'user' },
    hoursAgo: 36,
  },
];

async function main() {
  // Step 1: Clear
  console.log('🧹 Clearing all data...');
  await supabase.from('memories').delete().neq('source', '___never___');
  await supabase.from('connections').delete().neq('provider', '___never___');
  console.log('   Done\n');

  // Step 2: Seed
  console.log('🌱 Seeding demo data...\n');
  for (const mem of DEMO_MEMORIES) {
    const capturedAt = new Date(Date.now() - mem.hoursAgo * 60 * 60 * 1000).toISOString();
    process.stdout.write(`   [${mem.source}] ${mem.content.substring(0, 50)}...`);
    const embedding = await embedText(mem.content);
    const { error } = await supabase.from('memories').insert({
      source: mem.source,
      content: mem.content,
      embedding: JSON.stringify(embedding),
      metadata: mem.metadata,
      source_url: mem.source_url || null,
      captured_at: capturedAt,
      session_id: `demo-${mem.source}`,
    });
    console.log(error ? ` ✗ ${error.message}` : ' ✓');
  }

  // Step 3: Re-add Slack connection
  await supabase.from('connections').upsert({
    provider: 'slack',
    access_token: process.env.SLACK_BOT_TOKEN || '',
    workspace_name: 'Recall Workspace',
    status: 'active',
  }, { onConflict: 'provider' });

  console.log('\n✅ Demo ready! Starting dashboard...\n');
}

main().catch(console.error);
