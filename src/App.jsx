import React, { useState, useRef, useEffect, lazy, Suspense, useMemo, useCallback } from 'react';
import { Book, Star, MessageCircle, X, Send, ExternalLink, Library, ShoppingBag, Heart, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Share2, Upload, Plus, User as UserIcon, Menu, Home, BookOpen, Mail, ArrowLeft, Bookmark, BookHeart, Users, Sparkles, Scale, RotateCcw, MessageSquare, BookMarked, Headphones, Activity, BookCheck } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { track } from '@vercel/analytics';
import bookCatalog from './books.json';
import { db } from './lib/supabase';
import { extractThemes } from './lib/themeExtractor';
import { buildOptimizedLibraryContext, shouldPrioritizeWorldSearch } from './lib/semanticSearch';
import { buildCachedSystemPrompt } from './lib/promptCache';
import AuthModal from './components/AuthModal';
import LoadingFallback from './components/LoadingFallback';
import ErrorBoundary from './components/ErrorBoundary';
import { useUser, useReadingQueue } from './contexts';

// Lazy load heavy components
const UserProfile = lazy(() => import('./components/UserProfile'));
const AboutPage = lazy(() => import('./components/AboutPage'));
const ShopPage = lazy(() => import('./components/ShopPage'));
const MyCollectionPage = lazy(() => import('./components/MyCollectionPage'));
const MyBooksPage = lazy(() => import('./components/MyBooksPage'));
const MyReadingQueuePage = lazy(() => import('./components/MyReadingQueuePage'));
const MyRecommendationsPage = lazy(() => import('./components/MyRecommendationsPage'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

const BOOKSHOP_AFFILIATE_ID = '119544';
const AMAZON_AFFILIATE_TAG = 'sarahsbooks01-20';
const LIBRO_FM_AFFILIATE_ID = 'sarahsbooks'; // TODO: Replace with actual affiliate ID when available
const AUDIBLE_AFFILIATE_TAG = 'sarahsbooks01-20'; // Uses Amazon Associates
const CURRENT_YEAR = new Date().getFullYear();
const ADMIN_EMAIL = 'sarah@darkridge.com'; // Admin access

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

function buildLibraryContext(userMessage, catalog, readingQueue = [], favoriteAuthors = []) {
  const q = String(userMessage || '').toLowerCase();
  const tokens = tokenizeForSearch(userMessage);

  // Extract user preferences from finished books
  const finishedBooks = readingQueue.filter(item => item.status === 'finished');
  const finishedTitles = new Set(finishedBooks.map(item => 
    String(item.book_title || '').toLowerCase().trim()
  ));
  
  console.log('[Recommendations] Building library context');
  console.log('[Recommendations] Finished books count:', finishedBooks.length);
  console.log('[Recommendations] Finished titles to exclude:', Array.from(finishedTitles));
  console.log('[Recommendations] Favorite authors:', favoriteAuthors);
  
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

function FormattedText({ text }) {
  const lines = String(text || '').split('\n');

  const renderLineWithIcons = (line) => {
    // Replace icon markers with actual Lucide icons
    const parts = [];
    let currentText = line;
    let key = 0;

    // Check for icon markers and replace with components
    const iconMap = {
      '[shopping-bag]': <ShoppingBag key={key++} className="w-3.5 h-3.5 inline-block align-text-bottom" />,
      '[star]': <Star key={key++} className="w-3.5 h-3.5 inline-block align-text-bottom" />,
      '[share]': <Share2 key={key++} className="w-3.5 h-3.5 inline-block align-text-bottom" />,
      '[bookmark]': <Bookmark key={key++} className="w-3.5 h-3.5 inline-block align-text-bottom" />
    };

    // Split by icon markers and rebuild with components
    Object.entries(iconMap).forEach(([marker, icon]) => {
      if (currentText.includes(marker)) {
        const segments = currentText.split(marker);
        const newParts = [];
        segments.forEach((segment, idx) => {
          if (idx > 0) newParts.push(icon);
          newParts.push(segment);
        });
        currentText = newParts;
      }
    });

    // Handle bold text
    const renderInlineBold = (content) => {
      if (typeof content === 'string') {
        const boldParts = content.split('**');
        return boldParts.map((part, idx) =>
          idx % 2 === 1 ? <strong key={`bold-${idx}`}>{part}</strong> : <React.Fragment key={`text-${idx}`}>{part}</React.Fragment>
        );
      }
      return content;
    };

    if (Array.isArray(currentText)) {
      return currentText.map((part, idx) => (
        <React.Fragment key={idx}>{renderInlineBold(part)}</React.Fragment>
      ));
    }

    return renderInlineBold(currentText);
  };

  return (
    <>
      {lines.map((line, idx) => (
        <React.Fragment key={idx}>
          {renderLineWithIcons(line)}
          {idx < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
}

const themeInfo = {
  women: { icon: BookHeart, label: "Women's Untold Stories", color: "bg-rose-50 text-rose-700 border-rose-200" },
  emotional: { icon: Heart, label: "Emotional Truth", color: "bg-amber-50 text-amber-700 border-amber-200" },
  identity: { icon: Users, label: "Identity & Belonging", color: "bg-violet-50 text-violet-700 border-violet-200" },
  spiritual: { icon: Sparkles, label: "Spiritual Seeking", color: "bg-teal-50 text-teal-700 border-teal-200" },
  justice: { icon: Scale, label: "Invisible Injustices", color: "bg-emerald-50 text-emerald-700 border-emerald-200" }
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

function RecommendationCard({ rec, chatMode, user, readingQueue, onAddToQueue, onRemoveFromQueue, onShowAuthModal }) {
  const [addingToQueue, setAddingToQueue] = useState(false);
  const [addedToQueue, setAddedToQueue] = useState(false);
  const [showBuyOptions, setShowBuyOptions] = useState(false);
  const [showListenOptions, setShowListenOptions] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [showAcquisitionOptions, setShowAcquisitionOptions] = useState(false);
  
  // Look up full book details from local catalog
  const catalogBook = React.useMemo(() => {
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
  }, [rec.title]);

  const displayAuthor = String(rec?.author || catalogBook?.author || '').trim();
  const displayWhy = String(rec?.why || '').trim();
  const fullDescription = catalogBook?.description || rec.description;

  // Check if book is already in queue
  const isInQueue = readingQueue?.some(
    queueBook => normalizeTitle(queueBook.book_title) === normalizeTitle(rec.title)
  );

  const handleAddToQueue = async (e) => {
    e.stopPropagation();
    if (!user || addingToQueue) return;
    
    // If already in queue, remove it
    if (isInQueue) {
      const queueItem = readingQueue.find(
        queueBook => normalizeTitle(queueBook.book_title) === normalizeTitle(rec.title)
      );
      
      if (queueItem && onRemoveFromQueue) {
        const success = await onRemoveFromQueue(queueItem.id);
        if (success) {
          track('recommendation_removed_from_queue', {
            book_title: rec.title,
            book_author: displayAuthor,
            chat_mode: chatMode
          });
        }
      }
      return;
    }
    
    setAddingToQueue(true);
    const success = await onAddToQueue(rec);
    setAddingToQueue(false);
    
    if (success) {
      setAddedToQueue(true);
      setTimeout(() => setAddedToQueue(false), 2000);
      
      // Track successful save
      track('recommendation_saved', {
        book_title: rec.title,
        book_author: displayAuthor,
        chat_mode: chatMode,
        has_catalog_match: !!catalogBook
      });
    } else {
      // Track failed save
      track('recommendation_save_failed', {
        book_title: rec.title,
        chat_mode: chatMode
      });
    }
  };

  const handleAlreadyRead = async (e) => {
    e.stopPropagation();
    if (!user) {
      onShowAuthModal();
      return;
    }
    
    // Add to reading queue with 'finished' status
    setAddingToQueue(true);
    const success = await onAddToQueue({
      ...rec,
      status: 'finished'
    });
    setAddingToQueue(false);
    
    if (success) {
      setShowRatingPrompt(true);
      setShowAcquisitionOptions(true);
      
      track('recommendation_marked_read', {
        book_title: rec.title,
        book_author: displayAuthor,
        chat_mode: chatMode
      });
    }
  };

  const handleNotForMe = (e) => {
    e.stopPropagation();
    setDismissed(true);
    
    track('recommendation_dismissed', {
      book_title: rec.title,
      book_author: displayAuthor,
      chat_mode: chatMode,
      has_catalog_match: !!catalogBook
    });
  };

  const handleWantToRead = async (e) => {
    e.stopPropagation();
    if (!user) {
      onShowAuthModal();
      return;
    }
    
    await handleAddToQueue(e);
    setShowAcquisitionOptions(true);
  };

  // Don't render if dismissed
  if (dismissed) {
    return null;
  }

  return (
    <div className="bg-[#FDFBF4] rounded-xl border border-[#D4DAD0] p-4">
      {/* Source Badge */}
      <div className="flex items-center gap-2 mb-3">
        {catalogBook ? (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#5F7252]/10 text-[#5F7252] text-[10px] font-medium"
            title="From my personal collection—a book I've read and love!"
          >
            <Library className="w-3 h-3" />
            From My Library
          </span>
        ) : (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#7A8F6C]/10 text-[#7A8F6C] text-[10px] font-medium"
            title="From the wider world—the best match for your request!"
          >
            <Sparkles className="w-3 h-3" />
            World Discovery
          </span>
        )}
      </div>
      {/* Book Info */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-[#4A5940] text-sm">{rec.title}</h4>
          </div>
          <div className="flex items-center gap-2">
            {/* Expand/Collapse Button */}
            <button
              onClick={() => {
                const newExpandedState = !expanded;
                setExpanded(newExpandedState);
                
                // Track card expansion
                if (newExpandedState) {
                  track('recommendation_expanded', {
                    book_title: rec.title,
                    book_author: displayAuthor,
                    chat_mode: chatMode,
                    has_description: !!fullDescription,
                    has_themes: !!(catalogBook?.themes?.length)
                  });
                }
              }}
              className="p-1 hover:bg-[#E8EBE4] rounded transition-colors flex-shrink-0"
              aria-label={expanded ? "Show less" : "Show more"}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-[#7A8F6C]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#7A8F6C]" />
              )}
            </button>
          </div>
        </div>
        {displayAuthor && <p className="text-xs text-[#7A8F6C] mb-1">{displayAuthor}</p>}
        {displayWhy && (
          <p className="text-xs text-[#5F7252] mt-1">{displayWhy}</p>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mb-4 pb-4 border-b border-[#E8EBE4]">
          {catalogBook?.favorite && (
            <div className="mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <p className="text-xs font-medium text-[#4A5940]">All-Time Favorite</p>
            </div>
          )}
          {fullDescription && (
            <div className="mb-3">
              <p className="text-xs font-medium text-[#4A5940] mb-2">Description:</p>
              <p className="text-xs text-[#5F7252] leading-relaxed">{fullDescription}</p>
            </div>
          )}
          {catalogBook?.themes && (
            <div>
              <p className="text-xs font-medium text-[#4A5940] mb-2">Themes:</p>
              <div className="flex flex-wrap gap-2">
                {catalogBook.themes.slice(0, 5).map(theme => {
                  const ThemeIcon = themeInfo[theme]?.icon;
                  return (
                    <span key={theme} className="text-xs px-2 py-0.5 bg-[#E8EBE4] text-[#5F7252] rounded-full flex items-center gap-1">
                      {ThemeIcon && <ThemeIcon className="w-3 h-3" />}
                      {themeInfo[theme]?.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {rec.reputation && (
            <div className="mt-2">
              <p className="text-xs text-[#7A8F6C]">
                <span className="font-medium">Reputation:</span> {rec.reputation}
              </p>
            </div>
          )}
          
          {/* Reviews Link */}
          <div className="mt-3 pt-3 border-t border-[#E8EBE4]">
            <a
              href={rec.goodreadsUrl || getGoodreadsSearchUrl(rec.title, displayAuthor)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                track('read_reviews_clicked', { 
                  book_title: rec.title,
                  book_author: displayAuthor
                });
              }}
              className="inline-flex items-center gap-2 text-xs text-[#5F7252] hover:text-[#4A5940] transition-colors font-medium"
            >
              <Star className="w-3.5 h-3.5" />
              Read Reviews on Goodreads
            </a>
          </div>
        </div>
      )}

      {/* Primary Engagement Actions */}
      <div className="mb-3">
        <div className="grid grid-cols-3 gap-2">
          {/* Already Read Button */}
          <button
            onClick={handleAlreadyRead}
            disabled={addingToQueue}
            className="py-2.5 px-3 rounded-lg text-xs font-medium transition-colors bg-[#5F7252] text-white hover:bg-[#4A5940] flex items-center justify-center gap-1.5"
            title="I've already read this book"
          >
            <BookCheck className="w-4 h-4 flex-shrink-0" />
            <span className="whitespace-nowrap">Already Read</span>
          </button>

          {/* Want to Read Button */}
          <button
            onClick={handleWantToRead}
            disabled={addingToQueue}
            className={`py-2.5 px-3 rounded-lg text-xs font-medium transition-colors border flex items-center justify-center gap-1.5 ${
              isInQueue 
                ? 'bg-[#7A8F6C] border-[#7A8F6C] text-white' 
                : 'bg-white border-[#5F7252] text-[#5F7252] hover:bg-[#F8F6EE]'
            }`}
            title={user ? (isInQueue ? 'Saved to reading queue' : 'Save to reading queue') : 'Sign in to save books'}
          >
            <BookMarked className={`w-4 h-4 flex-shrink-0 ${isInQueue ? 'fill-current' : ''}`} />
            <span className="whitespace-nowrap">Want to Read</span>
          </button>

          {/* Not For Me Button */}
          <button
            onClick={handleNotForMe}
            className="py-2.5 px-3 rounded-lg text-xs font-medium transition-colors bg-white border border-[#D4DAD0] text-[#7A8F6C] hover:bg-[#F8F6EE] flex items-center justify-center gap-1.5"
            title="Not interested in this recommendation"
          >
            <X className="w-4 h-4 flex-shrink-0" />
            <span className="whitespace-nowrap">Not For Me</span>
          </button>
        </div>

        {/* Rating Prompt (shows after "Already Read") */}
        {showRatingPrompt && (
          <div className="mt-3 p-3 bg-[#F8F6EE] rounded-lg border border-[#E8EBE4]">
            <p className="text-xs font-medium text-[#4A5940] mb-2">How would you rate it?</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => {
                    setUserRating(star);
                    track('recommendation_rated', {
                      book_title: rec.title,
                      rating: star,
                      chat_mode: chatMode
                    });
                  }}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star 
                    className={`w-5 h-5 ${
                      star <= (userRating || 0) 
                        ? 'fill-[#F59E0B] text-[#F59E0B]' 
                        : 'fill-none text-[#D4DAD0]'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Acquisition Options Prompt (shows after engagement) */}
        {showAcquisitionOptions && (
          <div className="mt-3 p-3 bg-[#F8F6EE] rounded-lg border border-[#E8EBE4]">
            <p className="text-xs font-medium text-[#4A5940] mb-2">
              {showRatingPrompt ? 'Want to own or listen to it?' : 'How do you want to get it?'}
            </p>
          </div>
        )}
      </div>

      {/* Secondary Acquisition Actions (always visible for now, will be conditional later) */}
      <div className="grid grid-cols-4 gap-2">
        {/* Library Button */}
        <button
          onClick={() => {
            window.open(getLibbyUrl(rec.title, displayAuthor), '_blank');
            track('libby_link_click', { 
              source: 'recommendation_card',
              book_title: rec.title 
            });
          }}
          className="py-2 px-2 rounded-lg text-xs font-medium transition-colors bg-white border border-[#D4DAD0] text-[#4A5940] hover:bg-[#F5F7F2] flex items-center justify-center gap-1"
          title="Borrow free from your library"
        >
          <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">Library</span>
        </button>

        {/* Buy Dropdown */}
        <div className="relative" onMouseLeave={() => setShowBuyOptions(false)}>
          <button
            onClick={() => {
              const newState = !showBuyOptions;
              setShowBuyOptions(newState);
              
              if (newState) {
                track('buy_dropdown_opened', {
                  book_title: rec.title,
                  chat_mode: chatMode
                });
              }
            }}
            className="w-full py-2 px-2 rounded-lg text-xs font-medium transition-colors bg-white border border-[#D4DAD0] text-[#4A5940] hover:bg-[#F5F7F2] flex items-center justify-center gap-1"
            title="Purchase physical or digital"
          >
            <ShoppingBag className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Buy</span>
            {showBuyOptions ? (
              <ChevronUp className="w-3 h-3 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-3 h-3 flex-shrink-0" />
            )}
          </button>
          
          {showBuyOptions && (
            <div className="absolute top-full left-0 bg-white border border-[#D4DAD0] rounded-lg shadow-lg z-10 w-max min-w-[140px]">
              <a
                href={getBookshopSearchUrl(rec.title, displayAuthor)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  track('bookshop_link_click', { 
                    source: 'recommendation_card',
                    book_title: rec.title 
                  });
                }}
                className="block px-3 py-2 text-xs text-[#4A5940] hover:bg-[#F8F6EE] transition-colors whitespace-nowrap"
              >
                📚 Local bookstore
              </a>
              <a
                href={getAmazonKindleUrl(rec.title, displayAuthor)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  const url = getAmazonKindleUrl(rec.title, displayAuthor);
                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                  
                  if (isIOS) {
                    window.location.href = url;
                  } else {
                    window.open(url, '_blank');
                  }
                  
                  track('kindle_link_click', { 
                    source: 'recommendation_card',
                    book_title: rec.title,
                    is_ios: isIOS
                  });
                }}
                className="block px-3 py-2 text-xs text-[#4A5940] hover:bg-[#F8F6EE] transition-colors border-t border-[#E8EBE4] whitespace-nowrap"
              >
                📱 Kindle
              </a>
            </div>
          )}
        </div>

        {/* Listen Dropdown */}
        <div className="relative" onMouseLeave={() => setShowListenOptions(false)}>
          <button
            onClick={() => {
              const newState = !showListenOptions;
              setShowListenOptions(newState);
              
              if (newState) {
                track('listen_dropdown_opened', {
                  book_title: rec.title,
                  chat_mode: chatMode
                });
              }
            }}
            className="w-full py-2 px-2 rounded-lg text-xs font-medium transition-colors bg-white border border-[#D4DAD0] text-[#4A5940] hover:bg-[#F5F7F2] flex items-center justify-center gap-1"
            title="Listen as audiobook"
          >
            <Headphones className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Listen</span>
            {showListenOptions ? (
              <ChevronUp className="w-3 h-3 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-3 h-3 flex-shrink-0" />
            )}
          </button>
          
          {showListenOptions && (
            <div className="absolute top-full left-0 bg-white border border-[#D4DAD0] rounded-lg shadow-lg z-10 w-max min-w-[140px]">
              <a
                href={getLibroFmUrl(rec.title, displayAuthor)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  track('librofm_link_click', { 
                    source: 'recommendation_card',
                    book_title: rec.title 
                  });
                }}
                className="block px-3 py-2 text-xs text-[#4A5940] hover:bg-[#F8F6EE] transition-colors whitespace-nowrap"
              >
                🎧 Libro.fm
              </a>
              <a
                href={getAudibleUrl(rec.title, displayAuthor)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  track('audible_link_click', { 
                    source: 'recommendation_card',
                    book_title: rec.title 
                  });
                }}
                className="block px-3 py-2 text-xs text-[#4A5940] hover:bg-[#F8F6EE] transition-colors border-t border-[#E8EBE4] whitespace-nowrap"
              >
                🎧 Audible
              </a>
            </div>
          )}
        </div>

        {/* Save Button (Bookmark) */}
        <button
          onClick={user ? handleAddToQueue : onShowAuthModal}
          disabled={addingToQueue}
          className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors border flex items-center justify-center gap-1 ${
            isInQueue 
              ? 'bg-[#5F7252] border-[#5F7252] text-white' 
              : 'bg-white border-[#D4DAD0] text-[#4A5940] hover:bg-[#F5F7F2]'
          }`}
          title={user ? (isInQueue ? 'Saved to reading queue' : 'Save to reading queue') : 'Sign in to save books'}
        >
          <Bookmark className={`w-3.5 h-3.5 flex-shrink-0 ${isInQueue ? 'fill-current' : ''}`} />
          <span className="hidden sm:inline whitespace-nowrap">Save</span>
        </button>
      </div>
    </div>
  );
}

function RecommendationActionPanel({ onShowMore }) {
  return (
    <div className="mt-4">
      <button
        onClick={() => onShowMore && onShowMore()}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5F7252] text-white rounded-lg text-sm font-medium hover:bg-[#4A5940] transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        Show Me More Like These
      </button>
    </div>
  );
}

function FormattedRecommendations({ text, chatMode, onActionPanelInteraction, user, readingQueue, onAddToQueue, onRemoveFromQueue, onShowAuthModal }) {
  const recommendations = React.useMemo(() => parseRecommendations(String(text || '')), [text]);
  
  // Extract the header (everything before the first recommendation)
  const header = React.useMemo(() => {
    const lines = String(text || '').split('\n');
    const headerLines = [];
    for (const line of lines) {
      // Stop at the first recommendation indicator
      if (line.includes('Title:') || line.match(/^\*\*[^*]+\*\*$/) || line.includes('[RECOMMENDATION')) {
        break;
      }
      // Skip lines that look like book titles (bold text at start)
      if (line.match(/^\*\*[^*]+\*\*/)) {
        break;
      }
      headerLines.push(line);
    }
    let headerText = headerLines.join('\n').trim();
    // Remove any recommendation markers
    headerText = headerText.replace(/\*\*RECOMMENDATION\s+\d+\*\*/gi, '').trim();
    // Remove any trailing book titles that got captured
    headerText = headerText.replace(/\*\*[^*]+\*\*\s*$/, '').trim();
    return headerText;
  }, [text]);
  
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
          user={user}
          readingQueue={readingQueue}
          onAddToQueue={onAddToQueue}
          onRemoveFromQueue={onRemoveFromQueue}
          onShowAuthModal={onShowAuthModal}
        />
      ))}
      
      {/* Action panel appears after recommendations */}
      {recommendations.length > 0 && onActionPanelInteraction && (
        <RecommendationActionPanel 
          onShowMore={() => onActionPanelInteraction('show_more', null, recommendations)}
        />
      )}
    </div>
  );
}

const getBookshopSearchUrl = (title, author) => {
  const searchQuery = encodeURIComponent(`${title} ${author || ''}`);
  return `https://bookshop.org/search?keywords=${searchQuery}&a_aid=${BOOKSHOP_AFFILIATE_ID}`;
};

const getAmazonKindleUrl = (title, author) => {
  const searchQuery = encodeURIComponent(`${title} ${author || ''} kindle`);
  return `https://www.amazon.com/s?k=${searchQuery}&i=digital-text&tag=${AMAZON_AFFILIATE_TAG}`;
};

const getLibbyUrl = (title, author) => {
  // Libby app deep link - opens app if installed, otherwise directs to app store
  // Note: This doesn't search automatically, but opens the app for manual search
  return `https://libbyapp.com/library`;
};

const getLibroFmUrl = (title, author) => {
  const searchQuery = encodeURIComponent(`${title} ${author || ''}`);
  return `https://libro.fm/search?q=${searchQuery}&affiliate=${LIBRO_FM_AFFILIATE_ID}`;
};

const getAudibleUrl = (title, author) => {
  const searchQuery = encodeURIComponent(`${title} ${author || ''}`);
  return `https://www.audible.com/search?keywords=${searchQuery}&tag=${AUDIBLE_AFFILIATE_TAG}`;
};

const getGoodreadsSearchUrl = (title, author) => {
  const searchQuery = encodeURIComponent(`${title} ${author || ''}`);
  return `https://www.goodreads.com/search?q=${searchQuery}`;
};

const getSystemPrompt = (readingQueue = []) => {
  const responseFormat = `
RESPONSE FORMAT:
When recommending books, always respond with exactly this structure:

My Top 3 Picks for You

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

  // Build user preference context from reading queue
  const finishedBooks = readingQueue.filter(item => item.status === 'finished');
  const queuedBooks = readingQueue.filter(item => item.status === 'want_to_read');
  
  const preferenceContext = finishedBooks.length > 0
    ? `\n\n🚫 BOOKS USER HAS ALREADY READ (${finishedBooks.length} books - DO NOT RECOMMEND ANY OF THESE):\n${finishedBooks.map(b => `"${b.book_title}" by ${b.book_author || 'Unknown'}`).join(', ')}\n\nUse this list to understand their taste AND to avoid recommending books they've already read.`
    : '';
    
  const queueContext = queuedBooks.length > 0
    ? `\n\n📚 BOOKS USER ALREADY HAS SAVED (DO NOT RECOMMEND):\n${queuedBooks.map(b => `"${b.book_title}" by ${b.book_author || 'Unknown'}`).join(', ')}`
    : '';

  return `You are Sarah, a passionate book curator with a personal library of 200+ beloved books.

Your taste centers on: women's stories, emotional truth, identity, spirituality, and justice.

RECOMMENDATION STRATEGY:
- You have MY LIBRARY SHORTLIST (15 books I personally love that match the request)
- Recommend from my library when there are excellent matches
- For specific requests (new releases, bestsellers, niche genres), prioritize world recommendations
- Always prioritize BEST FIT - the user wants the perfect book
- World recommendations: Prioritize Goodreads 4.0+, award winners, Indie Next picks, classics

${responseFormat}
${qualityGuidelines}${preferenceContext}${queueContext}

IMPORTANT: The UI that displays your recommendations ONLY works if you follow the RESPONSE FORMAT exactly.
Do NOT output a numbered list or bullet list of titles.
Each recommendation MUST include a line that starts with "Title:".
You MUST return exactly 3 recommendations (no fewer). If you cannot find 3 perfect matches, broaden slightly and still return 3.
If the user's request is vague, still return 3 solid picks, then ask 1 short clarifying question at the very end.

When asked for "best books of the year" or new releases, treat the current year as ${CURRENT_YEAR} unless the user specifies a different year.`;
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
              {book.themes.map(theme => {
                const ThemeIcon = themeInfo[theme]?.icon;
                return (
                  <span 
                    key={theme} 
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border ${themeInfo[theme]?.color} flex items-center gap-1.5`}
                  >
                    {ThemeIcon && <ThemeIcon className="w-4 h-4" />}
                    {themeInfo[theme]?.label}
                  </span>
                );
              })}
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
              Buy Local
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ message, isUser, chatMode, onActionPanelInteraction, user, readingQueue, onAddToQueue, onRemoveFromQueue, onShowAuthModal }) {
  const isStructured = !isUser && hasStructuredRecommendations(message);
  const isWelcomeMessage = !isUser && message.includes("Hi, I'm Sarah!");

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
            user={user}
            readingQueue={readingQueue}
            onAddToQueue={onAddToQueue}
            onRemoveFromQueue={onRemoveFromQueue}
            onShowAuthModal={onShowAuthModal}
          />
        ) : isWelcomeMessage ? (
          <div className="text-sm leading-relaxed">
            <p className="mb-3">Hi, I'm Sarah!</p>
            <p className="mb-3">I'll recommend the perfect book for you—whether from my curated library of 200+ beloved titles or discoveries from the wider world.</p>
            <p className="mb-3">Look for <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#5F7252]/10 text-[#5F7252] text-[10px] font-semibold"><Library className="w-3 h-3" />From My Library</span> or <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#7A8F6C]/10 text-[#7A8F6C] text-[10px] font-semibold"><Sparkles className="w-3 h-3" />World Discovery</span> to see the source!</p>
            <p>Tell me what you're in the mood for and I'll find your next great read.</p>
          </div>
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
  const { user, authLoading, showAuthModal, setShowAuthModal, signOut } = useUser();
  const { readingQueue, addToQueue, removeFromQueue, updateQueueStatus, refreshQueue } = useReadingQueue();
  
  const [selectedBook, setSelectedBook] = useState(null);
  const [chatMode, setChatMode] = useState('library');
  const [hasEngaged, setHasEngaged] = useState(false);
  const [likedBooks, setLikedBooks] = useState([]);
  const [tasteProfile, setTasteProfile] = useState({
    likedBooks: [],
    likedThemes: [],
    likedAuthors: [],
    profile_photo_url: null
  });
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [importedLibrary, setImportedLibrary] = useState(null);
  const [importError, setImportError] = useState('');
  const [messages, setMessages] = useState([
    { text: "Hi, I'm Sarah!\n\nI'll recommend the perfect book for you—whether from my curated library of 200+ beloved titles or discoveries from the wider world.\n\nTell me what you're in the mood for and I'll find your next great read.", isUser: false }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ step: '', progress: 0 });
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
  const [selectedThemes, setSelectedThemes] = useState([]);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const attachmentMenuRef = useRef(null);
  const chatStorageKey = 'sarah_books_chat_history_v1';
  const lastActivityRef = useRef(Date.now());
  const sessionIdRef = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  // Navigation state
  const [currentPage, setCurrentPage] = useState('home');
  const [showNavMenu, setShowNavMenu] = useState(false);
  const navMenuRef = useRef(null);

  // Listen for profile close event
  useEffect(() => {
    const handleCloseProfile = () => {
      setShowAuthModal(false);
    };
    window.addEventListener('closeProfile', handleCloseProfile);
    return () => window.removeEventListener('closeProfile', handleCloseProfile);
  }, []);

  // Memoize expensive computations - use structured cacheable system prompt
  const systemPrompt = useMemo(() => buildCachedSystemPrompt({
    readingQueue,
    currentYear: CURRENT_YEAR
  }), [readingQueue]);

  // Memoize imported library overlap calculation
  const importedOverlap = useMemo(() => {
    if (!importedLibrary?.items?.length) return null;

    const libByTitle = new Map();
    const libByTitleAuthor = new Map();

    for (const b of bookCatalog) {
      const t = normalizeTitle(b?.title);
      const a = normalizeAuthor(b?.author);
      if (!t) continue;
      if (!libByTitle.has(t)) libByTitle.set(t, b);
      if (a) {
        const key = `${t}__${a}`;
        if (!libByTitleAuthor.has(key)) libByTitleAuthor.set(key, b);
      }
    }

    const shared = [];
    const seen = new Set();
    for (const it of importedLibrary.items) {
      const t = normalizeTitle(it?.title);
      const a = normalizeAuthor(it?.author);
      if (!t) continue;
      const key = a ? `${t}__${a}` : t;
      if (seen.has(key)) continue;
      seen.add(key);
      const match = (a && libByTitleAuthor.has(`${t}__${a}`)) ? libByTitleAuthor.get(`${t}__${a}`) : libByTitle.get(t);
      if (match) shared.push(match);
    }

    return { shared, total: importedLibrary.items.length };
  }, [importedLibrary]);

  // Performance measurement and session tracking
  useEffect(() => {
    const sessionStart = Date.now();
    
    // Measure initial load performance
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
      const firstPaint = timing.responseEnd - timing.navigationStart;
      
      // Track performance metrics
      track('performance_metrics', {
        load_time_ms: loadTime,
        dom_ready_ms: domReady,
        first_paint_ms: firstPaint,
        page: 'home'
      });
      
      // Log to console for debugging
      console.log('📊 Performance Metrics:', {
        'Total Load Time': `${loadTime}ms`,
        'DOM Ready': `${domReady}ms`,
        'First Paint': `${firstPaint}ms`
      });
    }
    
    // Track session start
    track('session_start', {
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      screen_width: window.innerWidth,
      screen_height: window.innerHeight
    });
    
    // Track session end on page unload
    const handleUnload = () => {
      const sessionDuration = Math.round((Date.now() - sessionStart) / 1000);
      track('session_end', {
        duration_seconds: sessionDuration,
        timestamp: new Date().toISOString()
      });
    };
    
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // Load taste profile when user changes
  useEffect(() => {
    const loadTasteProfile = async () => {
      if (!user) {
        setTasteProfile({ likedBooks: [], likedThemes: [], likedAuthors: [], profile_photo_url: null });
        return;
      }
      
      try {
        const { data: profile } = await db.getTasteProfile(user.id);
        if (profile) {
          setTasteProfile({
            likedBooks: profile.liked_books || [],
            likedThemes: profile.liked_themes || [],
            likedAuthors: profile.liked_authors || [],
            profile_photo_url: profile.profile_photo_url || null
          });
        }
      } catch (err) {
        console.error('Error loading taste profile:', err);
      }
    };
    
    loadTasteProfile();
  }, [user]);

  // Save taste profile to database when it changes (if user is logged in)
  useEffect(() => {
    if (user && tasteProfile.likedBooks.length > 0) {
      db.upsertTasteProfile(user.id, tasteProfile);
    }
  }, [user, tasteProfile]);

  const handleAuthSuccess = async () => {
    setShowAuthModal(false);
    // User and queue are now handled by contexts
    // Stay on current page after auth
  };

  const handleSignOut = async () => {
    await signOut();
    setTasteProfile({
      likedBooks: [],
      likedThemes: [],
      likedAuthors: []
    });
    setShowAuthModal(false);
  };

  const getInitialMessages = () => {
    return [{
      text: "Hi, I'm Sarah!\n\nI'll recommend the perfect book for you—whether from my curated library of 200+ beloved titles or discoveries from the wider world.\n\nTell me what you're in the mood for and I'll find your next great read.",
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

  const handleAddToReadingQueue = useCallback(async (book) => {
    if (!user) {
      console.warn('handleAddToReadingQueue: No user logged in');
      setShowAuthModal(true);
      return false;
    }
    
    const title = String(book.title || book.book_title || '').trim();
    const author = String(book.author || book.book_author || '').trim();
    
    if (!title) {
      console.error('Cannot add book without title:', book);
      return false;
    }
    
    const isDuplicate = readingQueue?.some(
      queueBook => normalizeTitle(queueBook.book_title) === normalizeTitle(title)
    );
    
    if (isDuplicate) {
      return true;
    }
    
    const result = await addToQueue({ title, author });
    
    if (!result.success) {
      alert('Failed to save book. Please try again.');
      return false;
    }
    
    return true;
  }, [user, readingQueue, addToQueue, setShowAuthModal]);

  const handleRemoveFromReadingQueue = useCallback(async (queueItemId) => {
    if (!user || !queueItemId) return false;
    
    const result = await removeFromQueue(queueItemId);
    return result.success;
  }, [user, removeFromQueue]);

  const handleNewConversation = () => {
    setMessages(getInitialMessages());
    setSelectedThemes([]);
    setInputValue('');
    setHasEngaged(false);
    setLikedBooks([]);
    
    // Generate new session ID for new conversation
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleNewSearch = () => {
    setMessages(getInitialMessages());
    setSelectedThemes([]);
    setInputValue('');
    lastActivityRef.current = Date.now();
    
    // Track new search event
    track('new_search_started', {
      chat_mode: chatMode,
      previous_message_count: messages.length
    });
  };

  // Improved chat scroll with mobile keyboard handling
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      });
    }
  }, [messages]);

  // Handle mobile keyboard resize
  useEffect(() => {
    const handleResize = () => {
      if (document.activeElement.tagName === 'INPUT' || 
          document.activeElement.tagName === 'TEXTAREA') {
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-clear chat after 30 minutes of inactivity
  useEffect(() => {
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    
    const checkInactivity = () => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT && messages.length > 2) {
        handleNewSearch();
      }
    };
    
    const intervalId = setInterval(checkInactivity, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, [messages.length]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target)) {
        setShowAttachmentMenu(false);
      }
      if (navMenuRef.current && !navMenuRef.current.contains(event.target)) {
        setShowNavMenu(false);
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
        setMessages(getInitialMessages());
      }
    } catch (e) {
      void e;
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

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setIsLoading(true);
    setLoadingProgress({ step: 'library', progress: 0 });
    lastActivityRef.current = Date.now(); // Track activity

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
      }, 15000);

      const chatHistory = messages
        .filter(m => m.isUser !== undefined)
        .slice(-3)
        .map(m => ({
          role: m.isUser ? 'user' : 'assistant',
          content: m.text
        }));

      // Fetch optimized exclusion list from materialized view (single fast query)
      let exclusionList = [];
      if (user) {
        const { data: excludedTitles, error: exclusionError } = await db.getUserExclusionList(user.id);
        if (!exclusionError && excludedTitles) {
          exclusionList = excludedTitles;
          console.log('[Recommendations] Exclusion list loaded:', exclusionList.length, 'books');
        }
      }

      // Extract user preferences from finished books
      const finishedBooks = readingQueue.filter(item => item.status === 'finished');
      const preferredThemes = new Set();
      const preferredGenres = new Set();
      const preferredAuthors = new Set();
      
      finishedBooks.forEach(item => {
        const matchingBook = bookCatalog.find(b => 
          String(b.title || '').toLowerCase().trim() === String(item.book_title || '').toLowerCase().trim()
        );
        if (matchingBook) {
          if (matchingBook.genre) preferredGenres.add(matchingBook.genre);
          if (Array.isArray(matchingBook.themes)) {
            matchingBook.themes.forEach(t => preferredThemes.add(t));
          }
          if (matchingBook.author) preferredAuthors.add(matchingBook.author);
        }
      });
      
      console.log('[Recommendations] User preferences extracted:', {
        themes: Array.from(preferredThemes),
        genres: Array.from(preferredGenres),
        authors: Array.from(preferredAuthors)
      });

      // Build optimized library shortlist using semantic search
      const favoriteAuthors = tasteProfile?.favorite_authors || [];
      const libraryShortlist = buildOptimizedLibraryContext(userMessage, bookCatalog, readingQueue, favoriteAuthors, 10);
      const prioritizeWorld = shouldPrioritizeWorldSearch(userMessage);
      const hasLibraryMatches = libraryShortlist !== 'No strong matches in my library for this specific request.';
      
      // Update progress: library checked
      setTimeout(() => setLoadingProgress({ step: 'library', progress: 100 }), 500);
      setTimeout(() => setLoadingProgress({ step: 'world', progress: 0 }), 1000);

      const themeFilterText = selectedThemes.length > 0
        ? `\n\nACTIVE THEME FILTERS: ${selectedThemes.map(t => themeInfo[t]?.label).join(', ')}\nIMPORTANT: All recommendations must match at least one of these themes.`
        : '';

      // Smart context building - skip library for world-focused queries
      const parts = [];
      
      // Exclusion is handled in the cached system prompt (promptCache.js)
      // No need to duplicate it here
      
      // Add user preference signals from reading history
      if (preferredThemes.size > 0 || preferredGenres.size > 0 || preferredAuthors.size > 0) {
        const prefParts = [];
        if (preferredThemes.size > 0) {
          prefParts.push(`Themes they love: ${Array.from(preferredThemes).join(', ')}`);
        }
        if (preferredGenres.size > 0) {
          prefParts.push(`Genres they enjoy: ${Array.from(preferredGenres).join(', ')}`);
        }
        if (preferredAuthors.size > 0) {
          prefParts.push(`Authors they've read: ${Array.from(preferredAuthors).slice(0, 10).join(', ')}`);
        }
        parts.push(`✨ USER'S TASTE PROFILE (based on ${finishedBooks.length} finished books):\n${prefParts.join('\n')}\n\nPrioritize recommendations that match these preferences.`);
      }
      
      // Only include library context if we have good matches and not prioritizing world
      if (hasLibraryMatches && !prioritizeWorld) {
        parts.push(`MY LIBRARY SHORTLIST (books I personally love and recommend):\n${libraryShortlist}`);
      }
      
      if (importedLibrary?.items?.length) {
        const owned = importedLibrary.items.slice(0, 12).map(b => `- ${b.title}${b.author ? ` — ${b.author}` : ''}`).join('\n');
        parts.push(`USER'S OWNED BOOKS (do not recommend these):\n${owned}`);
      }
      
      if (themeFilterText) {
        parts.push(themeFilterText.trim());
      }
      
      parts.push(`USER REQUEST:\n${userMessage}`);
      const userContent = parts.join('\n\n');

      // Update progress: searching world, then finding matches
      setTimeout(() => setLoadingProgress({ step: 'world', progress: 50 }), 2000);
      setTimeout(() => setLoadingProgress({ step: 'matching', progress: 0 }), 3000);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 600,
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
        // Handle rate limiting specifically
        if (response.status === 429) {
          const resetIn = data?.resetIn ? Math.ceil(data.resetIn / 1000) : 60;
          setMessages(prev => [...prev, {
            text: `I'm getting a lot of requests right now! Please wait ${resetIn} seconds and try again. 🙏`,
            isUser: false
          }]);
          return;
        }

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

      // Update progress: preparing recommendations
      setLoadingProgress({ step: 'preparing', progress: 100 });
      
      const assistantMessage = data?.content?.[0]?.text || "I'm having trouble thinking right now. Could you try again?";
      setMessages(prev => [...prev, { text: assistantMessage, isUser: false }]);
    } catch (error) {
      const isAbort = error?.name === 'AbortError';
      if (isAbort) {
        setMessages(prev => [...prev, {
          text: "That took longer than expected. Please try again - I'll be faster this time!",
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
      setLoadingProgress({ step: '', progress: 0 });
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
              {/* Hamburger Menu */}
              <div className="relative" ref={navMenuRef}>
                <button
                  onClick={() => setShowNavMenu(!showNavMenu)}
                  className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg border border-[#D4DAD0] bg-white hover:bg-[#F8F6EE] transition-colors"
                  aria-label="Navigation menu"
                  aria-expanded={showNavMenu}
                >
                  <Menu className="w-5 h-5 text-[#5F7252]" />
                </button>
                
                {showNavMenu && (
                  <div className="absolute top-full left-0 mt-2 bg-white rounded-lg border border-[#E8EBE4] shadow-lg py-1 min-w-[200px] z-50">
                    {/* DISCOVER Section */}
                    <div className="px-4 py-2 text-xs font-medium text-[#96A888] uppercase tracking-wide">
                      Discover
                    </div>
                    <button
                      onClick={() => {
                        setCurrentPage('home');
                        setShowNavMenu(false);
                        window.scrollTo(0, 0);
                        window.history.pushState({}, '', '/');
                        
                        track('page_navigation', {
                          from: currentPage,
                          to: 'home'
                        });
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-[#4A5940] hover:bg-[#F8F6EE] transition-colors flex items-center gap-3"
                    >
                      <Home className="w-4 h-4" />
                      Next Read
                    </button>
                    <button
                      onClick={() => {
                        setCurrentPage('my-books');
                        setShowNavMenu(false);
                        window.scrollTo(0, 0);
                        window.history.pushState({}, '', '/add-books');
                        
                        track('page_navigation', {
                          from: currentPage,
                          to: 'my-books'
                        });
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-[#4A5940] hover:bg-[#F8F6EE] transition-colors flex items-center gap-3"
                    >
                      <Upload className="w-4 h-4" />
                      Add Books
                    </button>
                    {user && (
                      <>
                        <div className="border-t border-[#E8EBE4] my-1"></div>
                        <div className="px-4 py-2 text-xs font-medium text-[#96A888] uppercase tracking-wide">
                          My Library
                        </div>
                        <button
                          onClick={() => {
                            setCurrentPage('reading-queue');
                            setShowNavMenu(false);
                            window.scrollTo(0, 0);
                            window.history.pushState({}, '', '/reading-queue');
                            
                            track('page_navigation', {
                              from: currentPage,
                              to: 'reading-queue'
                            });
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-[#4A5940] hover:bg-[#F8F6EE] transition-colors flex items-center gap-3"
                        >
                          <BookMarked className="w-4 h-4" />
                          My Reading Queue
                        </button>
                        <button
                          onClick={() => {
                            setCurrentPage('collection');
                            setShowNavMenu(false);
                            window.scrollTo(0, 0);
                            window.history.pushState({}, '', '/collection');
                            
                            // Track page navigation
                            track('page_navigation', {
                              from: currentPage,
                              to: 'collection'
                            });
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-[#4A5940] hover:bg-[#F8F6EE] transition-colors flex items-center gap-3"
                        >
                          <Library className="w-4 h-4" />
                          My Collection
                        </button>
                        <div className="border-t border-[#E8EBE4] my-1"></div>
                        {/* MY RECOMMENDATIONS Section */}
                        <div className="px-4 py-2 text-xs font-medium text-[#96A888] uppercase tracking-wide">
                          My Recommendations
                        </div>
                        <button
                          onClick={() => {
                            setCurrentPage('recommendations');
                            setShowNavMenu(false);
                            window.scrollTo(0, 0);
                            window.history.pushState({}, '', '/recommendations');
                            
                            track('page_navigation', {
                              from: currentPage,
                              to: 'recommendations'
                            });
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-[#4A5940] hover:bg-[#F8F6EE] transition-colors flex items-center gap-3"
                        >
                          <Share2 className="w-4 h-4" />
                          View All
                        </button>
                        <div className="border-t border-[#E8EBE4] my-1"></div>
                        <button
                          onClick={() => {
                            setShowAuthModal(true);
                            setShowNavMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-[#4A5940] hover:bg-[#F8F6EE] transition-colors flex items-center gap-3"
                        >
                          <UserIcon className="w-4 h-4" />
                          Profile
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setCurrentPage('about');
                        setShowNavMenu(false);
                        window.scrollTo(0, 0);
                        window.history.pushState({}, '', '/how-it-works');
                        
                        track('page_navigation', {
                          from: currentPage,
                          to: 'about'
                        });
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-[#4A5940] hover:bg-[#F8F6EE] transition-colors flex items-center gap-3"
                    >
                      <BookHeart className="w-4 h-4" />
                      How It Works
                    </button>
                    <button
                      onClick={() => {
                        setCurrentPage('shop');
                        setShowNavMenu(false);
                        window.scrollTo(0, 0);
                        window.history.pushState({}, '', '/shop');
                        
                        track('page_navigation', {
                          from: currentPage,
                          to: 'shop'
                        });
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-[#4A5940] hover:bg-[#F8F6EE] transition-colors flex items-center gap-3"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Shop
                    </button>
                    <div className="border-t border-[#E8EBE4] my-1"></div>
                    {user?.email === ADMIN_EMAIL && (
                      <button
                        onClick={() => {
                          setCurrentPage('admin');
                          setShowNavMenu(false);
                          window.scrollTo(0, 0);
                          window.history.pushState({}, '', '/admin');
                          
                          track('page_navigation', {
                            from: currentPage,
                            to: 'admin'
                          });
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-[#4A5940] hover:bg-[#F8F6EE] transition-colors flex items-center gap-3"
                      >
                        <Activity className="w-4 h-4" />
                        Admin Dashboard
                      </button>
                    )}
                    <a
                      href="mailto:hello@sarahsbooks.com"
                      className="w-full px-4 py-2.5 text-left text-sm text-[#7A8F6C] hover:bg-[#F8F6EE] transition-colors flex items-center gap-3"
                    >
                      <Mail className="w-4 h-4" />
                      Contact
                    </a>
                  </div>
                )}
              </div>
              
              <div>
                <h1 className="font-serif text-xl sm:text-2xl text-[#4A5940]">Sarah's Books</h1>
                <p className="text-xs text-[#7A8F6C] font-light tracking-wide flex items-center gap-1">For the <Heart className="w-3 h-3 fill-[#c96b6b] text-[#c96b6b] inline" /> of reading</p>
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
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-gradient-to-br from-[#5F7252] to-[#7A8F6C] text-white hover:from-[#4A5940] hover:to-[#5F7252] transition-all"
                  title="View profile"
                >
                  {tasteProfile.profile_photo_url ? (
                    <img 
                      src={tasteProfile.profile_photo_url} 
                      alt="Profile"
                      className="w-6 h-6 rounded-full object-cover border border-white/30"
                    />
                  ) : (
                    <UserIcon className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline text-sm font-medium">
                    {user.email?.split('@')[0]}
                  </span>
                </button>
              ) : authLoading ? (
                <div className="inline-flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-full bg-[#96A888] text-white">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="hidden sm:inline ml-2 text-sm font-medium">Loading...</span>
                </div>
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

            </div>
          </div>
        </div>
      </header>

      {/* Page Routing */}
      {currentPage === 'about' && (
        <Suspense fallback={<LoadingFallback message="Loading About..." />}>
          <AboutPage onNavigate={setCurrentPage} />
        </Suspense>
      )}
      
      {currentPage === 'shop' && (
        <Suspense fallback={<LoadingFallback message="Loading Shop..." />}>
          <ShopPage onNavigate={setCurrentPage} />
        </Suspense>
      )}
      
      {currentPage === 'collection' && (
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback message="Loading My Collection..." />}>
            <MyCollectionPage 
              onNavigate={setCurrentPage}
              user={user}
              onShowAuthModal={() => setShowAuthModal(true)}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {currentPage === 'my-books' && (
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback message="Loading Add Books..." />}>
            <MyBooksPage 
              onNavigate={setCurrentPage}
              user={user}
              onShowAuthModal={() => setShowAuthModal(true)}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {currentPage === 'reading-queue' && (
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback message="Loading Reading Queue..." />}>
            <MyReadingQueuePage 
              onNavigate={setCurrentPage}
              user={user}
              onShowAuthModal={() => setShowAuthModal(true)}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {currentPage === 'recommendations' && (
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback message="Loading My Recommendations..." />}>
            <MyRecommendationsPage 
              onNavigate={setCurrentPage}
              user={user}
              onShowAuthModal={() => setShowAuthModal(true)}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {currentPage === 'admin' && user?.email === ADMIN_EMAIL && (
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback message="Loading Admin Dashboard..." />}>
            <AdminDashboard 
              onNavigate={setCurrentPage}
              user={user}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {currentPage === 'home' && (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-y-auto">
          <div className="mb-4 sm:mb-6 rounded-2xl overflow-hidden shadow-lg">
            <img
              src="/books.jpg"
              alt="Open book on desk"
              loading="lazy"
              className="block w-full h-[clamp(120px,16vh,220px)] object-cover object-center"
            />
          </div>

          <div className="mb-3 min-h-[100px] overflow-y-auto rounded-xl bg-[#F8F6EE]/50 border border-[#E8EBE4] p-3" role="log" aria-live="polite" aria-label="Chat conversation">
            {messages.map((msg, idx) => (
              <ChatMessage 
                key={idx} 
                message={msg.text} 
                isUser={msg.isUser} 
                messageIndex={idx}
                chatMode={chatMode}
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
                      const newThemes = extractThemes(recommendations);
                      setTasteProfile(prev => ({
                        likedBooks: [...prev.likedBooks, ...recommendations.map(r => ({ title: r.title, author: r.author }))],
                        likedThemes: [...new Set([...prev.likedThemes, ...newThemes])],
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
                  } else if (action === 'show_more') {
                    // Direct "show more" - use the recommended books as context
                    const titles = recommendations.map(r => r.title).join(', ');
                    setInputValue(`Show me more books like: ${titles}`);
                    setTimeout(() => {
                      const sendButton = document.querySelector('button[aria-label="Send message"]');
                      if (sendButton) sendButton.click();
                    }, 50);
                    track('show_more_clicked', {
                      recommendation_count: recommendations.length
                    });
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
                user={user}
                readingQueue={readingQueue}
                onAddToQueue={handleAddToReadingQueue}
                onRemoveFromQueue={handleRemoveFromReadingQueue}
                onShowAuthModal={() => setShowAuthModal(true)}
              />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <img 
                  src="/sarah.png" 
                  alt="Sarah"
                  className="w-10 h-10 rounded-full object-cover mr-3 border-2 border-[#D4DAD0] flex-shrink-0"
                />
                <div className="bg-[#F8F6EE] rounded-2xl rounded-bl-sm px-5 py-4 border border-[#E8EBE4] min-w-[280px]">
                  <div className="space-y-2.5">
                    {/* Library Check */}
                    <div className="flex items-center gap-2">
                      {loadingProgress.step === 'library' && loadingProgress.progress < 100 ? (
                        <div className="w-4 h-4 border-2 border-[#96A888] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-[#5F7252] flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      <span className={`text-xs ${loadingProgress.step === 'library' && loadingProgress.progress < 100 ? 'text-[#5F7252] font-medium' : 'text-[#96A888]'}`}>
                        Checking my library
                      </span>
                    </div>

                    {/* World Search */}
                    {(loadingProgress.step === 'world' || loadingProgress.step === 'matching' || loadingProgress.step === 'preparing') && (
                      <div className="flex items-center gap-2">
                        {loadingProgress.step === 'world' ? (
                          <div className="w-4 h-4 border-2 border-[#96A888] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-[#5F7252] flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        <span className={`text-xs ${loadingProgress.step === 'world' ? 'text-[#5F7252] font-medium' : 'text-[#96A888]'}`}>
                          Searching the world's library
                        </span>
                      </div>
                    )}

                    {/* Finding Best Matches */}
                    {(loadingProgress.step === 'matching' || loadingProgress.step === 'preparing') && (
                      <div className="flex items-center gap-2">
                        {loadingProgress.step === 'matching' ? (
                          <div className="w-4 h-4 border-2 border-[#96A888] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-[#5F7252] flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        <span className={`text-xs ${loadingProgress.step === 'matching' ? 'text-[#5F7252] font-medium' : 'text-[#96A888]'}`}>
                          Finding your best matches
                        </span>
                      </div>
                    )}

                    {/* Preparing */}
                    {loadingProgress.step === 'preparing' && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#96A888] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-[#5F7252] font-medium">
                          Preparing your picks
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="bg-[#F8F6EE] rounded-2xl border border-[#E8EBE4] shadow-sm p-3 sm:p-4 flex items-center gap-3">
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
                placeholder="Describe your perfect next read..."
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

          {messages.length > 1 && chatMode === 'library' && (
            <div className="mb-3 px-4 py-2.5 bg-[#F8F6EE] rounded-xl border border-[#E8EBE4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#7A8F6C]" />
                <span className="text-xs text-[#5F7252] font-medium">
                  Continuing conversation ({messages.length - 1} {messages.length === 2 ? 'message' : 'messages'})
                </span>
              </div>
              <button
                onClick={handleNewSearch}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#D4DAD0] hover:bg-[#F8F6EE] text-[#5F7252] text-xs font-medium transition-colors"
                aria-label="Start new search"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                New Search
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

          {/* Theme Filter Section */}
          <div className="mb-6 mt-3">
            <p className="text-center text-xs text-[#7A8F6C] mb-3 font-light">Common themes in my collection</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {Object.entries(themeInfo).map(([key, info]) => {
              const isSelected = selectedThemes.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedThemes(prev => prev.filter(t => t !== key));
                      setInputValue('');
                      
                      // Track theme deselection
                      track('theme_filter_removed', {
                        theme: key,
                        theme_label: info.label
                      });
                    } else {
                      setSelectedThemes(prev => [...prev, key]);
                      const themeText = `Show me options in ${info.label.toLowerCase()}.`;
                      setInputValue(themeText);
                      
                      // Track theme selection
                      track('theme_filter_selected', {
                        theme: key,
                        theme_label: info.label,
                        chat_mode: chatMode
                      });
                      
                      // Auto-resize textarea after setting value
                      setTimeout(() => {
                        const textarea = document.querySelector('textarea[placeholder="Describe your perfect next read..."]');
                        if (textarea) {
                          textarea.style.height = '24px';
                          const newHeight = Math.min(textarea.scrollHeight, 200);
                          textarea.style.height = newHeight + 'px';
                        }
                      }, 0);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-[#5F7252] border-[#5F7252] text-white shadow-sm'
                      : 'border-[#D4DAD0] bg-white text-[#5F7252] hover:border-[#96A888] hover:bg-[#F8F6EE]'
                  }`}
                  aria-label={`${info.label} theme filter`}
                  aria-pressed={isSelected}
                  title={`${info.label} — ${themeDescriptions[key]}${isSelected ? ' (active filter)' : ''}`}
                >
                  {info.icon && <info.icon className="w-4 h-4" />}
                  <span>{info.label}</span>
                </button>
              );
            })}
            </div>
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

          <div className="mt-16 sm:mt-20 text-center">
            <div className="text-xs text-[#7A8F6C] font-light">A Curated Collection of Infinite Possibilities</div>
          </div>

        </main>
      )}

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
                  <Library className="w-6 h-6 text-[#5F7252]" />
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-8 border border-[#E8EBE4] relative max-h-[calc(100vh-4rem)]">
            <div className="sticky top-0 bg-white rounded-t-2xl z-10 px-6 pt-6 pb-3 border-b border-[#E8EBE4]">
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 p-1 hover:bg-[#E8EBE4] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#96A888]" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-8rem)] px-6 pb-6">
              <Suspense fallback={<LoadingFallback message="Loading Profile..." />}>
                <UserProfile
                  tasteProfile={tasteProfile}
                />
              </Suspense>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
