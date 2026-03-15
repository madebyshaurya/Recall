import { config } from '../../../packages/shared/src/config.js';

export interface ScreenpipeFrame {
  text: string;
  app_name: string;
  window_name: string;
  timestamp: string;
  file_path?: string;
}

export async function isScreenpipeRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${config.screenpipe.apiUrl}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function getLatestCaptures(since: Date): Promise<ScreenpipeFrame[]> {
  try {
    const params = new URLSearchParams({
      content_type: 'ocr',
      start_time: since.toISOString(),
      limit: '5',
    });

    const response = await fetch(
      `${config.screenpipe.apiUrl}/search?${params.toString()}`
    );

    if (!response.ok) return [];

    const data = await response.json() as { data?: Array<{ content: { text: string; app_name: string; window_name: string; timestamp: string; file_path?: string } }> };
    return (data.data || []).map((item: { content: ScreenpipeFrame }) => ({
      text: item.content.text,
      app_name: item.content.app_name,
      window_name: item.content.window_name,
      timestamp: item.content.timestamp,
      file_path: item.content.file_path,
    }));
  } catch {
    return [];
  }
}
