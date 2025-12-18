import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const THANKS_COUNT_KEY = 'thanks_count_v1';

function getClientIp(req) {
  const xf = req?.headers?.get?.('x-forwarded-for') || '';
  // x-forwarded-for can be a list: client, proxy1, proxy2
  return String(xf).split(',')[0].trim() || 'unknown';
}

function dayKey() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

export default async function handler(req) {
  if (req.method === 'GET') {
    try {
      const cur = await kv.get(THANKS_COUNT_KEY);
      const count = Number(cur) || 0;
      return json({ ok: true, count });
    } catch (e) {
      void e;
      return json({ ok: false, error: 'KV not configured' }, 500);
    }
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const ip = getClientIp(req);

    // Lightweight abuse protection: max 1 increment per IP per day.
    const rateKey = `thanks_rate_v1:${dayKey()}:${ip}`;
    const already = await kv.get(rateKey);
    if (already) {
      const cur = await kv.get(THANKS_COUNT_KEY);
      const count = Number(cur) || 0;
      return json({ ok: true, count, rate_limited: true });
    }

    const count = await kv.incr(THANKS_COUNT_KEY);
    // Keep rate keys for 36 hours to cover time zones.
    await kv.set(rateKey, '1', { ex: 36 * 60 * 60 });

    return json({ ok: true, count });
  } catch (e) {
    void e;
    return json({ ok: false, error: 'KV not configured' }, 500);
  }
}
