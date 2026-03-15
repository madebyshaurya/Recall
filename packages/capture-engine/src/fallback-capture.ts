import { execFileSync } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';

const SCREENSHOT_PATH = '/tmp/recall-capture.png';

export function captureScreen(): string {
  execFileSync('screencapture', ['-x', SCREENSHOT_PATH]);
  const base64 = readFileSync(SCREENSHOT_PATH).toString('base64');
  try { unlinkSync(SCREENSHOT_PATH); } catch {}
  return base64;
}

export function getActiveWindow(): { title: string; app: string } {
  try {
    const script = `
      tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
        set frontWindow to ""
        try
          set frontWindow to name of front window of (first application process whose frontmost is true)
        end try
        return frontApp & "|" & frontWindow
      end tell
    `;
    const result = execFileSync('osascript', ['-e', script], {
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();

    const [app, title] = result.split('|');
    return { app: app || 'Unknown', title: title || '' };
  } catch {
    return { app: 'Unknown', title: '' };
  }
}
