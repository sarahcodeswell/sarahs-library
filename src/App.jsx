import React, { useState, useRef, useEffect, lazy, Suspense, useMemo, useCallback } from 'react';
import { Book, Star, MessageCircle, X, Send, ExternalLink, Library, ShoppingBag, Heart, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Share2, Upload, Plus, User as UserIcon, Menu, Home, BookOpen, Mail, ArrowLeft, Bookmark, BookHeart, Users, Sparkles, Scale, RotateCcw, MessageSquare, BookMarked, Headphones, BookCheck } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { track } from '@vercel/analytics';
import bookCatalog from './books.json';
import { db } from './lib/supabase';
import { extractThemes } from './lib/themeExtractor';
import { getRecommendations, parseRecommendations } from './lib/recommendationService';
import { validateMessage, validateBook } from './lib/validation';
import { cacheUtils } from './lib/cache';
import { normalizeTitle, normalizeAuthor, safeNumber, bumpLocalMetric } from './lib/textUtils';
import { parseGoodreadsCsv } from './lib/csvParser';
import { buildLibraryContext } from './lib/libraryContext';
import AuthModal from './components/AuthModal';
import LoadingFallback from './components/LoadingFallback';
import ErrorBoundary from './components/ErrorBoundary';
import Footer from './components/Footer';
import { useUser, useReadingQueue, useRecommendations } from './contexts';

// Lazy load heavy components
const UserProfile = lazy(() => import('./components/UserProfile'));
const AboutPage = lazy(() => import('./components/AboutPage'));
const MeetSarahPage = lazy(() => import('./components/MeetSarahPage'));
const ShopPage = lazy(() => import('./components/ShopPage'));
const MyCollectionPage = lazy(() => import('./components/MyCollectionPage'));
const MyBooksPage = lazy(() => import('./components/MyBooksPage'));
const MyReadingQueuePage = lazy(() => import('./components/MyReadingQueuePage'));
const MyRecommendationsPage = lazy(() => import('./components/MyRecommendationsPage'));
const OurPracticesPage = lazy(() => import('./components/OurPracticesPage'));
const SharedRecommendationPage = lazy(() => import('./components/SharedRecommendationPage'));

const BOOKSHOP_AFFILIATE_ID = '119544';
const AMAZON_AFFILIATE_TAG = 'sarahsbooks01-20';
const LIBRO_FM_AFFILIATE_ID = 'sarahsbooks'; // TODO: Replace with actual affiliate ID when available
const AUDIBLE_AFFILIATE_TAG = 'sarahsbooks01-20'; // Uses Amazon Associates
const CURRENT_YEAR = new Date().getFullYear();

// Text utilities imported from ./lib/textUtils

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

// CSV parsing imported from ./lib/csvParser
// Library context builder imported from ./lib/libraryContext

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

// parseRecommendations moved to recommendationService.js

// Check if message contains structured recommendations
function hasStructuredRecommendations(text) {
  const t = String(text || '');
  return t.includes('Title:') && (t.includes('Author:') || t.includes('Why This Fits:') || t.includes('Why:') || t.includes('Description:') || t.includes('Reputation:'));
}

function RecommendationCard({ rec, chatMode, user, readingQueue, onAddToQueue, onRemoveFromQueue, onShowAuthModal }) {
  const [addingToQueue, setAddingToQueue] = useState(false);
  const [addedToQueue, setAddedToQueue] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [showPurchaseIntent, setShowPurchaseIntent] = useState(false);
  const [markedAsRead, setMarkedAsRead] = useState(false);
  
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

  // Check if book is in queue with "want_to_read" or "reading" status
  const isInQueue = readingQueue?.some(
    queueBook => normalizeTitle(queueBook.book_title) === normalizeTitle(rec.title) &&
                 (queueBook.status === 'want_to_read' || queueBook.status === 'reading')
  );
  
  // Check if book is already marked as finished
  const isFinished = readingQueue?.some(
    queueBook => normalizeTitle(queueBook.book_title) === normalizeTitle(rec.title) &&
                 queueBook.status === 'finished'
  );

  const handleAddToQueue = async (e) => {
    e.stopPropagation();
    if (!user || addingToQueue) return false;
    
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
      return false;
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
      return true;
    } else {
      // Track failed save
      track('recommendation_save_failed', {
        book_title: rec.title,
        chat_mode: chatMode
      });
      return false;
    }
  };

  const handleAlreadyRead = async (e) => {
    e.stopPropagation();
    if (!user) {
      onShowAuthModal();
      return;
    }
    
    // Set flag to prevent Want to Read button from activating
    setMarkedAsRead(true);
    
    // Add to reading queue with 'finished' status
    setAddingToQueue(true);
    const success = await onAddToQueue({
      ...rec,
      status: 'finished'
    });
    setAddingToQueue(false);
    
    if (success) {
      setShowRatingPrompt(true);
      // Don't show acquisition options for Already Read - only rating
      
      track('recommendation_marked_read', {
        book_title: rec.title,
        book_author: displayAuthor,
        chat_mode: chatMode
      });
    }
  };

  const handleNotForMe = async (e) => {
    e.stopPropagation();
    
    // Track dismissal in database for exclusion
    if (user) {
      const result = await db.addDismissedRecommendation(user.id, rec.title, displayAuthor);
      if (result.error) {
        console.error('[NotForMe] Failed to save dismissal:', result.error);
      } else if (import.meta.env.DEV) {
        console.log('[NotForMe] Dismissed book saved:', rec.title);
      }
    }
    
    track('recommendation_dismissed', {
      book_title: rec.title,
      book_author: displayAuthor,
      chat_mode: chatMode,
      has_catalog_match: !!catalogBook
    });
    
    // Delay dismissal to show animation
    setTimeout(() => setDismissed(true), 300);
  };

  const handleWantToRead = async (e) => {
    e.stopPropagation();
    if (!user) {
      onShowAuthModal();
      return;
    }
    
    const success = await handleAddToQueue(e);
    
    if (success) {
      track('want_to_read_added', {
        book_title: rec.title,
        book_author: displayAuthor,
        chat_mode: chatMode
      });
      
      // Show confirmation then dismiss
      setShowPurchaseIntent(true);
      setTimeout(() => setDismissed(true), 2500);
    }
  };

  return (
    <div 
      className={`bg-[#FDFBF4] rounded-xl border border-[#D4DAD0] p-4 transition-all duration-300 ${
        dismissed ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{ display: dismissed ? 'none' : 'block' }}
    >
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
            disabled={addingToQueue || isFinished}
            className={`py-2.5 px-2 sm:px-3 rounded-lg text-xs font-medium transition-colors border flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${
              isFinished
                ? 'bg-[#5F7252] border-[#5F7252] text-white'
                : 'bg-white border-[#5F7252] text-[#5F7252] hover:bg-[#F8F6EE]'
            }`}
            title="I've already read this book"
          >
            <BookCheck className="w-4 h-4 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs leading-tight">Already Read</span>
          </button>

          {/* Want to Read Button */}
          <button
            onClick={handleWantToRead}
            disabled={addingToQueue || markedAsRead}
            className={`py-2.5 px-2 sm:px-3 rounded-lg text-xs font-medium transition-colors border flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${
              (isInQueue && !markedAsRead)
                ? 'bg-[#7A8F6C] border-[#7A8F6C] text-white' 
                : 'bg-white border-[#5F7252] text-[#5F7252] hover:bg-[#F8F6EE]'
            }`}
            title={user ? (isInQueue ? 'Saved to reading queue' : 'Save to reading queue') : 'Sign in to save books'}
          >
            <BookMarked className={`w-4 h-4 flex-shrink-0 ${(isInQueue && !markedAsRead) ? 'fill-current' : ''}`} />
            <span className="text-[10px] sm:text-xs leading-tight">Want to Read</span>
          </button>

          {/* Not For Me Button */}
          <button
            onClick={handleNotForMe}
            className="py-2.5 px-2 sm:px-3 rounded-lg text-xs font-medium transition-colors bg-white border border-[#D4DAD0] text-[#7A8F6C] hover:bg-[#F8F6EE] flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5"
            title="Not interested in this recommendation"
          >
            <X className="w-4 h-4 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs leading-tight">Not For Me</span>
          </button>
        </div>

        {/* Rating Prompt (shows after "Already Read") */}
        {(showRatingPrompt || isFinished) && (
          <div className="mt-3 p-3 bg-[#F8F6EE] rounded-lg border border-[#E8EBE4]">
            {userRating && userRating > 0 ? (
              <div className="text-center">
                <p className="text-xs font-medium text-[#5F7252] mb-1">✓ Added to your Collection</p>
                <p className="text-xs text-[#7A8F6C]">
                  We'll use your {userRating}-star rating to improve future recommendations
                </p>
              </div>
            ) : userRating === -1 ? (
              <div className="text-center">
                <p className="text-xs font-medium text-[#5F7252] mb-1">✓ Added to your Collection</p>
                <p className="text-xs text-[#7A8F6C]">
                  You can rate this book later. Ratings help us improve your recommendations!
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs font-medium text-[#4A5940] mb-2">How would you rate it?</p>
                <div className="flex items-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={async () => {
                    setUserRating(star);
                    
                    // Find the book in reading queue and update its rating
                    const queueItem = readingQueue.find(
                      qb => normalizeTitle(qb.book_title) === normalizeTitle(rec.title)
                    );
                    
                    if (queueItem) {
                      try {
                        await db.updateReadingQueueItem(queueItem.id, { rating: star });
                      } catch (error) {
                        console.error('Failed to save rating:', error);
                      }
                    }
                    
                    track('recommendation_rated', {
                      book_title: rec.title,
                      rating: star,
                      chat_mode: chatMode
                    });
                    
                    // After rating, show confirmation and dismiss card
                    setTimeout(() => {
                      setShowRatingPrompt(false);
                      setDismissed(true);
                    }, 1500);
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
                <button
                  onClick={() => {
                    track('recommendation_rated_later', {
                      book_title: rec.title,
                      book_author: displayAuthor,
                      chat_mode: chatMode
                    });
                    
                    // Show confirmation message
                    setUserRating(-1); // Special value to show "rate later" confirmation
                    
                    // Dismiss card after showing confirmation
                    setTimeout(() => setDismissed(true), 2500);
                  }}
                  className="w-full py-2 px-3 rounded-lg text-xs font-medium transition-colors bg-white border border-[#D4DAD0] text-[#7A8F6C] hover:bg-[#F8F6EE]"
                >
                  Rate Later
                </button>
              </>
            )}
          </div>
        )}

        {/* Want to Read Confirmation */}
        {showPurchaseIntent && (
          <div className="mt-3 p-3 bg-[#F8F6EE] rounded-lg border border-[#E8EBE4] text-center">
            <p className="text-xs font-medium text-[#5F7252] mb-1">
              ✓ Added to your Reading Queue
            </p>
            <p className="text-xs text-[#7A8F6C]">
              Find acquisition options in your Reading Queue
            </p>
          </div>
        )}
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

// getSystemPrompt removed - now handled in recommendationService.js

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
            <p className="mb-3">I'll recommend the perfect book for you—whether from my curated collection of 200+ beloved titles or discoveries from the world's library.</p>
            <p>Look for <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#5F7252]/10 text-[#5F7252] text-[10px] font-semibold"><Library className="w-3 h-3" />From My Library</span> or <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#7A8F6C]/10 text-[#7A8F6C] text-[10px] font-semibold"><Sparkles className="w-3 h-3" />World Discovery</span> to see the source!</p>
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
  const { recommendations } = useRecommendations();
  
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
    { text: "Hi, I'm Sarah!\n\nI'll recommend the perfect book for you—whether from my curated collection of 200+ beloved titles or discoveries from the world's library.\n\nWhat are you in the mood for?", isUser: false }
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
  const [showSignInNudge, setShowSignInNudge] = useState(false);
  const [showThemeLists, setShowThemeLists] = useState(false);
  const [signInNudgeDismissed, setSignInNudgeDismissed] = useState(false);
  const attachmentMenuRef = useRef(null);
  const chatStorageKey = 'sarah_books_chat_history_v1';
  const lastActivityRef = useRef(Date.now());
  const sessionIdRef = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  // Navigation state
  const [currentPage, setCurrentPage] = useState('home');
  const [showNavMenu, setShowNavMenu] = useState(false);
  const navMenuRef = useRef(null);
  const [shareToken, setShareToken] = useState(null);

  // Listen for profile close event
  useEffect(() => {
    const handleCloseProfile = () => {
      setShowAuthModal(false);
    };
    window.addEventListener('closeProfile', handleCloseProfile);
    return () => window.removeEventListener('closeProfile', handleCloseProfile);
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    // Set initial page based on URL
    const getPageFromPath = (pathname) => {
      const pathParts = pathname.replace(/^\//, '').split('/');
      const path = pathParts[0] || 'home';
      
      // Handle shared recommendation URLs (/r/TOKEN)
      if (path === 'r' && pathParts[1]) {
        return { page: 'shared-recommendation', token: pathParts[1] };
      }
      
      const validPages = ['home', 'reading-queue', 'collection', 'my-books', 'add-books', 'recommendations', 'how-it-works', 'meet-sarah', 'shop', 'our-practices'];
      if (path === 'add-books') return { page: 'my-books', token: null };
      return { page: validPages.includes(path) ? path : 'home', token: null };
    };

    // Set initial page from URL on mount
    const { page: initialPage, token } = getPageFromPath(window.location.pathname);
    if (initialPage === 'shared-recommendation' && token) {
      setCurrentPage('shared-recommendation');
      setShareToken(token);
    } else if (initialPage !== 'home') {
      setCurrentPage(initialPage);
    }

    // Handle popstate (back/forward button)
    const handlePopState = () => {
      const { page, token } = getPageFromPath(window.location.pathname);
      if (page === 'shared-recommendation' && token) {
        setCurrentPage('shared-recommendation');
        setShareToken(token);
      } else {
        setCurrentPage(page);
        setShareToken(null);
      }
      window.scrollTo(0, 0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // systemPrompt no longer needed - handled in recommendationService

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
      
      // Log to console for debugging (dev only)
      if (import.meta.env.DEV) console.log('📊 Performance Metrics:', {
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
      text: "Hi, I'm Sarah!\n\nI'll recommend the perfect book for you—whether from my curated collection of 200+ beloved titles or discoveries from the world's library.\n\nWhat are you in the mood for?",
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
    const description = String(book.description || '').trim();
    const why = String(book.why || '').trim();
    const status = book.status || 'want_to_read';
    
    if (import.meta.env.DEV) console.log('[handleAddToReadingQueue] Book data:', {
      title,
      author,
      description: description.substring(0, 50) + '...',
      why: why.substring(0, 50) + '...',
      status
    });
    
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
    
    // Pass all available book data to the queue
    const result = await addToQueue({ 
      title, 
      author, 
      description, 
      why,
      status
    });
    
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

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    
    // Validate input
    try {
      validateMessage({ message: userMessage });
    } catch (error) {
      setMessages(prev => [...prev, {
        text: "Please enter a valid message (max 1000 characters).",
        isUser: false
      }]);
      return;
    }

    setInputValue('');
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setIsLoading(true);
    setLoadingProgress({ step: 'library', progress: 0 });
    lastActivityRef.current = Date.now();

    track('chat_message', {
      mode: chatMode,
      message_length: userMessage.length
    });

    try {
      // Update progress
      setTimeout(() => setLoadingProgress({ step: 'world', progress: 50 }), 500);
      setTimeout(() => setLoadingProgress({ step: 'matching', progress: 0 }), 1000);

      // NEW CLEAN RECOMMENDATION SERVICE
      const result = await getRecommendations(user?.id, userMessage, readingQueue, selectedThemes);
      
      if (!result.success) {
        setMessages(prev => [...prev, {
          text: result.error || "I'm having trouble thinking right now. Could you try again?",
          isUser: false
        }]);
        return;
      }

      // Update progress: preparing recommendations
      setLoadingProgress({ step: 'preparing', progress: 100 });
      
      // POST-AI FILTERING: Remove duplicates and excluded books
      let cleanedText = result.text;
      const exclusionList = result.exclusionList || [];
      const recs = parseRecommendations(result.text);
      
      // Remove duplicates (case-insensitive title matching)
      const seenTitles = new Set();
      const uniqueRecs = recs.filter(rec => {
        const normalizedTitle = normalizeTitle(rec.title);
        if (seenTitles.has(normalizedTitle)) {
          if (import.meta.env.DEV) console.log('[Filter] Removed duplicate:', rec.title);
          return false;
        }
        seenTitles.add(normalizedTitle);
        return true;
      });
      
      // Filter out books in exclusion list
      const validRecs = uniqueRecs.filter(rec => {
        const isExcluded = exclusionList.some(excludedTitle => 
          normalizeTitle(excludedTitle) === normalizeTitle(rec.title)
        );
        
        if (isExcluded) {
          if (import.meta.env.DEV) console.log('[Filter] Removed excluded book:', rec.title);
          return false;
        }
        return true;
      });
      
      // Rebuild response if we filtered anything out
      if (validRecs.length < recs.length) {
        if (validRecs.length === 0) {
          cleanedText = "I'm having trouble finding books that aren't already in your collection. Try asking for something more specific or from a different genre!";
        } else {
          // Rebuild with valid recommendations only
          const parts = ['My Top 3 Picks for You\n'];
          validRecs.forEach((rec, i) => {
            parts.push(`\n[RECOMMENDATION ${i + 1}]`);
            parts.push(`Title: ${rec.title}`);
            if (rec.author) parts.push(`Author: ${rec.author}`);
            if (rec.why) parts.push(`Why This Fits: ${rec.why}`);
            if (rec.description) parts.push(`Description: ${rec.description}`);
            if (rec.reputation) parts.push(`Reputation: ${rec.reputation}`);
          });
          cleanedText = parts.join('\n');
        }
      }
      
      // Strip verbose intro text, keep only "My Top 3 Picks for You" and recommendations
      const lines = cleanedText.split('\n');
      const startIndex = lines.findIndex(line => line.includes('My Top 3 Picks for You'));
      if (startIndex > 0) {
        cleanedText = lines.slice(startIndex).join('\n');
      }
      
      setMessages(prev => [...prev, { text: cleanedText, isUser: false }]);
      
      // Show sign-in nudge for non-signed-in users after first recommendation
      if (!user && !signInNudgeDismissed && messages.length >= 1) {
        setShowSignInNudge(true);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        text: "Oops, I'm having a moment. Let me catch my breath and try again!",
        isUser: false
      }]);
    } finally {
      setIsLoading(false);
      setLoadingProgress({ step: '', progress: 0 });
    }
  }, [inputValue, isLoading, chatMode, messages, user, signInNudgeDismissed]);

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
              {/* Hamburger Menu - only for logged-in users */}
              {user && (
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
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-lg border border-[#E8EBE4] shadow-lg py-1 min-w-[220px] z-50">
                      {/* Home */}
                      <button
                        onClick={() => {
                          setCurrentPage('home');
                          setShowNavMenu(false);
                          window.scrollTo(0, 0);
                          window.history.pushState({}, '', '/');
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-[#4A5940] hover:bg-[#F8F6EE] transition-colors flex items-center gap-3"
                      >
                        <Home className="w-4 h-4" />
                        Home
                      </button>
                      
                      {/* MY LIBRARY Section */}
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
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-[#4A5940] hover:bg-[#F8F6EE] transition-colors flex items-center gap-3"
                      >
                        <BookMarked className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1">Reading Queue</span>
                        {readingQueue.filter(b => b.status === 'want_to_read').length > 0 && (
                          <span className="flex-shrink-0 min-w-[20px] h-5 text-[10px] font-medium bg-[#5F7252] text-white rounded-full flex items-center justify-center">
                            {readingQueue.filter(b => b.status === 'want_to_read').length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setCurrentPage('collection');
                          setShowNavMenu(false);
                          window.scrollTo(0, 0);
                          window.history.pushState({}, '', '/collection');
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-[#4A5940] hover:bg-[#F8F6EE] transition-colors flex items-center gap-3"
                      >
                        <Library className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1">My Collection</span>
                        {readingQueue.filter(b => b.status === 'finished').length > 0 && (
                          <span className="flex-shrink-0 min-w-[20px] h-5 text-[10px] font-medium bg-[#5F7252] text-white rounded-full flex items-center justify-center">
                            {readingQueue.filter(b => b.status === 'finished').length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setCurrentPage('my-books');
                          setShowNavMenu(false);
                          window.scrollTo(0, 0);
                          window.history.pushState({}, '', '/add-books');
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-[#4A5940] hover:bg-[#F8F6EE] transition-colors flex items-center gap-3"
                      >
                        <Upload className="w-4 h-4" />
                        Add Books
                      </button>
                      
                      {/* SHARING Section */}
                      <div className="border-t border-[#E8EBE4] my-1"></div>
                      <div className="px-4 py-2 text-xs font-medium text-[#96A888] uppercase tracking-wide">
                        Sharing
                      </div>
                      <button
                        onClick={() => {
                          setCurrentPage('recommendations');
                          setShowNavMenu(false);
                          window.scrollTo(0, 0);
                          window.history.pushState({}, '', '/recommendations');
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-[#4A5940] hover:bg-[#F8F6EE] transition-colors flex items-center gap-3"
                      >
                        <Share2 className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1">Books I've Shared</span>
                        {recommendations.length > 0 && (
                          <span className="flex-shrink-0 min-w-[20px] h-5 text-[10px] font-medium bg-[#5F7252] text-white rounded-full flex items-center justify-center">
                            {recommendations.length}
                          </span>
                        )}
                      </button>
                      
                      {/* Profile & Sign Out */}
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
                      </div>
                  )}
                </div>
              )}
              
              {/* Logo + Title */}
              <button 
                onClick={() => {
                  setCurrentPage('home');
                  window.scrollTo(0, 0);
                  window.history.pushState({}, '', '/');
                }}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div>
                  <h1 className="font-serif text-xl sm:text-2xl text-[#4A5940]">Sarah's Books</h1>
                  <p className="text-xs text-[#7A8F6C] font-light tracking-wide flex items-center gap-1">For the <Heart className="w-3 h-3 fill-[#c96b6b] text-[#c96b6b] inline" /> of reading</p>
                </div>
              </button>
            </div>
            
            {/* Right: Profile/Sign In */}
            <div className="flex items-center gap-2 sm:gap-3">
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
        <Suspense fallback={<LoadingFallback message="Loading How It Works..." />}>
          <AboutPage onNavigate={setCurrentPage} />
        </Suspense>
      )}

      {currentPage === 'meet-sarah' && (
        <Suspense fallback={<LoadingFallback message="Loading Meet Sarah..." />}>
          <MeetSarahPage onNavigate={setCurrentPage} />
        </Suspense>
      )}
      
      {currentPage === 'shop' && (
        <Suspense fallback={<LoadingFallback message="Loading Shop..." />}>
          <ShopPage onNavigate={setCurrentPage} />
        </Suspense>
      )}

      {currentPage === 'our-practices' && (
        <Suspense fallback={<LoadingFallback message="Loading Our Practices..." />}>
          <OurPracticesPage onNavigate={setCurrentPage} />
        </Suspense>
      )}

      {currentPage === 'shared-recommendation' && shareToken && (
        <Suspense fallback={<LoadingFallback message="Loading recommendation..." />}>
          <SharedRecommendationPage 
            shareToken={shareToken}
            onNavigate={setCurrentPage}
            onShowAuthModal={() => setShowAuthModal(true)}
          />
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

          {/* Sign-In Nudge Banner - Shows after recommendations for non-signed-in users */}
          {showSignInNudge && !user && (
            <div className="mb-3 p-3 bg-[#5F7252]/10 rounded-xl border border-[#5F7252]/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-[#4A5940]">
                <Library className="w-4 h-4 text-[#5F7252] flex-shrink-0" />
                <span>
                  <strong>Already own some of these?</strong> Sign in to add your collection—I'll personalize future recommendations.
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setShowAuthModal(true);
                    track('sign_in_nudge_clicked');
                  }}
                  className="px-3 py-1.5 bg-[#5F7252] text-white text-xs font-medium rounded-lg hover:bg-[#4A5940] transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setShowSignInNudge(false);
                    setSignInNudgeDismissed(true);
                    track('sign_in_nudge_dismissed');
                  }}
                  className="p-1 text-[#96A888] hover:text-[#5F7252] transition-colors"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

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
                onClick={() => setChatMode('library')}
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

          {/* Sarah's Curated Lists - Collapsible */}
          <div className="mb-6 mt-3">
            <button
              onClick={() => setShowThemeLists(prev => !prev)}
              className="mx-auto flex items-center gap-1.5 text-xs text-[#7A8F6C] hover:text-[#5F7252] transition-colors"
            >
              <span>Or browse Sarah's Curated Lists</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showThemeLists ? 'rotate-180' : ''}`} />
            </button>
            
            {showThemeLists && (
              <div className="mt-3 max-w-sm mx-auto">
                {Object.entries(themeInfo).map(([key, info]) => {
                const isSelected = selectedThemes.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedThemes([]);
                        setInputValue('');
                        
                        track('theme_filter_removed', {
                          theme: key,
                          theme_label: info.label
                        });
                      } else {
                        setSelectedThemes([key]);
                        const themeText = `Show me options in ${info.label.toLowerCase()}.`;
                        setInputValue(themeText);
                        
                        track('theme_filter_selected', {
                          theme: key,
                          theme_label: info.label,
                          chat_mode: chatMode
                        });
                        
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
                    className={`w-full px-3 py-2 text-left text-sm transition-all flex items-center gap-2 border-b border-[#E8EBE4] last:border-b-0 ${
                      isSelected
                        ? 'bg-[#5F7252]/10 text-[#4A5940] font-medium'
                        : 'text-[#5F7252] hover:bg-[#F8F6EE]'
                    }`}
                    aria-label={`${info.label} theme filter`}
                    aria-pressed={isSelected}
                    title={themeDescriptions[key]}
                  >
                    {info.icon && <info.icon className="w-4 h-4 flex-shrink-0" />}
                    <span>{info.label}</span>
                    {isSelected && <span className="ml-auto text-xs text-[#5F7252]">✓</span>}
                  </button>
                );
              })}
              </div>
            )}
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

          {/* Create Profile CTA for logged-out users */}
          {!user && (
            <div className="mt-6 bg-[#F8F6EE] rounded-2xl border border-[#D4DAD0] p-5 text-center">
              <h3 className="font-serif text-lg text-[#4A5940] mb-2">Get Better Recommendations</h3>
              <p className="text-sm text-[#7A8F6C] mb-4 leading-relaxed">
                Create a free profile to add your books, share favorite authors, and get personalized recommendations based on your reading preferences.
              </p>
              <button
                onClick={() => {
                  setShowAuthModal(true);
                  track('create_profile_cta_clicked');
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5F7252] text-white text-sm font-medium rounded-lg hover:bg-[#4A5940] transition-colors"
              >
                <UserIcon className="w-4 h-4" />
                Create Your Profile
              </button>
            </div>
          )}

          
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

      {/* Footer */}
      <Footer onNavigate={setCurrentPage} currentPage={currentPage} />

    </div>
  );
}
