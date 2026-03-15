import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../../.env') });

export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  moorcheh: {
    apiKey: process.env.MOORCHEH_API_KEY || '',
    bridgeUrl: process.env.MOORCHEH_BRIDGE_URL || 'http://localhost:8100',
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN || '',
    signingSecret: process.env.SLACK_SIGNING_SECRET || '',
  },
  notion: {
    token: process.env.NOTION_INTEGRATION_TOKEN || '',
  },
  screenpipe: {
    apiUrl: process.env.SCREENPIPE_API_URL || 'http://localhost:3030',
  },
} as const;
