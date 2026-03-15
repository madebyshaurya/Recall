import '../../../packages/shared/src/config.js'; // Load env
import { isScreenpipeRunning, getLatestCaptures } from './screenpipe.js';
import { captureScreen, getActiveWindow } from './fallback-capture.js';
import { processCapture } from './pipeline.js';
import { initMoorchehNamespaces } from '../../../packages/shared/src/moorcheh.js';
import { startAgentWatcher } from './agent-watcher.js';
import { startSuggestionLoop } from './suggestions.js';

const WINDOW_POLL_INTERVAL = 2000;    // Check window title every 2s
const FALLBACK_CAPTURE_INTERVAL = 60000; // Force capture every 60s
const IDLE_TIMEOUT = 120000;           // Pause after 2min idle

let lastWindowTitle = '';
let lastCaptureTime = 0;
let captureCount = 0;
let useScreenpipe = false;

async function captureAndProcess() {
  const now = Date.now();
  const window = getActiveWindow();
  const tag = `[${new Date().toLocaleTimeString()}]`;

  console.log(`${tag} [screen] Capturing: "${window.app} — ${window.title}"`);

  try {
    if (useScreenpipe) {
      // Use screenpipe's latest OCR data
      const since = new Date(lastCaptureTime || now - 60000);
      const frames = await getLatestCaptures(since);

      if (frames.length > 0) {
        for (const frame of frames) {
          const memory = await processCapture({
            text: frame.text,
            source: 'screen',
            metadata: {
              app_name: frame.app_name,
              window_title: frame.window_name,
              capture_method: 'screenpipe',
            },
          });
          if (memory) {
            captureCount++;
            console.log(`${tag} [screen] ✓ Stored (screenpipe): ${memory.content.substring(0, 80)}...`);
          }
        }
      }
    } else {
      // Fallback: take screenshot + describe with vision
      const imageBase64 = captureScreen();
      const memory = await processCapture({
        imageBase64,
        source: 'screen',
        metadata: {
          app_name: window.app,
          window_title: window.title,
          capture_method: 'fallback',
        },
      });
      if (memory) {
        captureCount++;
        console.log(`${tag} [screen] ✓ Stored: ${memory.content.substring(0, 80)}...`);
      }
    }
  } catch (err) {
    console.error(`${tag} [screen] Error:`, err instanceof Error ? err.message : err);
  }

  lastCaptureTime = now;
}

async function main() {
  console.log('\n🧠 Recall Capture Engine Starting...\n');

  // Check if screenpipe is available
  useScreenpipe = await isScreenpipeRunning();
  if (useScreenpipe) {
    console.log('✓ Screenpipe detected — using screenpipe for capture');
  } else {
    console.log('⚠ Screenpipe not detected — using fallback (screencapture + gpt-4.1-nano vision)');
  }

  // Initialize Moorcheh namespaces
  await initMoorchehNamespaces().catch((err) => {
    console.log('⚠ Moorcheh init failed (non-blocking):', err instanceof Error ? err.message : err);
  });

  console.log(`  Window poll: every ${WINDOW_POLL_INTERVAL / 1000}s`);
  console.log(`  Fallback capture: every ${FALLBACK_CAPTURE_INTERVAL / 1000}s`);
  console.log(`  Idle timeout: ${IDLE_TIMEOUT / 1000}s`);
  // Start AI agent session watcher
  startAgentWatcher();

  // Start proactive suggestions (every 5 min)
  startSuggestionLoop(300000);

  console.log('\nCapturing...\n');

  // Initial capture
  await captureAndProcess();

  // Hybrid capture loop: event-driven (window change) + time-based fallback
  setInterval(async () => {
    const window = getActiveWindow();
    const currentTitle = `${window.app}|${window.title}`;
    const timeSinceLastCapture = Date.now() - lastCaptureTime;

    // Event-driven: window/app changed
    if (currentTitle !== lastWindowTitle) {
      lastWindowTitle = currentTitle;
      await captureAndProcess();
      return;
    }

    // Time-based fallback: capture if it's been too long
    if (timeSinceLastCapture >= FALLBACK_CAPTURE_INTERVAL) {
      await captureAndProcess();
      return;
    }
  }, WINDOW_POLL_INTERVAL);

  // Status log every 5 minutes
  setInterval(() => {
    console.log(`\n📊 Status: ${captureCount} memories captured so far\n`);
  }, 300000);
}

main().catch(console.error);
