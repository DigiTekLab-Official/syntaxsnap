// src/pages/api/generate-mock.ts
import type { APIRoute } from 'astro';

export const prerender = false;

/** Maximum character length accepted for the user prompt */
const MAX_PROMPT_LENGTH = 4000;

/** Abort OpenAI requests that take longer than this */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Strip control characters and truncate prompt to prevent:
 *  - Null-byte injection
 *  - Role-injection via newline sequences (e.g. "\n\nSystem: ...")
 *  - Oversized payloads from reaching the AI provider
 */
function sanitizePrompt(raw: string): string {
  return raw
    // eslint-disable-next-line no-control-regex -- intentional: strip control chars for security
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .slice(0, MAX_PROMPT_LENGTH)
    .trim();
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const rawPrompt: string = typeof body.prompt === 'string' ? body.prompt : '';
    const rowCount: unknown = body.rowCount ?? 5;

    if (!rawPrompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required.' }), { status: 400 });
    }

    const prompt = sanitizePrompt(rawPrompt);
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is empty after sanitization.' }), { status: 400 });
    }

    if (typeof rowCount !== 'number' || !Number.isInteger(rowCount) || rowCount < 1 || rowCount > 100) {
      return new Response(JSON.stringify({ error: 'Row count must be an integer between 1 and 100.' }), { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          temperature: 0.8,
          messages: [
            { role: 'system', content: 'Generate mock data. Output ONLY JSON with a "mockData" array.' },
            { role: 'user', content: `Generate ${rowCount} records: ${prompt}` },
          ],
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json();

    if (data.error) {
      // Log only the error type/code, never the user prompt, to avoid data leakage in logs
      console.error('OpenAI API Error type:', data.error.type ?? 'unknown');
      return new Response(
        JSON.stringify({ error: 'AI service returned an error. Please try again.' }),
        { status: 502 },
      );
    }

    const content = JSON.parse(data.choices[0].message.content);
    if (!content.mockData) throw new Error('AI returned invalid format');

    return new Response(JSON.stringify(content.mockData), { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(
        JSON.stringify({ error: 'Request timed out. Please try again.' }),
        { status: 504 },
      );
    }
    // Log only the error class name — never the message, which might echo user input
    console.error('Backend Error class:', error instanceof Error ? error.constructor.name : 'UnknownError');
    return new Response(JSON.stringify({ error: 'Generation failed. Please try again.' }), { status: 500 });
  }
};