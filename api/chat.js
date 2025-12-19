export const config = {
    runtime: 'edge',
  };
  
  export default async function handler(req) {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  
    try {
      const body = await req.json();

      const apiKey = globalThis?.process?.env?.ANTHROPIC_API_KEY;

      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'prompt-caching-2024-07-31'
        },
        body: JSON.stringify(body)
      });

      const text = await response.text();

      return new Response(text, {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      void error;
      return new Response(JSON.stringify({ error: 'Failed to fetch from API' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }