import { watch } from 'chokidar';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join, basename } from 'path';
import { processCapture } from './pipeline.js';

const HOME = homedir();
const CLAUDE_PROJECTS_DIR = join(HOME, '.claude', 'projects');

// Track which lines we've already processed per file
const filePositions = new Map<string, number>();

function parseClaudeConversation(filePath: string): Array<{ role: string; content: string; timestamp: string }> {
  const lastPosition = filePositions.get(filePath) || 0;
  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n').filter(Boolean);

  // Only process new lines
  const newLines = lines.slice(lastPosition);
  filePositions.set(filePath, lines.length);

  const turns: Array<{ role: string; content: string; timestamp: string }> = [];

  for (const line of newLines) {
    try {
      const entry = JSON.parse(line);

      // Extract user messages
      if (entry.type === 'user' && entry.message?.content) {
        const content = typeof entry.message.content === 'string'
          ? entry.message.content
          : JSON.stringify(entry.message.content);

        // Skip very short or system messages
        if (content.length > 20 && !content.startsWith('/')) {
          turns.push({
            role: 'user',
            content: content.substring(0, 500), // Cap length
            timestamp: entry.timestamp || new Date().toISOString(),
          });
        }
      }

      // Extract assistant text responses (not tool calls)
      if (entry.type === 'assistant' && entry.message?.content) {
        const textParts = Array.isArray(entry.message.content)
          ? entry.message.content
              .filter((c: { type: string }) => c.type === 'text')
              .map((c: { text: string }) => c.text)
              .join('\n')
          : '';

        if (textParts.length > 30) {
          turns.push({
            role: 'assistant',
            content: textParts.substring(0, 500),
            timestamp: entry.timestamp || new Date().toISOString(),
          });
        }
      }
    } catch {
      // Skip unparseable lines
    }
  }

  return turns;
}

async function ingestConversationTurns(filePath: string) {
  const turns = parseClaudeConversation(filePath);
  const sessionId = basename(filePath, '.jsonl');

  for (const turn of turns) {
    const prefix = turn.role === 'user' ? '[User]' : '[Assistant]';
    await processCapture({
      text: `${prefix} ${turn.content}`,
      source: 'claude_code',
      metadata: {
        role: turn.role,
        session_id: sessionId,
        file_path: filePath,
      },
    });
  }

  if (turns.length > 0) {
    console.log(`[agent] Ingested ${turns.length} turns from Claude Code session ${sessionId.substring(0, 8)}...`);
  }
}

export function startAgentWatcher() {
  console.log('[agent] Watching Claude Code sessions...');

  const watcher = watch(`${CLAUDE_PROJECTS_DIR}/**/*.jsonl`, {
    persistent: true,
    ignoreInitial: false, // Process existing files on startup
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 500,
    },
  });

  watcher.on('add', (path) => {
    ingestConversationTurns(path).catch((err) => {
      console.error('[agent] Error processing file:', err instanceof Error ? err.message : err);
    });
  });

  watcher.on('change', (path) => {
    ingestConversationTurns(path).catch((err) => {
      console.error('[agent] Error processing file:', err instanceof Error ? err.message : err);
    });
  });

  return watcher;
}
