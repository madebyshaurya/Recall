import OpenAI from 'openai';
import { config } from './config.js';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

const SYSTEM_PROMPT = `You are a screen content analyzer. Describe what's visible on the screen concisely. Include:
- The application name and what the user appears to be doing
- Any visible text, code, or content (summarize, don't transcribe everything)
- Diagrams, images, or visual elements if present
- The broader context of the work being done
Keep it under 150 words. Focus on semantic meaning, not pixel-level details.`;

export async function describeScreenshot(imageBase64: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-nano',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${imageBase64}`,
              detail: 'low',
            },
          },
        ],
      },
    ],
    max_tokens: 300,
  });
  return response.choices[0].message.content || 'Unable to describe screenshot';
}
