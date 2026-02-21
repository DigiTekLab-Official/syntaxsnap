// src/pages/api/generate-mock.ts
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { prompt, rowCount = 5 } = await request.json();

    if (rowCount < 1 || rowCount > 100) {
      return new Response(JSON.stringify({ error: 'Max 100 rows allowed.' }), { status: 400 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        temperature: 0.8,
        messages: [
          { role: 'system', content: 'Generate mock data. Output ONLY JSON with a "mockData" array.' },
          { role: 'user', content: `Generate ${rowCount} records: ${prompt}` }
        ]
      })
    });

    const data = await response.json();

    // NEW: Check if OpenAI explicitly returned an API error (like billing/quota issues)
    if (data.error) {
       console.error("OpenAI API Error:", data.error);
       return new Response(JSON.stringify({ error: `OpenAI: ${data.error.message}` }), { status: 500 });
    }

    const content = JSON.parse(data.choices[0].message.content);

    if (!content.mockData) throw new Error('AI returned invalid format');

    return new Response(JSON.stringify(content.mockData), { status: 200 });
  } catch (error: any) {
    // Now it will pass through real code errors too
    console.error("Backend Error:", error);
    return new Response(JSON.stringify({ error: error.message || 'Generation Failed' }), { status: 500 });
  }
};