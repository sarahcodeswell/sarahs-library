// Library context builder for AI recommendations
import { tokenizeForSearch } from './textUtils';

/**
 * Build a context string of relevant books from the catalog for AI recommendations
 */
export function buildLibraryContext(userMessage, catalog, readingQueue = [], favoriteAuthors = []) {
  const q = String(userMessage || '').toLowerCase();
  const tokens = tokenizeForSearch(userMessage);

  // Extract user preferences from finished books
  const finishedBooks = readingQueue.filter(item => item.status === 'finished');
  const finishedTitles = new Set(finishedBooks.map(item => 
    String(item.book_title || '').toLowerCase().trim()
  ));
  
  if (import.meta.env.DEV) {
    console.log('[Recommendations] Building library context');
    console.log('[Recommendations] Finished books count:', finishedBooks.length);
    console.log('[Recommendations] Finished titles to exclude:', Array.from(finishedTitles));
    console.log('[Recommendations] Favorite authors:', favoriteAuthors);
  }
  
  // Collect themes, genres, and authors from finished books for preference boosting
  const preferredThemes = new Set();
  const preferredGenres = new Set();
  const preferredAuthors = new Set();
  
  // Add user's explicitly favorite authors
  favoriteAuthors.forEach(author => {
    preferredAuthors.add(String(author || '').toLowerCase());
  });
  
  finishedBooks.forEach(item => {
    const matchingBook = catalog.find(b => 
      String(b.title || '').toLowerCase().trim() === String(item.book_title || '').toLowerCase().trim()
    );
    if (matchingBook) {
      if (matchingBook.genre) preferredGenres.add(String(matchingBook.genre).toLowerCase());
      if (Array.isArray(matchingBook.themes)) {
        matchingBook.themes.forEach(t => preferredThemes.add(String(t).toLowerCase()));
      }
      if (matchingBook.author) preferredAuthors.add(String(matchingBook.author).toLowerCase());
    }
  });

  // Score books by simple lexical overlap. This is intentionally cheap and deterministic.
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

    // Skip books the user has already finished
    if (finishedTitles.has(titleLc.trim())) {
      if (import.meta.env.DEV) {
        console.log('[Recommendations] Excluding finished book:', title);
      }
      return { book: b, score: -1000, idx }; // Exclude finished books
    }

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
    
    // Boost books matching user's reading preferences
    if (preferredGenres.has(genreLc)) score += 2;
    if (preferredAuthors.has(authorLc)) score += 3;
    themesLc.forEach(theme => {
      if (preferredThemes.has(theme)) score += 1.5;
    });

    return { book: b, score, idx };
  });

  scored.sort((a, b) => (b.score - a.score) || (a.idx - b.idx));

  // Keep this shortlist small: it is sent to the model per request.
  // Always include some favorites for breadth, plus top matches for relevance.
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
  // Ensure we provide enough options even for vague queries.
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
