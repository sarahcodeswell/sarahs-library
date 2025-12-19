import process from 'node:process';

export const config = {
    runtime: 'nodejs',
  };

  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  
  export default async function handler(req) {
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }
  
    try {
      const body = await req.json();

      const apiKey = process?.env?.ANTHROPIC_API_KEY;

      if (!apiKey) {
        return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
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
      let parsed;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch (e) {
        void e;
        parsed = null;
      }

      if (!response.ok) {
        const msg = String(
          parsed?.error?.message ||
          parsed?.error ||
          parsed?.message ||
          text ||
          response.statusText ||
          'Upstream error'
        ).trim();
        return json({ error: msg, status: response.status }, response.status);
      }

      // Success: proxy through JSON as-is.
      return new Response(text, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      void error;
      return json({ error: 'Failed to fetch from API' }, 500);
    }
  }