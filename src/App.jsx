import React, { useState, useRef, useEffect } from 'react';
import { Book, Star, MessageCircle, X, Send, ExternalLink, Library, ShoppingBag, Heart, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Share2, Upload, Plus, User as UserIcon } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { track } from '@vercel/analytics';
import bookCatalog from './books.json';
import { auth, db } from './lib/supabase';
import AuthModal from './components/AuthModal';
import UserProfile from './components/UserProfile';

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

const themeDescriptions = {
  women: 'Women-led lives, resilience, sisterhood.',
  emotional: 'Heartbreak, healing, and catharsis.',
  identity: 'Belonging, reinvention, selfhood.',
  spiritual: 'Meaning, faith, inner work.',
  justice: 'Systems, power, and what’s unseen.',
};

// Parse structured recommendations from AI response
function parseRecommendations(text) {
  const recommendations = [];
  const lines = text.split('\n');
  let current = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip lines that contain [RECOMMENDATION X] or **RECOMMENDATION X** markers
    if (trimmed.match(/\[RECOMMENDATION\s+\d+\]/i) || trimmed.match(/\*\*RECOMMENDATION\s+\d+\*\*/i)) {
      continue;
    }
    
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
        // Start collecting description
        current.description = trimmed.replace('Description:', '').trim();
      } else if (trimmed.startsWith('Reputation:')) {
        current.reputation = trimmed.replace('Reputation:', '').trim();
      } else if (current.description && !trimmed.startsWith('Title:') && !trimmed.startsWith('[RECOMMENDATION')) {
        // Continue appending to description if we're in the middle of one
        // and the line isn't a new field
        current.description += ' ' + trimmed;
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

function RecommendationCard({ rec, chatMode, isSelected, onToggleSelect }) {
  const [expanded, setExpanded] = useState(false);
  
  // Look up full book details from local catalog
  const catalogBook = React.useMemo(() => {
    if (chatMode === 'discover') return null;
    const t = String(rec?.title || '');
    const key = normalizeTitle(t);
    if (key && CATALOG_TITLE_INDEX.has(key)) return CATALOG_TITLE_INDEX.get(key);

    // Fallback for slight title mismatches (cheap partial match).
    const needle = normalizeTitle(t);
    if (!needle) return null;
    for (const [k, b] of CATALOG_TITLE_INDEX.entries()) {
      if (k.includes(needle) || needle.includes(k)) return b;
    }
    return null;
  }, [rec.title, chatMode]);

  const displayAuthor = String(rec?.author || catalogBook?.author || '').trim();
  const displayWhy = String(rec?.why || '').trim() || (() => {
    const d = String(catalogBook?.description || '').trim();
    if (!d) return '';
    return d.length > 140 ? `${d.slice(0, 137)}…` : d;
  })();

  // Use catalog description if available, otherwise use AI-provided description
  const fullDescription = catalogBook?.description || rec.description;

  return (
    <div className="bg-[#FDFBF4] rounded-xl border border-[#D4DAD0] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-[#F5F7F2] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-[#4A5940] text-sm">{rec.title}</h4>
            {catalogBook?.favorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
            {chatMode === 'library' && catalogBook && <span className="text-xs text-[#96A888] italic">📚</span>}
            {chatMode === 'discover' && <span className="text-xs text-[#96A888] italic">∞</span>}
          </div>
          {displayAuthor && <p className="text-xs text-[#7A8F6C]">{displayAuthor}</p>}
          {displayWhy && <p className="text-xs text-[#5F7252] mt-1">{displayWhy}</p>}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleSelect) onToggleSelect(rec);
            }}
            className="p-1.5 rounded-lg hover:bg-[#E8EBE4] transition-colors"
            title={isSelected ? "Remove from selection" : "Add to selection"}
          >
            <Heart className={`w-4 h-4 transition-colors ${
              isSelected 
                ? 'fill-[#5F7252] text-[#5F7252]' 
                : 'text-[#96A888] hover:text-[#5F7252]'
            }`} />
          </button>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-[#96A888] flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#96A888] flex-shrink-0" />
          )}
        </div>
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
            {chatMode === 'library' && catalogBook && (
              <p className="text-xs text-[#96A888] italic">📚 From Sarah's Library</p>
            )}
            {chatMode === 'discover' && (
              <p className="text-xs text-[#96A888] italic">∞ All Books</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RecommendationActionPanel({ recommendations, selectedBooks, onFeedback, onFindBook, onDiscoverMore, onUploadLibrary, chatMode }) {
  const [userFeedback, setUserFeedback] = useState(null);
  
  // Use selected books if any, otherwise use all recommendations
  const booksToUse = selectedBooks.length > 0 ? selectedBooks : recommendations;
  const hasSelection = selectedBooks.length > 0;
  
  const handleFeedback = (type) => {
    setUserFeedback(type);
    if (onFeedback) onFeedback(type, booksToUse);
  };
  
  return (
    <div className="mt-4 space-y-3">
      {/* Show selection indicator if books are selected */}
      {hasSelection && !userFeedback && (
        <div className="px-4 py-2 bg-[#F8F6EE] rounded-lg border border-[#E8EBE4] text-center">
          <p className="text-xs text-[#7A8F6C]">
            {selectedBooks.length} book{selectedBooks.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}
      
      {/* Step 1: Get feedback */}
      {!userFeedback && (
        <div className="px-4 py-3 bg-gradient-to-r from-[#F8F6EE] to-[#F5EFDC] rounded-xl border border-[#E8EBE4] text-center">
          <p className="text-sm text-[#5F7252] mb-3 font-medium">
            {hasSelection ? 'What did you think of your selection?' : 'What did you think?'}
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => handleFeedback('like')}
              className="flex-1 max-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5F7252] text-white rounded-lg text-sm font-medium hover:bg-[#4A5940] transition-colors"
            >
              <ThumbsUp className="w-4 h-4" />
              I like {hasSelection ? 'these' : 'them'}
            </button>
            <button
              onClick={() => handleFeedback('dislike')}
              className="flex-1 max-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-[#E8EBE4] text-[#5F7252] rounded-lg text-sm font-medium hover:bg-[#F8F6EE] transition-colors"
            >
              <ThumbsDown className="w-4 h-4" />
              Not quite
            </button>
          </div>
        </div>
      )}
      
      {/* Step 2: Next actions (after positive feedback) */}
      {userFeedback === 'like' && (
        <div className="px-4 py-3 bg-gradient-to-r from-[#F8F6EE] to-[#F5EFDC] rounded-xl border border-[#E8EBE4] text-center">
          <p className="text-sm text-[#5F7252] mb-3 font-medium">
            💚 Great! What's next?
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onFindBook && onFindBook('goodreads', booksToUse)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5F7252] text-white rounded-lg text-sm font-medium hover:bg-[#4A5940] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Find {hasSelection ? 'These' : 'Them'} on Goodreads
            </button>
            <button
              onClick={() => onFindBook && onFindBook('bookshop', booksToUse)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#4A7C59] text-white rounded-lg text-sm font-medium hover:bg-[#3d6649] transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              Buy {hasSelection ? 'These' : 'Them'} Locally
            </button>
            {chatMode === 'library' && (
              <button
                onClick={() => onDiscoverMore && onDiscoverMore(booksToUse)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-[#5F7252] text-[#5F7252] rounded-lg text-sm font-medium hover:bg-[#F8F6EE] transition-colors"
              >
                ✨ Show Me More Like These
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Step 3: After negative feedback - teach about personalization */}
      {userFeedback === 'dislike' && (
        <div className="px-4 py-3 bg-gradient-to-r from-[#F8F6EE] to-[#F5EFDC] rounded-xl border border-[#E8EBE4]">
          <p className="text-sm text-[#5F7252] mb-3 text-center font-medium">Let's find what you're looking for!</p>
          <p className="text-xs text-[#7A8F6C] mb-3 text-center">This might not have worked because:</p>
          <ul className="text-xs text-[#7A8F6C] mb-3 space-y-1 text-left max-w-[280px] mx-auto">
            <li>• You've already read these</li>
            <li>• I need more info about your taste</li>
            <li>• My library is too small (~200 books)</li>
          </ul>
          <p className="text-sm text-[#5F7252] mb-3 text-center font-medium">Upload your Goodreads library:</p>
          <ul className="text-xs text-[#7A8F6C] mb-3 space-y-1 text-left max-w-[280px] mx-auto">
            <li>✓ Skip books you've already read</li>
            <li>✓ I'll learn your preferences</li>
            <li>✓ Unlock personalized world search</li>
            <li>✓ See our book overlap %</li>
          </ul>
          <button
            onClick={() => onUploadLibrary && onUploadLibrary()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5F7252] text-white rounded-lg text-sm font-medium hover:bg-[#4A5940] transition-colors mb-2"
          >
            <Upload className="w-4 h-4" />
            Upload Goodreads CSV
          </button>
          <p className="text-xs text-[#96A888] text-center">Or try being more specific about what you're looking for</p>
        </div>
      )}
    </div>
  );
}

function FormattedRecommendations({ text, chatMode, onActionPanelInteraction }) {
  const recommendations = React.useMemo(() => parseRecommendations(String(text || '')), [text]);
  const [selectedBooks, setSelectedBooks] = useState([]);
  
  // Extract the header (everything before the first recommendation)
  const header = React.useMemo(() => {
    const headerMatch = String(text || '').match(/^(.*?)(?=\[RECOMMENDATION|\nTitle:)/s);
    let headerText = headerMatch ? headerMatch[1].trim() : '';
    // Remove any **RECOMMENDATION X** markers from the header
    headerText = headerText.replace(/\*\*RECOMMENDATION\s+\d+\*\*/gi, '').trim();
    return headerText;
  }, [text]);
  
  const handleToggleSelect = (book) => {
    setSelectedBooks(prev => {
      const exists = prev.some(b => b.title === book.title);
      if (exists) {
        return prev.filter(b => b.title !== book.title);
      } else {
        return [...prev, book];
      }
    });
  };
  
  const isBookSelected = (book) => {
    return selectedBooks.some(b => b.title === book.title);
  };
  
  return (
    <div className="space-y-3">
      {header && (
        <p className="text-sm font-medium text-[#4A5940]">{header}</p>
      )}
      {recommendations.map((rec, idx) => (
        <RecommendationCard 
          key={idx} 
          rec={rec} 
          chatMode={chatMode}
          isSelected={isBookSelected(rec)}
          onToggleSelect={handleToggleSelect}
        />
      ))}
      
      {/* Action panel appears after recommendations */}
      {recommendations.length > 0 && onActionPanelInteraction && (
        <RecommendationActionPanel 
          recommendations={recommendations}
          selectedBooks={selectedBooks}
          chatMode={chatMode}
          onFeedback={(type, recs) => onActionPanelInteraction('feedback', type, recs)}
          onFindBook={(destination, recs) => onActionPanelInteraction('find_book', destination, recs)}
          onDiscoverMore={(recs) => onActionPanelInteraction('discover_more', null, recs)}
          onUploadLibrary={() => onActionPanelInteraction('upload_library', null, recommendations)}
        />
      )}
    </div>
  );
}

const getBookshopSearchUrl = (title, author) => {
  const searchQuery = encodeURIComponent(`${title} ${author || ''}`);
  return `https://bookshop.org/search?keywords=${searchQuery}&a_aid=${BOOKSHOP_AFFILIATE_ID}`;
};

const getGoodreadsSearchUrl = (title, author) => {
  const searchQuery = encodeURIComponent(`${title} ${author || ''}`);
  return `https://www.goodreads.com/search?q=${searchQuery}`;
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

IMPORTANT: The UI that displays your recommendations ONLY works if you follow the RESPONSE FORMAT exactly.
Do NOT output a numbered list or bullet list of titles.
Each recommendation MUST include a line that starts with "Title:".
You MUST return exactly 3 recommendations (no fewer), chosen ONLY from the provided LIBRARY SHORTLIST.
If the user's request is vague, still return 3 solid picks, then ask 1 short clarifying question at the very end (after the 3 recommendations).

IMPORTANT: Only recommend books from the provided LIBRARY SHORTLIST (included in the user's message). If asked about books not listed, offer to switch to "Discover New" mode.`;
  } else {
    return `You are Sarah, a book curator helping discover new reads.

Your taste: women's stories, emotional truth, identity, spirituality, justice.
${responseFormat}
${qualityGuidelines}

IMPORTANT: The UI that displays your recommendations ONLY works if you follow the RESPONSE FORMAT exactly.
Do NOT output a numbered list or bullet list of titles.
Each recommendation MUST include a line that starts with "Title:".
You MUST return exactly 3 recommendations (no fewer). If you cannot find 3 perfect matches, broaden slightly and still return 3.

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

function ChatMessage({ message, isUser, chatMode, onActionPanelInteraction }) {
  const isStructured = !isUser && hasStructuredRecommendations(message);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <img 
          src="/sarah.png" 
          alt="Sarah"
          className="w-10 h-10 rounded-full object-cover mr-3 border-2 border-[#D4DAD0] flex-shrink-0"
        />
      )}
      <div className={`max-w-[85%] sm:max-w-[75%] ${
        isUser 
          ? 'bg-[#5F7252] text-white rounded-2xl rounded-br-sm px-5 py-3' 
          : 'bg-[#F8F6EE] text-[#4A5940] rounded-2xl rounded-bl-sm px-5 py-3'
      }`}>
        {isStructured ? (
          <FormattedRecommendations 
            text={message} 
            chatMode={chatMode} 
            onActionPanelInteraction={onActionPanelInteraction}
          />
        ) : (
          <div className="text-sm leading-relaxed">
            <FormattedText text={message} />
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
  const [selectedBook, setSelectedBook] = useState(null);
  const [chatMode, setChatMode] = useState('library');
  const [hasEngaged, setHasEngaged] = useState(false);
  const [likedBooks, setLikedBooks] = useState([]);
  const [tasteProfile, setTasteProfile] = useState({
    likedBooks: [],
    likedThemes: [],
    likedAuthors: []
  });
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  
  // Auth state
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [readingQueue, setReadingQueue] = useState([]);
  const [importedLibrary, setImportedLibrary] = useState(null);
  const [importError, setImportError] = useState('');
  const [messages, setMessages] = useState([
    { text: "Hi, I'm Sarah! 📚 Welcome to my personal library—every book here has moved me, challenged me, or changed how I see the world.\n\nI'm passionate about reading for fun, and supporting local bookstores that are the heart of our communities. Here is what I can do:\n\n✨ Discover your next favorite read from my collection\n💚 Find books at local bookstores\n🔍 Recommend books from the world's library\n\nTell me what you're in the mood for, and let's find something amazing together!", isUser: false }
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
  const [selectedThemes, setSelectedThemes] = useState([]);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const attachmentMenuRef = useRef(null);
  const chatStorageKey = 'sarah_books_chat_history_v1';

  // Auth effect - check for existing session and load user data
  useEffect(() => {
    const initAuth = async () => {
      const currentUser = await auth.getUser();
      if (currentUser) {
        setUser(currentUser);
        // Load user's taste profile
        const { data: profile } = await db.getTasteProfile(currentUser.id);
        if (profile) {
          setTasteProfile({
            likedBooks: profile.liked_books || [],
            likedThemes: profile.liked_themes || [],
            likedAuthors: profile.liked_authors || []
          });
        }
        // Load reading queue
        const { data: queue } = await db.getReadingQueue(currentUser.id);
        if (queue) {
          setReadingQueue(queue);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Load user data
        const { data: profile } = await db.getTasteProfile(session.user.id);
        if (profile) {
          setTasteProfile({
            likedBooks: profile.liked_books || [],
            likedThemes: profile.liked_themes || [],
            likedAuthors: profile.liked_authors || []
          });
        }
        const { data: queue } = await db.getReadingQueue(session.user.id);
        if (queue) {
          setReadingQueue(queue);
        }
      } else {
        setUser(null);
        setReadingQueue([]);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Save taste profile to database when it changes (if user is logged in)
  useEffect(() => {
    if (user && tasteProfile.likedBooks.length > 0) {
      db.upsertTasteProfile(user.id, tasteProfile);
    }
  }, [user, tasteProfile]);

  const handleAuthSuccess = (authUser) => {
    setUser(authUser);
    setShowAuthModal(false);
  };

  const handleSignOut = () => {
    setUser(null);
    setTasteProfile({
      likedBooks: [],
      likedThemes: [],
      likedAuthors: []
    });
    setReadingQueue([]);
  };

  const getInitialMessagesForMode = (mode) => {
    if (mode === 'discover') {
      return [{
        text: "Let's discover something new! 🔍 I'll recommend books from beyond my personal collection. Tell me what you're in the mood for—a specific genre, theme, or vibe—and I'll suggest some titles you might love.",
        isUser: false
      }];
    }
    return [{
      text: "Hi, I'm Sarah! 📚 Welcome to my personal library—every book here has moved me, challenged me, or changed how I see the world.\n\nI'm passionate about reading for fun, and supporting local bookstores that are the heart of our communities. Here is what I can do:\n\n✨ Discover your next favorite read from my collection\n💚 Find books at local bookstores\n🔍 Recommend books from the world's library\n\nTell me what you're in the mood for, and let's find something amazing together!",
      isUser: false
    }];
  };

  const handleShowMoreLibrary = () => {
    // Stay in library mode, iterate with liked books as context
    const likedTitles = tasteProfile.likedBooks.map(b => b.title).join(', ');
    const message = `Show me more books like: ${likedTitles}`;
    
    setInputValue(message);
    setShowDiscoverModal(false);
    
    setTimeout(() => {
      const sendButton = document.querySelector('button[aria-label="Send message"]');
      if (sendButton) sendButton.click();
    }, 50);
  };

  const handleShowMoreWorld = () => {
    // Switch to discover mode with taste profile intelligence
    setChatMode('discover');
    setShowDiscoverModal(false);
    
    const context = `
Based on books I've liked:
${tasteProfile.likedBooks.map(b => `- ${b.title} by ${b.author}`).join('\n')}

Find similar books from beyond my library that match this taste profile.
    `.trim();
    
    setInputValue(context);
    
    setTimeout(() => {
      const sendButton = document.querySelector('button[aria-label="Send message"]');
      if (sendButton) sendButton.click();
    }, 50);
  };

  const handleBackToLibrary = () => {
    setChatMode('library');
    setMessages(getInitialMessagesForMode('library'));
    setSelectedThemes([]);
    setInputValue('');
    setHasEngaged(false);
    setLikedBooks([]);
  };

  const handleNewSearch = () => {
    setMessages(getInitialMessagesForMode(chatMode));
    setSelectedThemes([]);
    setInputValue('');
  };

  const systemPrompt = React.useMemo(() => getSystemPrompt(chatMode), [chatMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target)) {
        setShowAttachmentMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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


  // Don't reset messages when switching modes - keep the conversation unified
  // useEffect(() => {
  //   if (!hasHydratedChatRef.current) return;
  //   try {
  //     const raw = window.localStorage.getItem(chatStorageKey);
  //     const parsed = raw ? JSON.parse(raw) : null;
  //     const byMode = parsed?.byMode && typeof parsed.byMode === 'object' ? parsed.byMode : {};
  //     const restored = Array.isArray(byMode?.[chatMode]) ? byMode[chatMode] : null;
  //     if (restored && restored.length) {
  //       setMessages(restored);
  //     } else {
  //       setMessages(getInitialMessagesForMode(chatMode));
  //     }
  //   } catch (e) {
  //     void e;
  //     setMessages(getInitialMessagesForMode(chatMode));
  //   }
  // }, [chatMode]);

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
        .slice(-3)
        .map(m => ({
          role: m.isUser ? 'user' : 'assistant',
          content: m.text
        }));

      const libraryShortlist = chatMode === 'library'
        ? String(buildLibraryContext(userMessage, bookCatalog) || '')
        : '';
      const limitedLibraryShortlist = libraryShortlist.split('\n').slice(0, 18).join('\n');

      const discoverAvoidShortlist = chatMode === 'discover'
        ? String(buildLibraryContext(userMessage, bookCatalog) || '').split('\n').slice(0, 18).join('\n')
        : '';

      const themeFilterText = selectedThemes.length > 0
        ? `\n\nACTIVE THEME FILTERS: ${selectedThemes.map(t => themeInfo[t]?.label).join(', ')}\nIMPORTANT: All recommendations must match at least one of these themes.`
        : '';

      const userContent = chatMode === 'library'
        ? `LIBRARY SHORTLIST:\n${limitedLibraryShortlist}${themeFilterText}\n\nUSER REQUEST:\n${userMessage}`
        : (() => {
            const parts = [];
            if (discoverAvoidShortlist) {
              parts.push(`SARAH'S LIBRARY SHORTLIST (DO NOT RECOMMEND):\n${discoverAvoidShortlist}`);
            }
            if (importedLibrary?.items?.length) {
              const owned = importedLibrary.items.slice(0, 18).map(b => `- ${b.title}${b.author ? ` — ${b.author}` : ''}`).join('\n');
              parts.push(`USER LIBRARY (imported):\n${owned}`);
            }
            parts.push('IMPORTANT: Recommend books outside Sarah\'s library. Do not recommend any titles listed above as already-owned. Before finalizing your 3 picks, double-check that none of the 3 titles appear in the DO NOT RECOMMEND list.');
            if (themeFilterText) {
              parts.push(themeFilterText.trim());
            }
            parts.push(`USER REQUEST:\n${userMessage}`);
            return parts.join('\n\n');
          })();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 380,
          system: systemPrompt,
          messages: [
            ...chatHistory,
            { role: 'user', content: userContent }
          ]
        })
      });

      const rawText = await response.text();
      let data;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch (e) {
        void e;
        data = null;
      }

      if (!response.ok) {
        const msg = (() => {
          if (!data) return String(rawText || '').trim();
          if (typeof data?.error === 'string') return data.error.trim();
          if (data?.error && typeof data.error === 'object') {
            const nested = data.error?.message || data.error?.error || data.error?.type;
            if (nested) return String(nested).trim();
          }
          if (data?.message) return String(data.message).trim();
          return String(rawText || '').trim();
        })();

        const statusLine = typeof response.status === 'number' && response.status ? ` (${response.status})` : '';
        setMessages(prev => [...prev, {
          text: msg ? `Oops — the server returned an error${statusLine}: ${msg}` : "Oops — I'm having trouble right now. Could you try again?",
          isUser: false
        }]);
        return;
      }

      const assistantMessage = data?.content?.[0]?.text || "I'm having trouble thinking right now. Could you try again?";
      setMessages(prev => [...prev, { text: assistantMessage, isUser: false }]);
    } catch (error) {
      const isAbort = error?.name === 'AbortError';
      if (isAbort) {
        setMessages(prev => [...prev, {
          text: "That took a little too long on my end. Want to try again (or ask for something shorter)?",
          isUser: false
        }]);
      } else {
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


  const handleShare = async () => {
    const url = (typeof window !== 'undefined' && window.location?.href) ? window.location.href : '';
    const title = "Sarah's Books";
    const text = "I thought you’d like Sarah’s Library — ask for book recommendations from her shelves.";

    track('share_click', { source: 'chat' });

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title, text, url });
        track('share_success', { method: 'web_share', source: 'chat' });
        setShareFeedback('Shared!');
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        track('share_success', { method: 'clipboard', source: 'chat' });
        setShareFeedback('Link copied!');
      } else {
        // Last-resort fallback: prompt copy.
        window.prompt('Copy this link to share:', url);
        track('share_success', { method: 'prompt', source: 'chat' });
        setShareFeedback('Link ready to copy.');
      }
    } catch (e) {
      void e;
      track('share_error', { source: 'chat' });
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

    track('thanks_heart_click', { source: 'chat' });
    track('thanks_heart_send', { method: 'backend', source: 'chat' });

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
                <h1 className="font-serif text-xl sm:text-2xl text-[#4A5940]">Sarah's Books</h1>
                <p className="text-xs text-[#7A8F6C] font-light tracking-wide">A Curated Collection of Infinite Possibilities</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {shareFeedback && (
                <div className="hidden sm:block text-xs text-[#7A8F6C] font-light">
                  {shareFeedback}
                </div>
              )}

              {user ? (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="inline-flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-full bg-gradient-to-br from-[#5F7252] to-[#7A8F6C] text-white hover:from-[#4A5940] hover:to-[#5F7252] transition-all"
                  title="View profile"
                >
                  <UserIcon className="w-4 h-4" />
                  <span className="hidden sm:inline ml-2 text-sm font-medium">
                    {user.email?.split('@')[0]}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="inline-flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-full bg-[#5F7252] text-white hover:bg-[#4A5940] transition-all"
                  title="Sign in"
                >
                  <UserIcon className="w-4 h-4" />
                  <span className="hidden sm:inline ml-2 text-sm font-medium">Sign In</span>
                </button>
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
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-y-auto">
          <div className="mb-4 sm:mb-6 rounded-2xl overflow-hidden shadow-lg relative">
            <div className="bg-[#FDFBF4]">
              <img
                src="/books.jpg"
                alt="Open book on desk"
                loading="lazy"
                className="block w-full h-[clamp(120px,16vh,220px)] object-cover object-center"
              />
            </div>
            <div className="bg-white/80 backdrop-blur-sm border-t border-[#E8EBE4]">
              <div className="px-5 sm:px-8 py-4">
                <h2 className="text-[#4A5940] font-serif text-base sm:text-xl mb-1 leading-snug break-words">
                  Find Your Next Read
                </h2>
                <p className="text-[#7A8F6C] text-sm sm:text-base font-light leading-relaxed">
                  Browse my personal collection or discover something new.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-4 min-h-[120px] overflow-y-auto rounded-xl bg-[#F8F6EE]/50 border border-[#E8EBE4] p-4" role="log" aria-live="polite" aria-label="Chat conversation">
            {messages.map((msg, idx) => (
              <ChatMessage 
                key={idx} 
                message={msg.text} 
                isUser={msg.isUser} 
                messageIndex={idx}
                chatMode={chatMode}
                onEngagement={(book) => {
                  if (chatMode === 'library' && !hasEngaged) {
                    setHasEngaged(true);
                    setLikedBooks(prev => {
                      const exists = prev.some(b => b.title === book.title);
                      return exists ? prev : [...prev, book];
                    });
                  }
                }}
                onActionPanelInteraction={(action, data, recommendations) => {
                  if (action === 'feedback') {
                    track('recommendation_feedback_panel', {
                      feedback_type: data,
                      chat_mode: chatMode,
                      recommendation_count: recommendations.length
                    });
                    if (data === 'like' && chatMode === 'library') {
                      setHasEngaged(true);
                      setLikedBooks(recommendations.map(r => ({ title: r.title, author: r.author })));
                      // Build taste profile
                      setTasteProfile(prev => ({
                        likedBooks: [...prev.likedBooks, ...recommendations.map(r => ({ title: r.title, author: r.author }))],
                        likedThemes: prev.likedThemes, // TODO: extract from recommendations
                        likedAuthors: [...new Set([...prev.likedAuthors, ...recommendations.map(r => r.author).filter(Boolean)])]
                      }));
                    }
                  } else if (action === 'find_book') {
                    // Open all recommended books in tabs
                    recommendations.forEach(rec => {
                      const url = data === 'goodreads' 
                        ? getGoodreadsSearchUrl(rec.title, rec.author)
                        : getBookshopSearchUrl(rec.title, rec.author);
                      window.open(url, '_blank');
                    });
                    track('find_books_action', {
                      destination: data,
                      book_count: recommendations.length,
                      chat_mode: chatMode
                    });
                  } else if (action === 'discover_more') {
                    // Show modal to choose library or world
                    setShowDiscoverModal(true);
                  } else if (action === 'upload_library') {
                    // Trigger the file input click
                    setImportError('');
                    importFileInputRef.current?.click();
                    track('upload_library_prompt', {
                      source: 'negative_feedback',
                      chat_mode: chatMode
                    });
                  }
                }}
              />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <img 
                  src="/sarah.png" 
                  alt="Sarah"
                  className="w-10 h-10 rounded-full object-cover mr-3 border-2 border-[#D4DAD0] flex-shrink-0"
                />
                <div className="bg-[#F8F6EE] rounded-2xl rounded-bl-sm px-5 py-3 border border-[#E8EBE4]">
                  <div className="text-xs text-[#7A8F6C] font-light mb-1">Curating your picks…</div>
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

          <div className="bg-[#F8F6EE] rounded-2xl border border-[#E8EBE4] shadow-sm p-3 sm:p-4 flex items-center gap-3">
              <div className="relative" ref={attachmentMenuRef}>
                <button
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  className="w-8 h-8 rounded-lg border border-[#E8EBE4] bg-white hover:bg-[#F8F6EE] transition-colors flex-shrink-0 flex items-center justify-center text-[#7A8F6C] hover:text-[#5F7252]"
                  aria-label={importedLibrary?.items?.length ? 'Manage Goodreads library' : 'Upload Goodreads CSV'}
                  aria-expanded={showAttachmentMenu}
                >
                  {importedLibrary?.items?.length ? (
                    <Library className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </button>
                {showAttachmentMenu && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg border border-[#E8EBE4] shadow-lg py-1 min-w-[200px] z-50">
                    <button
                      onClick={() => {
                        setImportError('');
                        importFileInputRef.current?.click();
                        setShowAttachmentMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-[#4A5940] hover:bg-[#F8F6EE] transition-colors flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Goodreads CSV
                    </button>
                    {importedLibrary?.items?.length && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Clear imported Goodreads library (${importedOverlap.total} books)?`)) {
                            handleClearImport();
                          }
                          setShowAttachmentMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-[#7A8F6C] hover:bg-[#F8F6EE] transition-colors flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Clear library ({importedOverlap.total} books)
                      </button>
                    )}
                  </div>
                )}
                {importError && (
                  <div className="absolute top-full left-0 mt-1 text-xs text-red-700 bg-white px-2 py-1 rounded border border-red-200 shadow-sm whitespace-nowrap">
                    {importError}
                  </div>
                )}
              </div>
              <textarea
                value={inputValue}
                onChange={e => {
                  setInputValue(e.target.value);
                  e.target.style.height = '24px';
                  const newHeight = Math.min(e.target.scrollHeight, 200);
                  e.target.style.height = newHeight + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' || e.shiftKey) return;
                  e.preventDefault();
                  handleSendMessage();
                }}
                placeholder="What are you in the mood for?"
                className="flex-1 px-0 py-0 outline-none text-[#4A5940] placeholder-[#96A888] font-light text-sm sm:text-base resize-none overflow-hidden bg-transparent leading-relaxed"
                disabled={isLoading}
                style={{ minHeight: '24px', maxHeight: '200px', height: '24px' }}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="w-8 h-8 sm:w-9 sm:h-9 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 flex items-center justify-center"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

          {chatMode === 'discover' && (
            <div className="mb-3 flex items-center justify-center gap-2">
              <button
                onClick={handleBackToLibrary}
                className="text-xs font-medium text-[#96A888] hover:text-[#5F7252] transition-colors"
                aria-label="Back to my library"
              >
                ← Back to My Library
              </button>
            </div>
          )}

          {messages.length > 2 && chatMode === 'library' && (
            <div className="mb-2 flex items-center justify-center gap-2">
              <button
                onClick={handleNewSearch}
                className="text-xs font-medium text-[#96A888] hover:text-[#5F7252] transition-colors"
                aria-label="Start new search"
              >
                New Search
              </button>
            </div>
          )}

          {selectedThemes.length > 0 && chatMode === 'library' && (
            <div className="mb-2 flex items-center justify-center gap-2 text-xs text-[#7A8F6C]">
              <span>
                Filtering: {selectedThemes.map(t => themeInfo[t]?.label).join(', ')}
              </span>
              <button
                onClick={() => setSelectedThemes([])}
                className="text-[#96A888] hover:text-[#5F7252] font-medium"
              >
                Clear
              </button>
            </div>
          )}

          {chatMode === 'discover' && likedBooks.length > 0 && (
            <div className="mb-3 px-4 py-3 bg-[#F8F6EE] rounded-xl border border-[#E8EBE4]">
              <p className="text-xs text-[#7A8F6C] mb-2">∞ Finding books similar to:</p>
              <div className="flex flex-wrap gap-1.5">
                {likedBooks.map((book, idx) => (
                  <span key={idx} className="text-xs px-2 py-1 bg-white text-[#5F7252] rounded-full border border-[#E8EBE4]">
                    {book.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6 flex items-center justify-center gap-1.5 flex-wrap">
            {Object.entries(themeInfo).map(([key, info]) => {
              const isSelected = selectedThemes.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedThemes(prev => prev.filter(t => t !== key));
                      setInputValue('');
                    } else {
                      setSelectedThemes(prev => [...prev, key]);
                      if (messages.length <= 2) {
                        setInputValue(`Show me options in ${info.label.toLowerCase()}.`);
                      }
                    }
                  }}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm transition-all ${
                    isSelected
                      ? 'bg-[#E8EBE4] border-[#96A888] scale-110'
                      : 'border-[#E8EBE4] bg-[#FDFBF4] hover:border-[#96A888] hover:bg-[#E8EBE4]'
                  }`}
                  aria-label={`${info.label} theme filter`}
                  aria-pressed={isSelected}
                  title={`${info.label} — ${themeDescriptions[key]}${isSelected ? ' (active filter)' : ''}`}
                >
                  {info.emoji}
                </button>
              );
            })}
          </div>

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

          <div className="mt-16 sm:mt-20 text-xs text-[#7A8F6C] font-light text-center">
            <div>For the ❤️ of reading.</div>
            <div className="mt-1">hello@sarahsbooks.com</div>
          </div>

        </main>

      {selectedBook && (
        <BookDetail book={selectedBook} onClose={() => setSelectedBook(null)} />
      )}

      {/* Discover Modal - Choose Library or World */}
      {showDiscoverModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-[#E8EBE4]">
            <h3 className="text-lg font-serif text-[#4A5940] mb-3 text-center">
              Where should I look?
            </h3>
            <p className="text-sm text-[#7A8F6C] mb-6 text-center">
              {tasteProfile.likedBooks.length >= 3 
                ? "I've learned what you like. Let's find more!"
                : "Let me learn more about your taste first."}
            </p>
            
            <div className="space-y-3">
              <button
                onClick={handleShowMoreLibrary}
                className="w-full p-4 rounded-xl border-2 border-[#E8EBE4] hover:border-[#5F7252] hover:bg-[#F8F6EE] transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📚</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#4A5940] mb-1">More from My Library</p>
                    <p className="text-xs text-[#7A8F6C]">Stay in my curated collection of ~200 books</p>
                  </div>
                </div>
              </button>
              
              <button
                onClick={tasteProfile.likedBooks.length >= 3 ? handleShowMoreWorld : undefined}
                disabled={tasteProfile.likedBooks.length < 3}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  tasteProfile.likedBooks.length >= 3
                    ? 'border-[#5F7252] bg-gradient-to-r from-[#F8F6EE] to-[#F5EFDC] hover:border-[#4A5940] cursor-pointer'
                    : 'border-[#E8EBE4] bg-gray-50 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{tasteProfile.likedBooks.length >= 3 ? '∞' : '🔒'}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium mb-1 ${
                      tasteProfile.likedBooks.length >= 3 ? 'text-[#4A5940]' : 'text-[#96A888]'
                    }`}>
                      Search Everywhere {tasteProfile.likedBooks.length < 3 && '(Locked)'}
                    </p>
                    {tasteProfile.likedBooks.length >= 3 ? (
                      <>
                        <p className="text-xs text-[#7A8F6C]">Use your taste profile to search millions of books</p>
                        <p className="text-xs text-[#96A888] mt-1 italic">
                          Based on {tasteProfile.likedBooks.length} book{tasteProfile.likedBooks.length !== 1 ? 's' : ''} you liked
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-[#96A888]">Like {3 - tasteProfile.likedBooks.length} more book{3 - tasteProfile.likedBooks.length !== 1 ? 's' : ''} to unlock</p>
                        <div className="flex gap-1 mt-2">
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full ${
                                i < tasteProfile.likedBooks.length ? 'bg-[#5F7252]' : 'bg-[#E8EBE4]'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </button>
            </div>
            
            <button
              onClick={() => setShowDiscoverModal(false)}
              className="w-full mt-4 px-4 py-2 text-sm text-[#96A888] hover:text-[#5F7252] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && !user && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {/* User Profile Modal */}
      {showAuthModal && user && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-[#E8EBE4] relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-[#E8EBE4] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#96A888]" />
            </button>
            <UserProfile
              user={user}
              tasteProfile={tasteProfile}
              readingQueue={readingQueue}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
      )}

    </div>
  );
}
