import React, { useState, useMemo } from 'react';
import { Library, Sparkles, Heart, Share2, Star, BookCheck, BookMarked, X } from 'lucide-react';
import { BookCover, GenreBadges, ReputationBox, ExpandToggle, Badge } from './ui';
import { track } from '@vercel/analytics';
import { db } from '../lib/supabase';
import { normalizeTitle } from '../lib/textUtils';
import { stripAccoladesFromDescription } from '../lib/descriptionUtils';
import { ExpandableDescription } from './ExpandableDescription';
import { useBookEnrichment } from './BookCard';
import { themeInfo } from '../lib/constants';
import { findCatalogBook } from '../lib/catalogIndex';
import { getGoodreadsSearchUrl } from '../lib/affiliateLinks';

/**
 * RecommendationCard - Displays a single book recommendation with actions
 * 
 * Props:
 * - rec: The recommendation object (title, author, why, etc.)
 * - chatMode: Current chat mode ('library' or 'discover')
 * - user: Current authenticated user
 * - readingQueue: User's reading queue array
 * - userRecommendations: User's saved recommendations
 * - onAddToQueue: Callback to add book to queue
 * - onRemoveFromQueue: Callback to remove book from queue
 * - onShowAuthModal: Callback to show auth modal
 */
export default function RecommendationCard({ 
  rec, 
  chatMode, 
  user, 
  readingQueue, 
  userRecommendations, 
  onAddToQueue, 
  onRemoveFromQueue, 
  onShowAuthModal 
}) {
  const [addingToQueue, setAddingToQueue] = useState(false);
  const [addedToQueue, setAddedToQueue] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [showPurchaseIntent, setShowPurchaseIntent] = useState(false);
  const [markedAsRead, setMarkedAsRead] = useState(false);
  
  // Look up full book details from local catalog using shared function
  const catalogBook = useMemo(() => findCatalogBook(rec?.title), [rec.title]);

  // Auto-enrich with cover and genres using shared hook
  // Skip enrichment if we already have verified data from the recommendation service
  const { coverUrl, genres, description: enrichedDescription, isbn, isEnriching, enrichedData } = useBookEnrichment(
    rec.title,
    rec.author || catalogBook?.author,
    rec.coverUrl || null,
    []
  );

  const displayAuthor = String(rec?.author || catalogBook?.author || '').trim();
  const displayWhy = String(rec?.why || '').trim();
  const fullDescription = catalogBook?.description || enrichedDescription || rec.description;

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
  
  // Get user's rating for this book (from reading queue)
  const userBookRating = useMemo(() => {
    const queueItem = readingQueue?.find(
      queueBook => normalizeTitle(queueBook.book_title) === normalizeTitle(rec.title) &&
                   queueBook.status === 'finished'
    );
    return queueItem?.rating || null;
  }, [readingQueue, rec.title]);
  
  // Check if user has recommended this book
  const hasUserRecommended = useMemo(() => {
    return userRecommendations?.some(
      r => normalizeTitle(r.book_title) === normalizeTitle(rec.title)
    );
  }, [userRecommendations, rec.title]);

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
    // Pass the best available data (catalog > enriched > AI response)
    const bookWithEnrichment = {
      ...rec,
      description: fullDescription || rec.description,
      cover_image_url: enrichedData?.coverUrl || null,
      genres: enrichedData?.genres || [],
      isbn: enrichedData?.isbn || null,
      isbn13: enrichedData?.isbn13 || null,
      reputation: rec.reputation || null,
    };
    const success = await onAddToQueue(bookWithEnrichment);
    setAddingToQueue(false);
    
    if (success) {
      setAddedToQueue(true);
      setTimeout(() => setAddedToQueue(false), 2000);
      
      track('recommendation_saved', {
        book_title: rec.title,
        book_author: displayAuthor,
        chat_mode: chatMode,
        has_catalog_match: !!catalogBook
      });
      return true;
    } else {
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
    
    setMarkedAsRead(true);
    
    setAddingToQueue(true);
    const success = await onAddToQueue({
      ...rec,
      description: fullDescription || rec.description,
      cover_image_url: enrichedData?.coverUrl || null,
      genres: enrichedData?.genres || [],
      isbn: enrichedData?.isbn || null,
      isbn13: enrichedData?.isbn13 || null,
      status: 'already_read'
    });
    setAddingToQueue(false);
    
    if (success) {
      setShowRatingPrompt(true);
      
      track('recommendation_marked_read', {
        book_title: rec.title,
        book_author: displayAuthor,
        chat_mode: chatMode
      });
    }
  };

  const handleNotForMe = async (e) => {
    e.stopPropagation();
    
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
            Curator's Pick
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
        <div className="flex gap-3">
          <BookCover coverUrl={coverUrl} title={rec.title} isEnriching={isEnriching} />
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-[#4A5940] text-sm mb-1">{rec.title}</h4>
            {displayAuthor && <p className="text-xs text-[#7A8F6C] mb-1">{displayAuthor}</p>}
            
            <div className="mt-1 mb-1">
              <GenreBadges genres={genres} maxDisplay={2} />
            </div>
            
            {/* Why Sarah Recommends */}
            {displayWhy && (
              <div className="mt-2">
                <p className="text-xs font-medium text-[#4A5940] mb-1">Why Sarah recommends:</p>
                <p className="text-xs text-[#5F7252] leading-relaxed">{displayWhy}</p>
              </div>
            )}
            
            <ExpandToggle 
              expanded={expanded} 
              onToggle={() => {
                const newExpandedState = !expanded;
                setExpanded(newExpandedState);
                
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
              className="mt-2"
            />
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mb-4 pb-4 border-b border-[#E8EBE4]">
          {/* User's status with this book */}
          {(userBookRating || hasUserRecommended) && (
            <div className="mb-3 p-2 bg-[#F8F6EE] rounded-lg border border-[#E8EBE4]">
              <p className="text-xs font-medium text-[#4A5940] mb-1">Your history with this book:</p>
              <div className="flex flex-wrap gap-2">
                {userBookRating && (
                  <span className="text-xs text-[#5F7252] flex items-center gap-1">
                    <Heart className="w-3 h-3 text-[#C97B7B] fill-[#C97B7B]" />
                    Rated {userBookRating}/5
                  </span>
                )}
                {hasUserRecommended && (
                  <span className="text-xs text-[#5F7252] flex items-center gap-1">
                    <Share2 className="w-3 h-3" />
                    You've shared this
                  </span>
                )}
              </div>
            </div>
          )}
          
          {catalogBook?.favorite && (
            <div className="mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <p className="text-xs font-medium text-[#4A5940]">All-Time Favorite</p>
            </div>
          )}
          
          {/* About this book */}
          {(catalogBook?.description || rec.description || enrichedDescription) && (
            <div className="mb-3">
              <p className="text-xs font-medium text-[#4A5940] mb-1">About this book:</p>
              <ExpandableDescription 
                text={stripAccoladesFromDescription(catalogBook?.description || rec.description || enrichedDescription)}
              />
            </div>
          )}
          
          {/* Reputation/Accolades */}
          {rec.reputation && (
            <div className="mb-3">
              <ReputationBox reputation={rec.reputation} />
            </div>
          )}
          
          {catalogBook?.themes && (
            <div>
              <p className="text-xs font-medium text-[#4A5940] mb-2">Curator Themes:</p>
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
                    
                    setUserRating(-1);
                    
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
