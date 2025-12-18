import React, { useState, useRef, useEffect } from 'react';
import { Search, Book, Star, MessageCircle, X, Send, ExternalLink, Globe, Library, ShoppingBag, Heart, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Share2, Upload } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { track } from '@vercel/analytics';
import bookCatalog from './books.json';

const BOOKSHOP_AFFILIATE_ID = '119544';
const CURRENT_YEAR = new Date().getFullYear();

const STOP_WORDS = new Set([
  'a','an','and','are','as','at','be','but','by','for','from','has','have','i','if','in','into','is','it','its','me','my','of','on','or','our','s','so','that','the','their','them','then','there','these','they','this','to','was','we','were','what','when','where','which','who','why','with','you','your'
]);

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bumpLocalMetric(key, by = 1) {
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

function normalizeTitle(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAuthor(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CATALOG_TITLE_INDEX = (() => {
  const map = new Map();
  try {
    for (const b of (bookCatalog || [])) {
      const key = normalizeTitle(b?.title);
      if (!key) continue;
      if (!map.has(key)) map.set(key, b);
    }
  } catch (e) {
    void e;
  }
  return map;
})();

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

function parseGoodreadsCsv(text) {
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

function buildLibraryContext(userMessage, catalog) {
  const q = String(userMessage || '').toLowerCase();
  const tokens = tokenizeForSearch(userMessage);

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

 function FormattedText({ text }) {
   const lines = String(text || '').split('\n');
 
   const renderInlineBold = (line) => {
     const parts = String(line).split('**');
     return parts.map((part, idx) =>
       idx % 2 === 1 ? <strong key={idx}>{part}</strong> : <React.Fragment key={idx}>{part}</React.Fragment>
     );
   };
 
   return (
     <>
       {lines.map((line, idx) => (
         <React.Fragment key={idx}>
           {renderInlineBold(line)}
           {idx < lines.length - 1 && <br />}
         </React.Fragment>
       ))}
     </>
   );
 }

const themeInfo = {
  women: { emoji: "📚", label: "Women's Untold Stories", color: "bg-rose-50 text-rose-700 border-rose-200" },
  emotional: { emoji: "💔", label: "Emotional Truth", color: "bg-amber-50 text-amber-700 border-amber-200" },
  identity: { emoji: "🎭", label: "Identity & Belonging", color: "bg-violet-50 text-violet-700 border-violet-200" },
  spiritual: { emoji: "🕯", label: "Spiritual Seeking", color: "bg-teal-50 text-teal-700 border-teal-200" },
  justice: { emoji: "⚖️", label: "Invisible Injustices", color: "bg-emerald-50 text-emerald-700 border-emerald-200" }
};

// Parse structured recommendations from AI response
function parseRecommendations(text) {
  const recommendations = [];
  const lines = text.split('\n');
  let current = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('Title:')) {
      if (current) recommendations.push(current);
      current = { title: trimmed.replace('Title:', '').trim() };
    } else if (current) {
      if (trimmed.startsWith('Author:')) {
        current.author = trimmed.replace('Author:', '').trim();
      } else if (trimmed.startsWith('Why This Fits:')) {
        current.why = trimmed.replace('Why This Fits:', '').trim();
      } else if (trimmed.startsWith('Why:')) {
        current.why = trimmed.replace('Why:', '').trim();
      } else if (trimmed.startsWith('Description:')) {
        current.description = trimmed.replace('Description:', '').trim();
      } else if (trimmed.startsWith('Reputation:')) {
        current.reputation = trimmed.replace('Reputation:', '').trim();
      }
    }
  }
  
  if (current && current.title) recommendations.push(current);
  return recommendations;
}

// Check if message contains structured recommendations
function hasStructuredRecommendations(text) {
  const t = String(text || '');
  return t.includes('Title:') && (t.includes('Author:') || t.includes('Why This Fits:') || t.includes('Why:') || t.includes('Description:') || t.includes('Reputation:'));
}

function RecommendationCard({ rec, index, messageIndex }) {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  // Look up full book details from local catalog
  const catalogBook = React.useMemo(() => {
    const t = String(rec?.title || '');
    const key = normalizeTitle(t);
    if (key && CATALOG_TITLE_INDEX.has(key)) return CATALOG_TITLE_INDEX.get(key);

    // Fallback for slight title mismatches (cheap partial match)
    const needle = normalizeTitle(t);
    if (!needle) return null;
    for (const [k, b] of CATALOG_TITLE_INDEX.entries()) {
      if (k.includes(needle) || needle.includes(k)) return b;
    }
    return null;
  }, [rec?.title]);

  const handleFeedback = (type) => {
    setFeedback(type);
    track('recommendation_feedback', {
      feedback_type: type,
      message_index: messageIndex,
      recommendation_index: index,
      book_title: rec?.title || '',
      book_author: rec?.author || '',
      source: 'recommendation_card'
    });
  };
  
  const handleLinkClick = (destination) => {
    track('book_link_click', {
      book_title: rec.title,
      book_author: rec.author || '',
      destination: destination,
      source: 'recommendation_card'
    });

    if (destination === 'goodreads') {
      bumpLocalMetric('goodreads_link_clicks_v1', 1);
      track('goodreads_link_click', { source: 'recommendation_card' });
    }
    if (destination === 'bookshop') {
      bumpLocalMetric('bookshop_link_clicks_v1', 1);
      track('bookshop_link_click', { source: 'recommendation_card' });
    }
  };

  const goodreadsUrl = `https://www.goodreads.com/search?q=${encodeURIComponent(`${rec.title} ${rec.author || ''}`)}`;
  const bookshopUrl = `https://bookshop.org/search?keywords=${encodeURIComponent(`${rec.title} ${rec.author || ''}`)}&a_aid=${BOOKSHOP_AFFILIATE_ID}`;

  // Use catalog description if available, otherwise use AI-provided description
  const fullDescription = catalogBook?.description || rec.description;

  return (
    <div className="bg-[#FDFBF4] rounded-xl border border-[#D4DAD0] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-[#F5F7F2] transition-colors"
      >
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#5F7252] text-white text-xs font-medium flex items-center justify-center">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-[#4A5940] text-sm">{rec.title}</h4>
            {catalogBook?.favorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
          </div>
          {rec.author && <p className="text-xs text-[#7A8F6C]">{rec.author}</p>}
          <p className="text-xs text-[#5F7252] mt-1">{rec.why}</p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleFeedback('up'); }}
            disabled={feedback !== null}
            className={`p-1.5 rounded-lg transition-colors ${
              feedback === 'up'
                ? 'text-[#5F7252] bg-[#E8EBE4]'
                : feedback === 'down'
                ? 'text-[#D4DAD0] cursor-not-allowed'
                : 'text-[#96A888] hover:text-[#5F7252] hover:bg-[#E8EBE4]'
            }`}
            title="Helpful"
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${feedback === 'up' ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleFeedback('down'); }}
            disabled={feedback !== null}
            className={`p-1.5 rounded-lg transition-colors ${
              feedback === 'down'
                ? 'text-[#5F7252] bg-[#E8EBE4]'
                : feedback === 'up'
                ? 'text-[#D4DAD0] cursor-not-allowed'
                : 'text-[#96A888] hover:text-[#5F7252] hover:bg-[#E8EBE4]'
            }`}
            title="Not helpful"
          >
            <ThumbsDown className={`w-3.5 h-3.5 ${feedback === 'down' ? 'fill-current' : ''}`} />
          </button>
        </div>

        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[#96A888] flex-shrink-0 mt-1" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#96A888] flex-shrink-0 mt-1" />
        )}
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-[#E8EBE4]">
          <div className="pt-3 space-y-2">
            {fullDescription && (
              <p className="text-xs text-[#5F7252] leading-relaxed">{fullDescription}</p>
            )}
            {catalogBook && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {catalogBook.themes?.slice(0, 3).map(theme => (
                  <span key={theme} className="text-xs px-2 py-0.5 bg-[#E8EBE4] text-[#5F7252] rounded-full">
                    {themeInfo[theme]?.emoji} {themeInfo[theme]?.label}
                  </span>
                ))}
              </div>
            )}
            {rec.reputation && (
              <p className="text-xs text-[#7A8F6C]">
                <span className="font-medium">Reputation:</span> {rec.reputation}
              </p>
            )}
            {catalogBook && (
              <p className="text-xs text-[#96A888] italic">📚 From Sarah's Library</p>
            )}
          </div>
          
          <div className="flex gap-2 mt-3">
            <a
              href={goodreadsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleLinkClick('goodreads')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#5F7252] text-white rounded-lg text-xs hover:bg-[#4A5940] transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Goodreads
            </a>
            <a
              href={bookshopUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleLinkClick('bookshop')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#4A7C59] text-white rounded-lg text-xs hover:bg-[#3d6649] transition-colors"
            >
              <ShoppingBag className="w-3 h-3" />
              Buy Local
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function FormattedRecommendations({ text, messageIndex }) {
  const recommendations = React.useMemo(() => parseRecommendations(String(text || '')), [text]);
  
  // Extract the header (everything before the first recommendation)
  const header = React.useMemo(() => {
    const headerMatch = String(text || '').match(/^(.*?)(?=\[RECOMMENDATION|\nTitle:)/s);
    return headerMatch ? headerMatch[1].trim() : '';
  }, [text]);
  
  return (
    <div className="space-y-3">
      {header && (
        <p className="text-sm font-medium text-[#4A5940]">{header}</p>
      )}
      {recommendations.map((rec, idx) => (
        <RecommendationCard key={idx} rec={rec} index={idx} messageIndex={messageIndex} />
      ))}
    </div>
  );
}

const genres = ["All", "Literary Fiction", "Historical Fiction", "Memoir", "Self-Help & Spirituality", "Thriller & Mystery", "Romance & Contemporary", "Nonfiction"];

const genreDescriptions = {
  "Literary Fiction": "Character-driven, beautifully written novels.",
  "Historical Fiction": "Immersive stories rooted in real eras and events.",
  "Memoir": "True personal stories and lived experience.",
  "Self-Help & Spirituality": "Practical tools, inner work, and meaning-making.",
  "Thriller & Mystery": "High-stakes suspense, twists, and page-turners.",
  "Romance & Contemporary": "Modern relationships, heart, and real-life stakes.",
  "Nonfiction": "Ideas, history, culture, and learning—true and researched."
};

const getGoodreadsSearchUrl = (title, author) => {
  const searchQuery = encodeURIComponent(`${title} ${author || ''}`);
  return `https://www.goodreads.com/search?q=${searchQuery}`;
};

const getBookshopSearchUrl = (title, author) => {
  const searchQuery = encodeURIComponent(`${title} ${author || ''}`);
  return `https://bookshop.org/search?keywords=${searchQuery}&a_aid=${BOOKSHOP_AFFILIATE_ID}`;
};

const getSystemPrompt = (mode) => {
  const responseFormat = `
RESPONSE FORMAT:
When recommending books, always respond with exactly this structure:

📚 My Top 3 Picks for You

[RECOMMENDATION 1]
Title: [Book Title]
Author: [Author Name]
Why This Fits: [1-2 sentences explaining why this matches their request]
Description: [2-3 sentence description of the book]
Reputation: [Mention Goodreads rating, awards, or Indie Next List recognition if notable]

[RECOMMENDATION 2]
...same format...

[RECOMMENDATION 3]
...same format...

Keep responses concise. Be direct and helpful.`;

  const qualityGuidelines = `
Be specific about WHY each book matches their request. If vague, ask one clarifying question first.`;

  if (mode === 'library') {
    return `You are Sarah, a book curator sharing recommendations from your personal library.
${responseFormat}
${qualityGuidelines}

IMPORTANT: Only recommend books from the provided LIBRARY SHORTLIST (included in the user's message). If asked about books not listed, offer to switch to "Discover New" mode.`;
  } else {
    return `You are Sarah, a book curator helping discover new reads.

Your taste: women's stories, emotional truth, identity, spirituality, justice.
${responseFormat}
${qualityGuidelines}

Prioritize: Goodreads 4.0+, award winners, Indie Next picks, staff favorites.

When asked for "best books of the year" or new releases, treat the current year as ${CURRENT_YEAR} unless the user specifies a different year. Prefer the best books of ${CURRENT_YEAR}.`;
  }
};

function BookDetail({ book, onClose }) {
  const handleLinkClick = (destination) => {
    track('book_link_click', {
      book_title: book.title,
      book_author: book.author,
      book_genre: book.genre,
      is_favorite: book.favorite || false,
      destination: destination,
      source: 'book_detail'
    });

    if (destination === 'goodreads') {
      bumpLocalMetric('goodreads_link_clicks_v1', 1);
      track('goodreads_link_click', { source: 'book_detail' });
    }
    if (destination === 'bookshop') {
      bumpLocalMetric('bookshop_link_clicks_v1', 1);
      track('bookshop_link_click', { source: 'book_detail' });
    }
  };

  const goodreadsUrl = getGoodreadsSearchUrl(book.title, book.author);
  const bookshopUrl = getBookshopSearchUrl(book.title, book.author);

  return (
    <div className="fixed inset-0 bg-[#4A5940]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-[#FDFBF4] rounded-3xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-[#D4DAD0]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="font-serif text-2xl text-[#4A5940]">{book.title}</h2>
                {book.favorite && <Star className="w-5 h-5 text-amber-400 fill-amber-400" />}
              </div>
              <p className="text-[#7A8F6C] font-light">{book.author}</p>
            </div>
            <button onClick={onClose} className="text-[#96A888] hover:text-[#4A5940] transition-colors p-1">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="mb-5">
            <span className="text-xs text-[#7A8F6C] font-medium uppercase tracking-wider">Genre</span>
            <div className="mt-1">
              <span className="inline-block px-4 py-1.5 bg-[#E8EBE4] text-[#4A5940] text-sm rounded-full font-medium">
                {book.genre}
              </span>
            </div>
          </div>
          
          <p className="text-[#5F7252] leading-relaxed mb-6">{book.description}</p>
          
          <div className="mb-6">
            <span className="text-xs text-[#7A8F6C] font-medium uppercase tracking-wider">Themes</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {book.themes.map(theme => (
                <span 
                  key={theme} 
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border ${themeInfo[theme]?.color}`}
                >
                  {themeInfo[theme]?.emoji} {themeInfo[theme]?.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a 
              href={goodreadsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => handleLinkClick('goodreads')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#5F7252] text-white rounded-xl hover:bg-[#4A5940] transition-colors font-medium text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Find on Goodreads
            </a>
            <a 
              href={bookshopUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => handleLinkClick('bookshop')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#4A7C59] text-white rounded-xl hover:bg-[#3d6649] transition-colors font-medium text-sm"
            >
              <ShoppingBag className="w-4 h-4" />
              Buy Local 🌱
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatSearchBox({ onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = (destination) => {
    if (!searchTerm.trim()) return;
    
    track('book_link_click', {
      book_title: searchTerm,
      book_author: '',
      book_genre: 'unknown',
      is_favorite: false,
      destination: destination,
      source: 'chat_search'
    });

    if (destination === 'goodreads') {
      bumpLocalMetric('goodreads_link_clicks_v1', 1);
      track('goodreads_link_click', { source: 'chat_search' });
    }
    if (destination === 'bookshop') {
      bumpLocalMetric('bookshop_link_clicks_v1', 1);
      track('bookshop_link_click', { source: 'chat_search' });
    }

    const url = destination === 'goodreads' 
      ? getGoodreadsSearchUrl(searchTerm, '')
      : getBookshopSearchUrl(searchTerm, '');
    window.open(url, '_blank');
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Enter book title..."
          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#D4DAD0] focus:border-[#96A888] outline-none text-[#4A5940] placeholder-[#96A888]"
        />
        <button
          onClick={onClose}
          className="px-2 py-1.5 text-[#96A888] hover:text-[#4A5940] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleSearch('goodreads')}
          disabled={!searchTerm.trim()}
          className="flex-1 px-3 py-1.5 bg-[#5F7252] text-white rounded-lg text-xs hover:bg-[#4A5940] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          Goodreads
        </button>
        <button
          onClick={() => handleSearch('bookshop')}
          disabled={!searchTerm.trim()}
          className="flex-1 px-3 py-1.5 bg-[#4A7C59] text-white rounded-lg text-xs hover:bg-[#3d6649] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
        >
          <ShoppingBag className="w-3 h-3" />
          Buy Local
        </button>
      </div>
    </div>
  );
}

function ChatMessage({ message, isUser, showSearchOption, messageIndex }) {
  const [showSearch, setShowSearch] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const isStructured = !isUser && hasStructuredRecommendations(message);

  const handleFeedback = (type) => {
    setFeedback(type);
    track('recommendation_feedback', {
      feedback_type: type,
      message_index: messageIndex,
      message_preview: message.substring(0, 100)
    });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <img 
          src="/sarah.png" 
          alt="Sarah"
          className="w-10 h-10 rounded-full object-cover mr-3 border-2 border-[#D4DAD0] flex-shrink-0"
        />
      )}
      <div className="flex flex-col max-w-[85%]">
        <div className={`rounded-2xl px-5 py-3 ${
          isUser 
            ? 'bg-[#5F7252] text-white rounded-br-sm' 
            : 'bg-white text-[#4A5940] rounded-bl-sm border border-[#D4DAD0]'
        }`}>
          {isStructured ? (
            <FormattedRecommendations text={message} messageIndex={messageIndex} />
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {!isUser ? <FormattedText text={message} /> : message}
            </p>
          )}
        </div>
        
        {!isUser && showSearchOption && !isStructured && (
          <div className="mt-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleFeedback('up')}
                  disabled={feedback !== null}
                  className={`p-1.5 rounded-lg transition-colors ${
                    feedback === 'up'
                      ? 'text-[#5F7252] bg-[#E8EBE4]'
                      : feedback === 'down'
                      ? 'text-[#D4DAD0] cursor-not-allowed'
                      : 'text-[#96A888] hover:text-[#5F7252] hover:bg-[#E8EBE4]'
                  }`}
                  title="Helpful"
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${feedback === 'up' ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={() => handleFeedback('down')}
                  disabled={feedback !== null}
                  className={`p-1.5 rounded-lg transition-colors ${
                    feedback === 'down'
                      ? 'text-[#5F7252] bg-[#E8EBE4]'
                      : feedback === 'up'
                      ? 'text-[#D4DAD0] cursor-not-allowed'
                      : 'text-[#96A888] hover:text-[#5F7252] hover:bg-[#E8EBE4]'
                  }`}
                  title="Not helpful"
                >
                  <ThumbsDown className={`w-3.5 h-3.5 ${feedback === 'down' ? 'fill-current' : ''}`} />
                </button>
                {feedback && (
                  <span className="text-xs text-[#96A888] ml-1">Thanks!</span>
                )}
              </div>
              
              {!isStructured && (
                <>
                  <div className="w-px h-4 bg-[#D4DAD0]" />
                  
                  {!showSearch && (
                    <button
                      onClick={() => setShowSearch(true)}
                      className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-[#7A8F6C] hover:text-[#5F7252] transition-colors"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Find this book...
                    </button>
                  )}
                </>
              )}
            </div>
            
            {showSearch && !isStructured && (
              <ChatSearchBox onClose={() => setShowSearch(false)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AboutSection({ onShare }) {
  return (
    <div className="mb-6 sm:mb-8 bg-white rounded-2xl p-6 sm:p-8 border border-[#D4DAD0] shadow-sm">
      <div className="flex items-start gap-4 sm:gap-6">
        <div className="hidden sm:block flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-[#E8EBE4] flex items-center justify-center">
            <Heart className="w-8 h-8 text-[#5F7252]" />
          </div>
        </div>
        <div>
          <h3 className="font-serif text-lg sm:text-xl text-[#4A5940] mb-3">Why I Built This</h3>
          <div className="space-y-2.5 text-xs sm:text-sm text-[#5F7252] leading-relaxed">
            <p>
              I've always been the friend people call when they need a book recommendation. "Something that'll make me feel deeply," they say. Or "I need to escape but not too far." I get it—finding the right book at the right moment is a small kind of magic ✨.
            </p>
            <p>
              So I built this: a digital version of my bookshelves, searchable and powered by AI that knows my taste. It's a living library that grows as I read, with a discovery engine to help us both find what's next. And when you're ready to buy, I hope you'll support a local bookstore—they're the heartbeat of our communities.
            </p>
            <p className="text-[#7A8F6C] italic">
              Happy reading, friend. 📚
            </p>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="text-xs text-[#7A8F6C] font-light">
              Love this library? Share it with a friend.
            </div>
            <button
              onClick={onShare}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#5F7252] text-white text-sm font-medium hover:bg-[#4A5940] transition-colors w-full sm:w-auto"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('chat');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [chatMode, setChatMode] = useState('library');
  const [expandedGenres, setExpandedGenres] = useState({});
  const [genreShowAll, setGenreShowAll] = useState({});
  const [importedLibrary, setImportedLibrary] = useState(null);
  const [importError, setImportError] = useState('');
  const [messages, setMessages] = useState([
    { text: "Hi! I'm Sarah, and this is my personal library. 📚 I'd love to help you find your next read. Tell me what you're in the mood for, or ask me anything about these books—I've read them all!", isUser: false }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);
  const inFlightRequestRef = useRef(null);
  const importFileInputRef = useRef(null);
  const [shareFeedback, setShareFeedback] = useState('');
  const shareFeedbackTimeoutRef = useRef(null);
  const [feedbackStatus, setFeedbackStatus] = useState({
    isSendingThanks: false,
  });
  const [thanksCount, setThanksCount] = useState(null);
  const thanksCooldownRef = useRef(false);
  const hasHydratedChatRef = useRef(false);
  const chatStorageKey = 'sarah_books_chat_history_v1';

  const getInitialMessagesForMode = (mode) => {
    if (mode === 'discover') {
      return [{
        text: "Let's discover something new! 🌍 I'll recommend books from beyond my personal collection. Tell me what you're in the mood for—a specific genre, theme, or vibe—and I'll suggest some titles you might love.",
        isUser: false
      }];
    }
    return [{
      text: "Hi! I'm Sarah, and this is my personal library. 📚 I'd love to help you find your next read. Tell me what you're in the mood for, or ask me anything about these books—I've read them all!",
      isUser: false
    }];
  };

  const systemPrompt = React.useMemo(() => getSystemPrompt(chatMode), [chatMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('imported_goodreads_library_v1');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items)) {
        setImportedLibrary(parsed);
      }
    } catch (e) {
      void e;
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(chatStorageKey);
      if (!raw) {
        hasHydratedChatRef.current = true;
        return;
      }
      const parsed = JSON.parse(raw);
      const mode = parsed?.mode === 'discover' ? 'discover' : 'library';
      const byMode = parsed?.byMode && typeof parsed.byMode === 'object' ? parsed.byMode : {};

      const restored = Array.isArray(byMode?.[mode]) ? byMode[mode] : null;
      if (restored && restored.length) {
        setChatMode(mode);
        setMessages(restored);
      } else {
        setChatMode(mode);
        setMessages(getInitialMessagesForMode(mode));
      }
    } catch (e) {
      void e;
    } finally {
      hasHydratedChatRef.current = true;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetch('/api/thanks')
      .then(r => r.json())
      .then(data => {
        if (!alive) return;
        const n = Number(data?.count);
        if (Number.isFinite(n)) setThanksCount(n);
      })
      .catch((e) => {
        void e;
      });
    return () => { alive = false; };
  }, []);


  useEffect(() => {
    if (!hasHydratedChatRef.current) return;
    try {
      const raw = window.localStorage.getItem(chatStorageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      const byMode = parsed?.byMode && typeof parsed.byMode === 'object' ? parsed.byMode : {};
      const restored = Array.isArray(byMode?.[chatMode]) ? byMode[chatMode] : null;
      if (restored && restored.length) {
        setMessages(restored);
      } else {
        setMessages(getInitialMessagesForMode(chatMode));
      }
    } catch (e) {
      void e;
      setMessages(getInitialMessagesForMode(chatMode));
    }
  }, [chatMode]);

  useEffect(() => {
    if (!hasHydratedChatRef.current) return;
    try {
      const raw = window.localStorage.getItem(chatStorageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      const byMode = parsed?.byMode && typeof parsed.byMode === 'object' ? parsed.byMode : {};

      const capped = Array.isArray(messages) ? messages.slice(-50) : [];
      const next = {
        mode: chatMode,
        byMode: {
          ...byMode,
          [chatMode]: capped,
        },
      };
      window.localStorage.setItem(chatStorageKey, JSON.stringify(next));
    } catch (e) {
      void e;
    }
  }, [messages, chatMode]);

  const filteredBooks = bookCatalog.filter(book => {
    if (selectedGenre !== 'All' && book.genre !== selectedGenre) return false;
    if (selectedTheme && !book.themes.includes(selectedTheme)) return false;
    if (showFavoritesOnly && !book.favorite) return false;
    return true;
  });

  const importedOverlap = React.useMemo(() => {
    const imported = importedLibrary?.items;
    if (!Array.isArray(imported) || imported.length === 0) return { total: 0, shared: [] };

    const libByTitle = new Map();
    const libByTitleAuthor = new Map();

    for (const b of bookCatalog) {
      const t = normalizeTitle(b?.title);
      const a = normalizeAuthor(b?.author);
      if (!t) continue;
      if (!libByTitle.has(t)) libByTitle.set(t, b);
      if (a) libByTitleAuthor.set(`${t}__${a}`, b);
    }

    const shared = [];
    const seen = new Set();
    for (const it of imported) {
      const t = normalizeTitle(it?.title);
      const a = normalizeAuthor(it?.author);
      if (!t) continue;
      const key = a ? `${t}__${a}` : t;
      if (seen.has(key)) continue;

      const match = (a && libByTitleAuthor.get(`${t}__${a}`)) || libByTitle.get(t);
      if (match) {
        shared.push(match);
        seen.add(key);
      }
    }

    return { total: imported.length, shared };
  }, [importedLibrary]);

  const handleImportGoodreadsCsv = async (file) => {
    setImportError('');
    if (!file) return;
    try {
      const text = await file.text();
      const items = parseGoodreadsCsv(text);
      if (!items.length) {
        setImportError('Could not find any books in that CSV. Make sure it is a Goodreads library export.');
        return;
      }

      const localTotal = bumpLocalMetric('goodreads_books_uploaded_total_v1', items.length);
      track('goodreads_csv_upload', {
        books_uploaded: items.length,
        total_books_uploaded_local: localTotal
      });

      const payload = {
        source: 'goodreads_csv',
        importedAt: Date.now(),
        items
      };
      setImportedLibrary(payload);
      window.localStorage.setItem('imported_goodreads_library_v1', JSON.stringify(payload));
    } catch (e) {
      void e;
      setImportError('Could not read that file. Please try exporting your Goodreads library again.');
    }
  };

  const handleClearImport = () => {
    try { window.localStorage.removeItem('imported_goodreads_library_v1'); } catch (e) { void e; }
    setImportedLibrary(null);
    setImportError('');
  };

  const toggleGenreShowAll = (genre) => {
    setGenreShowAll(prev => ({
      ...prev,
      [genre]: !prev?.[genre]
    }));
  };

  const booksByGenre = filteredBooks.reduce((acc, book) => {
    const g = book.genre || 'Other';
    if (!acc[g]) acc[g] = [];
    acc[g].push(book);
    return acc;
  }, {});

  const genreOrder = (selectedGenre !== 'All')
    ? [selectedGenre]
    : genres.filter(g => g !== 'All');

  const visibleGenres = genreOrder.filter(g => (booksByGenre[g] || []).length > 0);

  const toggleGenreExpanded = (genre) => {
    setExpandedGenres(prev => ({
      ...prev,
      [genre]: !prev?.[genre]
    }));
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setIsLoading(true);

    track('chat_message', {
      mode: chatMode,
      message_length: userMessage.length
    });

    let timeoutId;
    try {
      // Abort any in-flight request (e.g., rapid successive sends).
      if (inFlightRequestRef.current) {
        try { inFlightRequestRef.current.abort(); } catch (e) { void e; }
      }
      const controller = new AbortController();
      inFlightRequestRef.current = controller;
      timeoutId = setTimeout(() => {
        try { controller.abort(); } catch (e) { void e; }
      }, 25000);

      const chatHistory = messages
        .filter(m => m.isUser !== undefined)
        .slice(-6)
        .map(m => ({
          role: m.isUser ? 'user' : 'assistant',
          content: m.text
        }));

      const userContent = chatMode === 'library'
        ? `LIBRARY SHORTLIST:\n${buildLibraryContext(userMessage, bookCatalog)}\n\nUSER REQUEST:\n${userMessage}`
        : (() => {
            if (!importedLibrary?.items?.length) return userMessage;
            const owned = importedLibrary.items.slice(0, 40).map(b => `- ${b.title}${b.author ? ` — ${b.author}` : ''}`).join('\n');
            return `USER LIBRARY (imported):\n${owned}\n\nIMPORTANT: Avoid recommending books the user already owns.\n\nUSER REQUEST:\n${userMessage}`;
          })();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          system: systemPrompt,
          messages: [
            ...chatHistory,
            { role: 'user', content: userContent }
          ]
        })
      });

      const data = await response.json();
      const assistantMessage = data.content?.[0]?.text || "I'm having trouble thinking right now. Could you try again?";
      setMessages(prev => [...prev, { text: assistantMessage, isUser: false }]);
    } catch (error) {
      const isAbort = error?.name === 'AbortError';
      if (!isAbort) {
        setMessages(prev => [...prev, { 
          text: "Oops, I'm having a moment. Let me catch my breath and try again!", 
          isUser: false 
        }]);
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      inFlightRequestRef.current = null;
      setIsLoading(false);
    }
  };

  const suggestionChips = chatMode === 'library' 
    ? ["What's your favorite book?", "Something about strong women", "I need a good cry"]
    : ["Best books of 2025", "Hidden gems like Kristin Hannah", "Something completely different"];

  const handleShare = async () => {
    const url = (typeof window !== 'undefined' && window.location?.href) ? window.location.href : '';
    const title = "Sarah Books";
    const text = "I thought you’d like Sarah’s Library — ask for book recommendations from her shelves.";

    track('share_click', { source: view });

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title, text, url });
        track('share_success', { method: 'web_share', source: view });
        setShareFeedback('Shared!');
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        track('share_success', { method: 'clipboard', source: view });
        setShareFeedback('Link copied!');
      } else {
        // Last-resort fallback: prompt copy.
        window.prompt('Copy this link to share:', url);
        track('share_success', { method: 'prompt', source: view });
        setShareFeedback('Link ready to copy.');
      }
    } catch (e) {
      void e;
      track('share_error', { source: view });
      setShareFeedback('Couldn’t share—try copying the URL.');
    } finally {
      if (shareFeedbackTimeoutRef.current) clearTimeout(shareFeedbackTimeoutRef.current);
      shareFeedbackTimeoutRef.current = setTimeout(() => setShareFeedback(''), 2500);
    }
  };

  const handleSendHeart = () => {
    const url = (typeof window !== 'undefined' && window.location?.href) ? window.location.href : '';
    if (feedbackStatus.isSendingThanks) return;
    if (thanksCooldownRef.current) return;
    thanksCooldownRef.current = true;
    setTimeout(() => { thanksCooldownRef.current = false; }, 1200);

    track('thanks_heart_click', { source: view });
    track('thanks_heart_send', { method: 'backend', source: view });

    setThanksCount(prev => (typeof prev === 'number' ? prev + 1 : prev));
    fetch('/api/thanks', { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        const n = Number(data?.count);
        if (Number.isFinite(n)) setThanksCount(n);
      })
      .catch((e) => {
        void e;
      });

    void url;
    setFeedbackStatus(s => ({ ...s, isSendingThanks: true }));
    setTimeout(() => setFeedbackStatus(s => ({ ...s, isSendingThanks: false })), 700);
  };

  return (
    <div className="min-h-screen font-sans" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)', fontFamily: "'Poppins', sans-serif" }}>
      <Analytics />
      <header className="bg-[#FDFBF4]/90 backdrop-blur-md border-b border-[#D4DAD0] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <img 
                src="/sarah.png" 
                alt="Sarah" 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-[#D4DAD0] shadow-sm"
              />
              <div>
                <h1 className="font-serif text-xl sm:text-2xl text-[#4A5940]">Sarah Books</h1>
                <p className="text-xs text-[#7A8F6C] font-light tracking-wide hidden sm:block">A Curated Collection of Infinite Possibilities</p>
                <p className="text-xs text-[#7A8F6C] font-light tracking-wide sm:hidden">A Curated Collection of Infinite Possibilities</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {shareFeedback && (
                <div className="hidden sm:block text-xs text-[#7A8F6C] font-light">
                  {shareFeedback}
                </div>
              )}

              <button
                onClick={handleSendHeart}
                disabled={feedbackStatus.isSendingThanks}
                className="hidden sm:inline-flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-full bg-[#FDFBF4] border border-[#D4DAD0] text-[#5F7252] hover:text-[#4A5940] hover:border-[#96A888] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                title="Say thanks"
              >
                <span className="hidden sm:inline ml-2 text-sm font-medium">
                  Thanks ❤️{typeof thanksCount === 'number' ? ` ${thanksCount}` : ''}
                </span>
              </button>

              <button
                onClick={handleShare}
                className="hidden sm:inline-flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-full bg-white border border-[#D4DAD0] text-[#5F7252] hover:text-[#4A5940] hover:border-[#96A888] transition-all"
                title="Share this page"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline ml-2 text-sm font-medium">Share</span>
              </button>

              <div className="flex bg-[#E8EBE4] rounded-full p-1 sm:p-1.5">
              <button
                onClick={() => setView('chat')}
                className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-sm font-medium transition-all ${
                  view === 'chat' 
                    ? 'bg-white text-[#4A5940] shadow-sm' 
                    : 'text-[#5F7252] hover:text-[#4A5940]'
                }`}
              >
                <span className="hidden sm:inline">Ask Sarah</span>
                <MessageCircle className="w-4 h-4 sm:hidden" />
              </button>
              <button
                onClick={() => setView('browse')}
                className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-sm font-medium transition-all ${
                  view === 'browse' 
                    ? 'bg-white text-[#4A5940] shadow-sm' 
                    : 'text-[#5F7252] hover:text-[#4A5940]'
                }`}
              >
                <span className="hidden sm:inline">Browse</span>
                <Book className="w-4 h-4 sm:hidden" />
              </button>
            </div>
            </div>
          </div>
        </div>
      </header>

      {view === 'browse' ? (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="mb-6 sm:mb-8 rounded-2xl overflow-hidden shadow-lg relative">
            <div className="bg-[#FDFBF4]">
              <img
                src="/books.jpg"
                alt="Stack of books"
                className="block w-full h-[clamp(140px,18vh,220px)] object-cover object-center"
              />
            </div>
            <div className="bg-white/80 backdrop-blur-sm border-t border-[#E8EBE4]">
              <div className="px-5 sm:px-8 py-4">
                <h2 className="text-[#4A5940] font-serif text-xl sm:text-3xl mb-1 sm:mb-2">My Personal Collection</h2>
                <p className="text-[#7A8F6C] text-xs sm:text-sm font-light">Find your next great read.</p>
              </div>
            </div>
          </div>

          <AboutSection onShare={handleShare} />

          <div className="mb-6 sm:mb-8 space-y-4 sm:space-y-5">
            <div className="flex flex-wrap gap-4 sm:gap-6 items-start">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#7A8F6C] font-medium uppercase tracking-wider">Genre</label>
                <select
                  value={selectedGenre}
                  onChange={e => setSelectedGenre(e.target.value)}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white rounded-xl border border-[#D4DAD0] text-sm focus:border-[#96A888] outline-none text-[#5F7252] font-medium min-w-[160px] sm:min-w-[180px]"
                >
                  {genres.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#7A8F6C] font-medium uppercase tracking-wider">Curator Themes</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(themeInfo).map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedTheme(selectedTheme === key ? null : key)}
                      className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-sm transition-all font-medium flex items-center gap-1.5 ${
                        selectedTheme === key
                          ? 'bg-[#5F7252] text-white shadow-md'
                          : 'bg-white border border-[#D4DAD0] text-[#5F7252] hover:border-[#96A888]'
                      }`}
                      title={info.label}
                    >
                      <span>{info.emoji}</span>
                      <span className="hidden md:inline text-xs">{info.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#7A8F6C] font-medium uppercase tracking-wider">Show</label>
                <button
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all font-medium ${
                    showFavoritesOnly
                      ? 'bg-amber-100 text-amber-700 border border-amber-300'
                      : 'bg-white border border-[#D4DAD0] text-[#5F7252] hover:border-[#96A888]'
                  }`}
                >
                  <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
                  <span className="hidden sm:inline">Favorites Only</span>
                  <span className="sm:hidden">Favorites</span>
                </button>
              </div>
            </div>
          </div>

          <p className="text-sm text-[#7A8F6C] mb-4 sm:mb-6 font-light">
            Showing {filteredBooks.length} of {bookCatalog.length} books
          </p>

          <div className="space-y-5 sm:space-y-6">
            {visibleGenres.map((genre) => {
              const list = booksByGenre[genre] || [];
              const isCollapsed = !!expandedGenres?.[genre];
              const showAll = !!genreShowAll?.[genre];
              const shown = isCollapsed ? [] : (showAll ? list : list.slice(0, 8));

              return (
                <div key={genre} className="bg-white rounded-2xl border border-[#D4DAD0] shadow-sm overflow-hidden">
                  <div className="px-5 sm:px-6 py-4 flex items-center justify-between border-b border-[#E8EBE4] bg-[#FDFBF4]">
                    <div>
                      <h3 className="font-serif text-lg text-[#4A5940]">
                        {genre}{' '}
                        <span className="text-sm text-[#7A8F6C] font-light">({list.length})</span>
                      </h3>
                      {genreDescriptions[genre] && (
                        <p className="text-xs text-[#7A8F6C] font-light">{genreDescriptions[genre]}</p>
                      )}
                    </div>
                    {list.length > 0 && (
                      <button
                        onClick={() => toggleGenreExpanded(genre)}
                        className="text-xs font-medium text-[#5F7252] hover:text-[#4A5940] transition-colors"
                      >
                        {isCollapsed ? `Expand (${list.length})` : 'Collapse'}
                      </button>
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="px-5 sm:px-6 py-4">
                      <div className="space-y-2">
                        {shown.map((book) => (
                          <button
                            key={`${book.title}__${book.author}`}
                            onClick={() => setSelectedBook(book)}
                            className="w-full text-left rounded-xl border border-[#E8EBE4] bg-[#FDFBF4] px-4 py-3 hover:bg-[#F5F7F2] hover:border-[#D4DAD0] transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-[#4A5940] truncate">{book.title}</span>
                                  {book.favorite && (
                                    <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                                  )}
                                </div>
                                <span className="block text-xs text-[#7A8F6C] font-light truncate">{book.author}</span>
                              </div>
                              {!!book.themes?.length && (
                                <span className="text-xs text-[#96A888] flex-shrink-0">
                                  {book.themes.slice(0, 3).map(t => themeInfo[t]?.emoji).filter(Boolean).join(' ')}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>

                      {list.length > 8 && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleGenreShowAll(genre)}
                            className="text-xs font-medium text-[#5F7252] hover:text-[#4A5940] transition-colors"
                          >
                            {showAll ? 'See less' : `See more (${list.length - 8} more)`}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredBooks.length === 0 && (
            <div className="text-center py-16">
              <Book className="w-16 h-16 text-[#D4DAD0] mx-auto mb-4" />
              <p className="text-[#96A888] font-light">No books match your filters</p>
            </div>
          )}

          <div className="mt-8 sm:mt-10 text-xs text-[#7A8F6C] font-light text-center">
            <div>For the ❤️ of reading.</div>
            <div className="mt-1">hello@sarahsbooks.com</div>
          </div>
        </main>
      ) : (
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 h-[calc(100vh-80px)] sm:h-[calc(100vh-100px)] flex flex-col">
          <div className="mb-4 flex justify-center">
            <div className="w-full max-w-sm bg-[#E8EBE4] rounded-2xl p-1 border border-[#D4DAD0] shadow-sm">
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setChatMode('library')}
                  className={`w-full px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                    chatMode === 'library'
                      ? 'bg-white text-[#4A5940] shadow-sm'
                      : 'text-[#5F7252] hover:text-[#4A5940] hover:bg-white/60'
                  }`}
                >
                  <Library className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  My Library
                </button>
                <button
                  onClick={() => setChatMode('discover')}
                  className={`w-full px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                    chatMode === 'discover'
                      ? 'bg-white text-[#4A5940] shadow-sm'
                      : 'text-[#5F7252] hover:text-[#4A5940] hover:bg-white/60'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Discover New
                </button>
              </div>
            </div>
          </div>

          <div className="mb-3 flex justify-center sm:hidden">
            <div className="w-full max-w-sm flex items-center justify-between gap-2">
              <button
                onClick={handleSendHeart}
                disabled={feedbackStatus.isSendingThanks}
                className="inline-flex items-center justify-center flex-1 px-3 py-2 rounded-xl bg-[#FDFBF4] border border-[#D4DAD0] text-[#5F7252] hover:text-[#4A5940] hover:border-[#96A888] transition-all text-xs font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                title="Say thanks"
              >
                <span className="ml-2">Thanks ❤️{typeof thanksCount === 'number' ? ` ${thanksCount}` : ''}</span>
              </button>

              <button
                onClick={handleShare}
                className="inline-flex items-center justify-center flex-1 px-3 py-2 rounded-xl bg-white border border-[#D4DAD0] text-[#5F7252] hover:text-[#4A5940] hover:border-[#96A888] transition-all text-xs font-medium"
                title="Share this page"
              >
                <Share2 className="w-4 h-4" />
                <span className="ml-2">Share</span>
              </button>
            </div>
          </div>

          {messages.length <= 2 && (
            <div className="mb-4 sm:mb-6 rounded-2xl overflow-hidden shadow-lg relative">
              <div className="bg-[#FDFBF4]">
                <img
                  src="/books.jpg"
                  alt="Open book on desk"
                  className="block w-full h-[clamp(120px,16vh,220px)] object-cover object-center"
                />
              </div>
              <div className="bg-white/80 backdrop-blur-sm border-t border-[#E8EBE4]">
                <div className="px-5 sm:px-8 py-4">
                  <h2 className="text-[#4A5940] font-serif text-base sm:text-xl mb-1 leading-snug break-words">
                    {chatMode === 'library' ? 'Ask About My Books' : 'Discover Something New'}
                  </h2>
                  <p className="text-[#7A8F6C] text-xs sm:text-sm font-light">
                    {chatMode === 'library' ? 'Ask for a recommendation from my shelves.' : 'Get recommendations beyond my personal collection.'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto pb-4">
            {messages.map((msg, idx) => (
              <ChatMessage 
                key={idx} 
                message={msg.text} 
                isUser={msg.isUser} 
                showSearchOption={!msg.isUser && idx > 0}
                messageIndex={idx}
              />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <img 
                  src="/sarah.png" 
                  alt="Sarah"
                  className="w-10 h-10 rounded-full object-cover mr-3 border-2 border-[#D4DAD0] flex-shrink-0"
                />
                <div className="bg-white rounded-2xl rounded-bl-sm px-5 py-3 border border-[#D4DAD0]">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-[#96A888] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-[#96A888] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-[#96A888] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="bg-white rounded-2xl border border-[#D4DAD0] shadow-lg p-2 flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me for a recommendation..."
              className="flex-1 px-3 sm:px-4 py-2 sm:py-3 outline-none text-[#4A5940] placeholder-[#96A888] font-light text-sm sm:text-base"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="px-4 sm:px-5 py-2 sm:py-3 bg-[#5F7252] text-white rounded-xl hover:bg-[#4A5940] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
            {suggestionChips.map(suggestion => (
              <button
                key={suggestion}
                onClick={() => setInputValue(suggestion)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-[#D4DAD0] rounded-full text-xs text-[#5F7252] hover:border-[#96A888] hover:text-[#4A5940] transition-all font-medium"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="mt-3 sm:mt-4 w-full rounded-xl border border-dashed border-[#D4DAD0] bg-[#FDFBF4] px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0 text-xs sm:text-sm font-light text-[#7A8F6C] truncate flex items-center gap-2">
              <Library className="w-4 h-4 text-[#96A888] flex-shrink-0" />
              {importError ? (
                <span className="text-red-700">{importError}</span>
              ) : (
                <>
                  Upload a Goodreads CSV to avoid repeats and see what we share.
                  {importedLibrary?.items?.length ? (
                    <>
                      {' '}Imported <span className="font-medium text-[#4A5940]">{importedOverlap.total}</span> · Shared{' '}
                      <span className="font-medium text-[#4A5940]">{importedOverlap.shared.length}</span>
                    </>
                  ) : null}
                </>
              )}
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {importedLibrary?.items?.length ? (
                <button
                  onClick={handleClearImport}
                  className="text-xs font-medium text-[#7A8F6C] hover:text-[#4A5940] transition-colors"
                >
                  Clear
                </button>
              ) : null}

              <button
                onClick={() => { setImportError(''); importFileInputRef.current?.click(); }}
                className="inline-flex items-center gap-2 text-xs font-medium text-[#5F7252] hover:text-[#4A5940] transition-colors"
              >
                <Upload className="w-4 h-4" />
                {importedLibrary?.items?.length ? 'Replace CSV' : 'Upload CSV'}
              </button>
              <input
                ref={importFileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  handleImportGoodreadsCsv(f);
                }}
              />
            </div>
          </div>

          <div className="mt-6 text-xs text-[#7A8F6C] font-light text-center">
            <div>For the ❤️ of reading.</div>
            <div className="mt-1">hello@sarahsbooks.com</div>
          </div>

        </main>
      )}

      {selectedBook && (
        <BookDetail book={selectedBook} onClose={() => setSelectedBook(null)} />
      )}

    </div>
  );
}
