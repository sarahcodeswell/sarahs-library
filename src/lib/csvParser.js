// CSV parsing utilities for Goodreads import

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
