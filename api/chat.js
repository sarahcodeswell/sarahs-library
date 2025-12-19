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
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        try { controller.abort(); } catch (e) { void e; }
      }, 20000);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'prompt-caching-2024-07-31'
        },
        signal: controller.signal,
        body: JSON.stringify(body)
      });

      clearTimeout(timeoutId);

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
      const isAbort = error?.name === 'AbortError';
      if (isAbort) {
        return json({ error: 'Upstream request timed out', status: 504 }, 504);
      }
      void error;
      return json({ error: 'Failed to fetch from API' }, 500);
    }
  }