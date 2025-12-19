const STOP_WORDS = new Set([
  'a','an','and','are','as','at','be','but','by','for','from','has','have','i','if','in','into','is','it','its','me','my','of','on','or','our','s','so','that','the','their','them','then','there','these','they','this','to','was','we','were','what','when','where','which','who','why','with','you','your'
]);

export function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function bumpLocalMetric(key, by = 1) {
  const inc = safeNumber(by, 1);
  let next = inc;
  try {
    const cur = safeNumber(window.localStorage.getItem(key), 0);
    next = cur + inc;
    window.localStorage.setItem(key, String(next));
  } catch (e) {
    void e;
  }
  return next;
}

function tokenizeForSearch(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(Boolean)
    .filter(t => !STOP_WORDS.has(t));
}

export function normalizeTitle(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeAuthor(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function parseGoodreadsCsv(text) {
  const raw = String(text || '').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]).map(h => String(h || '').trim());
  const idxTitle = headers.findIndex(h => h.toLowerCase() === 'title');
  const idxAuthor = headers.findIndex(h => h.toLowerCase() === 'author' || h.toLowerCase() === 'author l-f');
  if (idxTitle < 0) return [];

  const items = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const title = String(cols[idxTitle] || '').trim();
    const author = idxAuthor >= 0 ? String(cols[idxAuthor] || '').trim() : '';
    if (!title) continue;
    items.push({ title, author });
  }
  return items;
}

export function buildLibraryContext(userMessage, catalog) {
  const q = String(userMessage || '').toLowerCase();
  const tokens = tokenizeForSearch(userMessage);

  const scored = (catalog || []).map((b, idx) => {
    const title = String(b.title || '');
    const author = String(b.author || '');
    const genre = String(b.genre || '');
    const themes = Array.isArray(b.themes) ? b.themes : [];
    const description = String(b.description || '');

    const titleLc = title.toLowerCase();
    const authorLc = author.toLowerCase();
    const genreLc = genre.toLowerCase();
    const descLc = description.toLowerCase();
    const themesLc = themes.map(t => String(t || '').toLowerCase());

    let score = 0;
    if (q && titleLc.includes(q)) score += 18;
    if (q && authorLc.includes(q)) score += 10;
    if (q && descLc.includes(q)) score += 6;

    for (const t of tokens) {
      if (titleLc.includes(t)) score += 6;
      if (authorLc.includes(t)) score += 4;
      if (genreLc.includes(t)) score += 3;
      if (themesLc.includes(t)) score += 3;
      if (descLc.includes(t)) score += 1;
    }

    if (b.favorite) score += 0.75;

    return { book: b, score, idx };
  });

  scored.sort((a, b) => (b.score - a.score) || (a.idx - b.idx));

  const favorites = scored.filter(s => s.book?.favorite).slice(0, 12).map(s => s.book);
  const topMatches = scored.slice(0, 24).map(s => s.book);

  const picked = [];
  const seen = new Set();
  const add = (b) => {
    const key = `${String(b?.title || '').toLowerCase()}|${String(b?.author || '').toLowerCase()}`;
    if (!key || seen.has(key)) return;
    seen.add(key);
    picked.push(b);
  };
  favorites.forEach(add);
  topMatches.forEach(add);
  for (const s of scored) {
    if (picked.length >= 28) break;
    add(s.book);
  }

  const formatBookLine = (b, includeDescription) => {
    const title = String(b.title || '').trim();
    const author = String(b.author || '').trim();
    const genre = String(b.genre || '').trim();
    const themes = Array.isArray(b.themes) && b.themes.length ? ` themes: ${b.themes.join(', ')}` : '';
    const fav = b.favorite ? ' ⭐' : '';

    if (!includeDescription) {
      return `- "${title}" by ${author} [${genre}]${themes}${fav}`;
    }

    const desc = String(b.description || '').trim();
    const short = desc.length > 120 ? `${desc.slice(0, 117)}…` : desc;
    return `- "${title}" by ${author} [${genre}]${themes}${fav} — ${short}`;
  };

  const header = `Shortlisted books from Sarah's library (shown: ${picked.length} / total: ${(catalog || []).length}).`;
  const lines = picked.map((b, i) => formatBookLine(b, i < 10));
  return [header, ...lines].join('\n');
}
