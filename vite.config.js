import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Make env vars available to the dev server middleware.
  for (const [k, v] of Object.entries(env)) {
    if (typeof v === 'string') process.env[k] = v;
  }

  let thanksCount = 0;

  const apiDevMiddleware = () => ({
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          if (!req?.url?.startsWith('/api/')) return next();

          if (req.url.startsWith('/api/thanks')) {
            res.setHeader('Content-Type', 'application/json');
            if (req.method === 'GET') {
              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true, count: thanksCount }));
              return;
            }
            if (req.method === 'POST') {
              thanksCount += 1;
              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true, count: thanksCount }));
              return;
            }
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          if (req.url.startsWith('/api/chat')) {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            const apiKey = process.env.ANTHROPIC_API_KEY;
            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }));
              return;
            }

            const rawBody = await new Promise((resolve, reject) => {
              let data = '';
              req.on('data', (chunk) => { data += chunk; });
              req.on('end', () => resolve(data));
              req.on('error', reject);
            });

            const body = rawBody ? JSON.parse(rawBody) : {};
            const upstream = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-beta': 'prompt-caching-2024-07-31',
              },
              body: JSON.stringify(body),
            });

            const text = await upstream.text();
            res.statusCode = upstream.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(text);
            return;
          }

          return next();
        } catch (_e) {
          void _e;
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Dev API middleware error' }));
        }
      });
    },
  });

  return {
    plugins: [react(), apiDevMiddleware()],
  };
});
