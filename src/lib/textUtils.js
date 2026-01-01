// Text processing utilities for search and normalization

export const STOP_WORDS = new Set([
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

export function tokenizeForSearch(text) {
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
