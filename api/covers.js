import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const COVER_KEY_PREFIX = 'cover_v1:';

function buildCoverUrlFromCoverId(coverId) {
  // -M gives a decent thumbnail; -L is large.
  return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
}

export default async function handler(req) {
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(req.url);
  const title = url.searchParams.get('title') || '';
  const author = url.searchParams.get('author') || '';

  const t = normalize(title);
  const a = normalize(author);
  if (!t) return json({ ok: false, error: 'Missing title' }, 400);

  const key = `${COVER_KEY_PREFIX}${t}::${a}`;

  try {
    const cached = await kv.get(key);
    if (cached && typeof cached === 'object') {
      return json({ ok: true, ...cached, cached: true });
    }
  } catch (e) {
    void e;
    // If KV isn't configured, continue as best-effort.
  }

  try {
    const searchUrl = new URL('https://openlibrary.org/search.json');
    searchUrl.searchParams.set('title', title);
    if (author) searchUrl.searchParams.set('author', author);
    searchUrl.searchParams.set('limit', '5');

    const resp = await fetch(searchUrl.toString(), {
      headers: { 'User-Agent': 'SarahBooks/1.0 (cover lookup)' },
    });

    if (!resp.ok) {
      return json({ ok: false, error: 'Open Library lookup failed' }, 502);
    }

    const data = await resp.json();
    const docs = Array.isArray(data?.docs) ? data.docs : [];

    let coverId = null;
    let olid = null;

    for (const d of docs) {
      if (Number.isFinite(d?.cover_i)) {
        coverId = d.cover_i;
        break;
      }
      if (Array.isArray(d?.edition_key) && d.edition_key.length) {
        olid = d.edition_key[0];
      }
    }

    const result = coverId
      ? { coverId, coverUrl: buildCoverUrlFromCoverId(coverId) }
      : { coverId: null, coverUrl: null, olid: olid || null };

    try {
      // Cache for 180 days.
      await kv.set(key, result, { ex: 180 * 24 * 60 * 60 });
    } catch (e) {
      void e;
    }

    return json({ ok: true, ...result, cached: false });
  } catch (e) {
    void e;
    return json({ ok: false, error: 'Failed to lookup cover' }, 500);
  }
}
