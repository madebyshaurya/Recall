#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';
import { createInterface } from 'readline';

const HOME = homedir();
const PROJECT_ROOT = resolve(import.meta.dirname, '../../..');

// ANSI colors
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const CHECK = `${GREEN}✓${RESET}`;
const CROSS = `${RED}✗${RESET}`;
const ARROW = `${CYAN}→${RESET}`;

interface AgentConfig {
  name: string;
  configPath: string;
  detected: boolean;
  configFormat: 'claude' | 'cursor' | 'windsurf' | 'json';
}

function banner() {
  console.log(`
${BOLD}${CYAN}╔══════════════════════════════════════════╗
║          🧠 Recall MCP Setup            ║
║    Unified AI Memory for Your Agents    ║
╚══════════════════════════════════════════╝${RESET}
`);
}

function detectAgents(): AgentConfig[] {
  const agents: AgentConfig[] = [
    {
      name: 'Claude Code',
      configPath: join(HOME, '.claude.json'),
      detected: false,
      configFormat: 'claude',
    },
    {
      name: 'Claude Desktop',
      configPath: join(HOME, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
      detected: false,
      configFormat: 'json',
    },
    {
      name: 'Cursor',
      configPath: join(HOME, '.cursor', 'mcp.json'),
      detected: false,
      configFormat: 'cursor',
    },
    {
      name: 'Windsurf',
      configPath: join(HOME, '.windsurf', 'mcp.json'),
      detected: false,
      configFormat: 'windsurf',
    },
  ];

  for (const agent of agents) {
    // Check if the app/config directory exists
    const configDir = join(agent.configPath, '..');
    if (existsSync(configDir) || existsSync(agent.configPath)) {
      agent.detected = true;
    }
  }

  return agents;
}

function buildMcpServerConfig() {
  return {
    command: 'npx',
    args: ['tsx', join(PROJECT_ROOT, 'packages', 'mcp-server', 'src', 'index.ts')],
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      SUPABASE_URL: process.env.SUPABASE_URL || '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      MOORCHEH_API_KEY: process.env.MOORCHEH_API_KEY || '',
    },
  };
}

function loadEnvFile(): Record<string, string> {
  const envPath = join(PROJECT_ROOT, '.env');
  const env: Record<string, string> = {};
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.substring(0, eqIdx);
          const value = trimmed.substring(eqIdx + 1);
          if (value) env[key] = value;
        }
      }
    }
  }
  return env;
}

function addToConfig(agent: AgentConfig): { success: boolean; message: string } {
  const envVars = loadEnvFile();
  const mcpConfig = {
    command: 'npx',
    args: ['tsx', join(PROJECT_ROOT, 'packages', 'mcp-server', 'src', 'index.ts')],
    env: {
      OPENAI_API_KEY: envVars.OPENAI_API_KEY || '',
      SUPABASE_URL: envVars.SUPABASE_URL || '',
      SUPABASE_SERVICE_ROLE_KEY: envVars.SUPABASE_SERVICE_ROLE_KEY || '',
      MOORCHEH_API_KEY: envVars.MOORCHEH_API_KEY || '',
    },
  };

  try {
    // Ensure config directory exists
    const configDir = join(agent.configPath, '..');
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    let config: Record<string, unknown> = {};
    if (existsSync(agent.configPath)) {
      const raw = readFileSync(agent.configPath, 'utf-8');
      config = JSON.parse(raw);
    }

    // Add/update mcpServers section
    if (!config.mcpServers || typeof config.mcpServers !== 'object') {
      config.mcpServers = {};
    }
    (config.mcpServers as Record<string, unknown>).recall = mcpConfig;

    writeFileSync(agent.configPath, JSON.stringify(config, null, 2) + '\n');

    return { success: true, message: `Config written to ${agent.configPath}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Failed: ${msg}` };
  }
}

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  banner();

  // Step 1: Detect system
  console.log(`${BOLD}System Info${RESET}`);
  console.log(`  ${DIM}OS:${RESET}      ${process.platform} (${process.arch})`);
  console.log(`  ${DIM}Node:${RESET}    ${process.version}`);
  console.log(`  ${DIM}Project:${RESET} ${PROJECT_ROOT}`);
  console.log();

  // Step 2: Check .env
  const envVars = loadEnvFile();
  console.log(`${BOLD}Environment${RESET}`);
  const envChecks = [
    ['OPENAI_API_KEY', envVars.OPENAI_API_KEY],
    ['SUPABASE_URL', envVars.SUPABASE_URL],
    ['SUPABASE_SERVICE_ROLE_KEY', envVars.SUPABASE_SERVICE_ROLE_KEY],
    ['MOORCHEH_API_KEY', envVars.MOORCHEH_API_KEY],
  ];

  let envOk = true;
  for (const [key, val] of envChecks) {
    if (val) {
      console.log(`  ${CHECK} ${key} ${DIM}configured${RESET}`);
    } else {
      console.log(`  ${CROSS} ${key} ${DIM}missing${RESET}`);
      envOk = false;
    }
  }

  if (!envOk) {
    console.log(`\n  ${YELLOW}⚠ Some env vars missing. Fill in .env at:${RESET}`);
    console.log(`  ${DIM}${join(PROJECT_ROOT, '.env')}${RESET}`);
    console.log(`  ${DIM}MCP tools will still register but may fail without keys.${RESET}`);
  }
  console.log();

  // Step 3: Detect agents
  console.log(`${BOLD}Detected AI Agents${RESET}`);
  const agents = detectAgents();
  const detectedAgents = agents.filter((a) => a.detected);
  const notDetected = agents.filter((a) => !a.detected);

  for (const agent of detectedAgents) {
    console.log(`  ${CHECK} ${agent.name} ${DIM}(${agent.configPath})${RESET}`);
  }
  for (const agent of notDetected) {
    console.log(`  ${DIM}  ${agent.name} — not found${RESET}`);
  }

  if (detectedAgents.length === 0) {
    console.log(`\n  ${YELLOW}No AI agents detected. Install Claude Code, Cursor, or another supported agent first.${RESET}`);
    process.exit(0);
  }

  console.log();

  // Step 4: Ask which agents to configure
  console.log(`${BOLD}Select agents to connect with Recall:${RESET}`);
  for (let i = 0; i < detectedAgents.length; i++) {
    console.log(`  ${CYAN}${i + 1}${RESET}) ${detectedAgents[i].name}`);
  }
  console.log(`  ${CYAN}a${RESET}) All detected agents`);
  console.log();

  const choice = await prompt(`${ARROW} Your choice: `);

  let selectedAgents: AgentConfig[] = [];
  if (choice.toLowerCase() === 'a') {
    selectedAgents = detectedAgents;
  } else {
    const indices = choice.split(/[,\s]+/).map(Number).filter(n => n >= 1 && n <= detectedAgents.length);
    selectedAgents = indices.map(i => detectedAgents[i - 1]);
  }

  if (selectedAgents.length === 0) {
    console.log(`\n${YELLOW}No agents selected. Exiting.${RESET}`);
    process.exit(0);
  }

  console.log();

  // Step 5: Configure each agent
  console.log(`${BOLD}Configuring Recall MCP...${RESET}\n`);
  for (const agent of selectedAgents) {
    const result = addToConfig(agent);
    if (result.success) {
      console.log(`  ${CHECK} ${agent.name} ${DIM}${result.message}${RESET}`);
    } else {
      console.log(`  ${CROSS} ${agent.name} ${DIM}${result.message}${RESET}`);
    }
  }

  // Done
  console.log(`
${GREEN}${BOLD}Setup complete!${RESET}

${BOLD}Next steps:${RESET}
  1. Start the capture engine:
     ${CYAN}npm run dev:capture${RESET}

  2. Restart your AI agent(s) to pick up the new MCP config

  3. Try asking your agent:
     ${DIM}"What was on my screen recently?"${RESET}
     ${DIM}"Search my memory for [topic]"${RESET}
     ${DIM}"Remember that the deploy key is in vault-prod"${RESET}

${DIM}Recall MCP tools: search_memory, get_recent_context, get_source_context, save_memory${RESET}
`);
}

main().catch((err) => {
  console.error(`${RED}Setup failed:${RESET}`, err);
  process.exit(1);
});
