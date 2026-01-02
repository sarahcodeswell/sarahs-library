import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { enrichBook } from '../lib/bookEnrichment';
import StarRating from './StarRating';

/**
 * Shared Book Info Display - the core visual layout used across all book cards
 * This provides consistent styling for cover, title, author, genres, description
 * 
 * @param {Object} props
 * @param {string} props.title - Book title
 * @param {string} props.author - Book author
 * @param {string} props.description - Book description
 * @param {string} props.coverUrl - Cover image URL
 * @param {Array} props.genres - Array of genre strings
 * @param {boolean} props.isEnriching - Whether enrichment is in progress
 * @param {boolean} props.showExpandButton - Whether to show expand/collapse
 * @param {boolean} props.expanded - Current expanded state
 * @param {function} props.onToggleExpand - Callback to toggle expanded
 * @param {React.ReactNode} props.children - Additional content below genres
 */
export function BookInfo({
  title,
  author,
  description,
  coverUrl,
  genres = [],
  isEnriching = false,
  showExpandButton = true,
  expanded = false,
  onToggleExpand,
  children,
}) {
  return (
    <div className="flex gap-3">
      {/* Cover Image */}
      {coverUrl ? (
        <div className="flex-shrink-0">
          <img 
            src={coverUrl} 
            alt={`Cover of ${title}`}
            className="w-12 h-18 object-cover rounded shadow-sm"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      ) : isEnriching ? (
        <div className="flex-shrink-0 w-12 h-18 bg-[#E8EBE4] rounded animate-pulse" />
      ) : null}
      
      {/* Book Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h4 className="font-medium text-[#4A5940] text-sm leading-tight">
              {title}
            </h4>
            
            {/* Author */}
            {author && (
              <p className="text-xs text-[#7A8F6C] font-light mt-0.5">
                {author}
              </p>
            )}
            
            {/* Genres */}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {genres.slice(0, 3).map((genre, idx) => (
                  <span 
                    key={idx}
                    className="px-1.5 py-0.5 text-[10px] bg-[#E8EBE4] text-[#5F7252] rounded"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {/* Expand/Collapse Button */}
          {showExpandButton && (description || onToggleExpand) && (
            <button
              onClick={onToggleExpand}
              className="p-1 hover:bg-[#E8EBE4] rounded transition-colors flex-shrink-0"
              aria-label={expanded ? "Show less" : "Show more"}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-[#7A8F6C]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#7A8F6C]" />
              )}
            </button>
          )}
        </div>
        
        {/* Description (collapsed view - 2 lines) */}
        {description && !expanded && (
          <p className="text-xs text-[#5F7252] leading-relaxed mt-2 line-clamp-2">
            {description}
          </p>
        )}
        
        {/* Additional content (rating, etc.) */}
        {children}
      </div>
    </div>
  );
}

/**
 * Hook to auto-enrich book data with cover and genres from Google Books
 */
export function useBookEnrichment(title, author, existingCover, existingGenres) {
  const [enrichedData, setEnrichedData] = useState(null);
  const [isEnriching, setIsEnriching] = useState(false);

  useEffect(() => {
    if (enrichedData || isEnriching) return;
    if (existingCover && existingGenres?.length > 0) return;
    
    const fetchEnrichment = async () => {
      setIsEnriching(true);
      try {
        const data = await enrichBook(title, author);
        if (data) {
          setEnrichedData(data);
        }
      } catch (err) {
        console.warn('[useBookEnrichment] Failed:', err);
      } finally {
        setIsEnriching(false);
      }
    };
    
    if (title) fetchEnrichment();
  }, [title, author, existingCover, existingGenres?.length, enrichedData, isEnriching]);

  return {
    coverUrl: existingCover || enrichedData?.coverUrl || null,
    genres: existingGenres?.length > 0 ? existingGenres : (enrichedData?.genres || []),
    description: enrichedData?.description || null,
    isbn: enrichedData?.isbn || null,
    isEnriching,
    enrichedData,
  };
}


/**
 * Full BookCard component - wraps BookInfo with card styling and actions
 */
export default function BookCard({
  book,
  badge,
  actions,
  expandedContent,
  leftSlot,
  showRating = false,
  rating = 0,
  onRatingChange,
  autoEnrich = true,
  defaultExpanded = false,
  className = '',
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Extract book data with fallbacks
  const title = book?.book_title || book?.title || '';
  const author = book?.book_author || book?.author || '';
  const bookDescription = book?.description || '';
  const bookCover = book?.cover_image_url || book?.coverUrl || null;
  const bookGenres = book?.genres || [];

  // Auto-enrich if needed
  const { coverUrl, genres, description: enrichedDescription, isEnriching } = useBookEnrichment(
    autoEnrich ? title : null,
    author,
    bookCover,
    bookGenres
  );

  const displayDescription = bookDescription || enrichedDescription || '';

  return (
    <div className={`bg-[#FDFBF4] rounded-xl border border-[#D4DAD0] transition-all duration-200 ${className}`}>
      {/* Badge */}
      {badge && (
        <div className="px-4 pt-3 pb-0">
          {badge}
        </div>
      )}
      
      {/* Main Content */}
      <div className="p-4">
        <div className="flex gap-3">
          {/* Left Slot (drag handle, number, etc.) */}
          {leftSlot && (
            <div className="flex-shrink-0 flex items-start">
              {leftSlot}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <BookInfo
              title={title}
              author={author}
              description={displayDescription}
              coverUrl={coverUrl}
              genres={genres}
              isEnriching={isEnriching}
              expanded={expanded}
              onToggleExpand={() => setExpanded(!expanded)}
            >
              {/* Rating */}
              {showRating && (
                <div className="mt-2">
                  <StarRating 
                    rating={rating} 
                    onRatingChange={onRatingChange}
                    size="sm"
                  />
                </div>
              )}
            </BookInfo>
          </div>
        </div>
        
        {/* Expanded Content */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-[#E8EBE4]">
            {/* Full Description */}
            {displayDescription && (
              <p className="text-xs text-[#5F7252] leading-relaxed mb-3">
                {displayDescription}
              </p>
            )}
            
            {/* Additional expanded content */}
            {expandedContent}
          </div>
        )}
      </div>
      
      {/* Actions */}
      {actions && (
        <div className="px-4 pb-4">
          {actions}
        </div>
      )}
    </div>
  );
}
