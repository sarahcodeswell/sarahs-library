import React, { useState, useEffect } from 'react';
import { X, BookOpen, Star, Library, Trash2, ArrowLeft, ExternalLink, Headphones, ShoppingBag, Check, Edit3 } from 'lucide-react';
import { useBookEnrichment } from './BookCard';
import { ExpandableDescription } from './ExpandableDescription';
import { stripAccoladesFromDescription } from '../lib/descriptionUtils';

/**
 * BookDetailModal - A reusable modal for displaying book details
 * with dynamic action buttons based on the book's status
 * 
 * Props:
 * - book: The book object to display
 * - isOpen: Whether the modal is open
 * - onClose: Function to close the modal
 * - bookStatus: Current status of the book ('want_to_read', 'reading', 'finished', null)
 * - isInCollection: Whether the book is in the user's collection
 * - rating: Current rating if any
 * - onAddToQueue: Function to add book to reading queue
 * - onStartReading: Function to start reading the book
 * - onFinished: Function to mark book as finished
 * - onMoveToQueue: Function to move book back to queue
 * - onRemove: Function to remove book from queue
 * - onNotForMe: Function to dismiss the book
 * - onRate: Function to rate the book
 */
export default function BookDetailModal({
  book,
  isOpen,
  onClose,
  bookStatus = null,
  isInCollection = false,
  rating = null,
  onAddToQueue,
  onStartReading,
  onFinished,
  onMoveToQueue,
  onRemove,
  onNotForMe,
  onRate,
}) {
  const [isClosing, setIsClosing] = useState(false);
  
  // Auto-enrich with cover if missing
  const { coverUrl, genres, isEnriching } = useBookEnrichment(
    book?.book_title || book?.title,
    book?.book_author || book?.author,
    book?.cover_image_url || book?.coverUrl,
    book?.genres
  );

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  if (!isOpen || !book) return null;

  const title = book.book_title || book.title;
  const author = book.book_author || book.author;
  const description = stripAccoladesFromDescription(book.description || book.why_recommended);

  // Determine which action buttons to show based on status
  const getActionButtons = () => {
    // Not in queue at all
    if (!bookStatus && !isInCollection) {
      return (
        <div className="space-y-3">
          <button
            onClick={() => { onAddToQueue?.(book); handleClose(); }}
            className="w-full py-3 px-4 bg-[#5F7252] text-white rounded-xl font-medium hover:bg-[#4A5940] transition-colors flex items-center justify-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            Add to Reading Queue
          </button>
          <button
            onClick={() => { onNotForMe?.(book); handleClose(); }}
            className="w-full py-2.5 px-4 text-[#96A888] hover:text-[#7A8F6C] transition-colors text-sm"
          >
            Not interested
          </button>
        </div>
      );
    }

    // Want to Read
    if (bookStatus === 'want_to_read') {
      return (
        <div className="space-y-3">
          <button
            onClick={() => { onStartReading?.(book); handleClose(); }}
            className="w-full py-3 px-4 bg-[#5F7252] text-white rounded-xl font-medium hover:bg-[#4A5940] transition-colors flex items-center justify-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            Start Reading
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => { onRemove?.(book); handleClose(); }}
              className="flex-1 py-2.5 px-4 border border-[#E8EBE4] rounded-xl text-[#7A8F6C] hover:bg-[#F8F6EE] transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
          </div>
        </div>
      );
    }

    // Currently Reading
    if (bookStatus === 'reading') {
      return (
        <div className="space-y-3">
          <button
            onClick={() => { onFinished?.(book); handleClose(); }}
            className="w-full py-3 px-4 bg-[#5F7252] text-white rounded-xl font-medium hover:bg-[#4A5940] transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Finished!
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => { onMoveToQueue?.(book); handleClose(); }}
              className="flex-1 py-2.5 px-4 border border-[#E8EBE4] rounded-xl text-[#7A8F6C] hover:bg-[#F8F6EE] transition-colors text-sm flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Queue
            </button>
            <button
              onClick={() => { onNotForMe?.(book); handleClose(); }}
              className="flex-1 py-2.5 px-4 border border-[#E8EBE4] rounded-xl text-[#7A8F6C] hover:bg-[#F8F6EE] transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Not for me
            </button>
          </div>
        </div>
      );
    }

    // In Collection (finished)
    if (isInCollection || bookStatus === 'finished') {
      return (
        <div className="space-y-3">
          {!rating ? (
            <button
              onClick={() => { onRate?.(book); handleClose(); }}
              className="w-full py-3 px-4 bg-[#5F7252] text-white rounded-xl font-medium hover:bg-[#4A5940] transition-colors flex items-center justify-center gap-2"
            >
              <Star className="w-5 h-5" />
              Rate & Review
            </button>
          ) : (
            <div className="flex items-center justify-center gap-1 py-2">
              <span className="text-sm text-[#7A8F6C] mr-2">Your rating:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${star <= rating ? 'fill-[#5F7252] text-[#5F7252]' : 'text-[#E8EBE4]'}`}
                />
              ))}
              <button
                onClick={() => onRate?.(book)}
                className="ml-2 p-1 text-[#96A888] hover:text-[#5F7252] transition-colors"
                title="Edit rating"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-center gap-1 text-sm text-[#5F7252]">
            <Library className="w-4 h-4" />
            <span>In your collection</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 ${
        isClosing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Modal - slides up on mobile, centered on desktop */}
      <div 
        className={`relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden shadow-xl ${
          isClosing ? 'animate-slide-down' : 'animate-slide-up'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="sticky top-0 bg-white border-b border-[#E8EBE4] px-4 py-3 flex items-center justify-between z-10">
          <h2 className="font-serif text-lg text-[#4A5940]">Book Details</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-[#F8F6EE] transition-colors text-[#7A8F6C]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-60px)] p-4 sm:p-6">
          {/* Book info */}
          <div className="flex gap-4 mb-6">
            {/* Cover */}
            <div className="flex-shrink-0 w-24 h-36 rounded-lg bg-gradient-to-br from-[#96A888] to-[#7A8F6C] flex items-center justify-center overflow-hidden shadow-md">
              {coverUrl ? (
                <img src={coverUrl} alt="" className="w-full h-full object-cover" />
              ) : isEnriching ? (
                <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              ) : (
                <BookOpen className="w-8 h-8 text-white/70" />
              )}
            </div>

            {/* Title, Author, Genres */}
            <div className="flex-1 min-w-0">
              <h3 className="font-serif text-xl text-[#4A5940] mb-1">{title}</h3>
              <p className="text-[#7A8F6C] mb-3">by {author}</p>
              
              {/* Genres */}
              {genres && genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {genres.slice(0, 3).map((genre, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-[#F8F6EE] text-[#5F7252] text-xs rounded-full border border-[#E8EBE4]"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {description && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-[#4A5940] mb-2">About this book</h4>
              <ExpandableDescription text={description} />
            </div>
          )}

          {/* Get It section */}
          <div className="mb-6 p-4 bg-[#F8F6EE] rounded-xl">
            <p className="text-xs text-[#7A8F6C] mb-3 italic">
              Support local bookstores, independent sellers, and public libraries
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://bookshop.org/search?keywords=${encodeURIComponent(title + ' ' + author)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white hover:bg-[#E8EBE4] rounded-lg text-xs text-[#5F7252] transition-colors flex items-center gap-1.5 border border-[#E8EBE4]"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Bookshop.org
              </a>
              <a
                href={`https://www.worldcat.org/search?q=${encodeURIComponent(title + ' ' + author)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white hover:bg-[#E8EBE4] rounded-lg text-xs text-[#5F7252] transition-colors flex items-center gap-1.5 border border-[#E8EBE4]"
              >
                <Library className="w-3.5 h-3.5" />
                Find at Library
              </a>
              <a
                href={`https://www.audible.com/search?keywords=${encodeURIComponent(title + ' ' + author)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white hover:bg-[#E8EBE4] rounded-lg text-xs text-[#5F7252] transition-colors flex items-center gap-1.5 border border-[#E8EBE4]"
              >
                <Headphones className="w-3.5 h-3.5" />
                Audible
              </a>
            </div>
          </div>

          {/* Goodreads link */}
          <a
            href={`https://www.goodreads.com/search?q=${encodeURIComponent(title + ' ' + author)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-[#5F7252] hover:text-[#4A5940] transition-colors mb-6"
          >
            <Star className="w-4 h-4" />
            Read reviews on Goodreads
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Action buttons */}
          <div className="border-t border-[#E8EBE4] pt-4">
            {getActionButtons()}
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes slide-down {
          from { transform: translateY(0); }
          to { transform: translateY(100%); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
        .animate-fade-out {
          animation: fade-out 0.2s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
        .animate-slide-down {
          animation: slide-down 0.2s ease-out forwards;
        }
        @media (min-width: 640px) {
          .animate-slide-up {
            animation: fade-in 0.2s ease-out forwards;
            transform: translateY(0);
          }
          .animate-slide-down {
            animation: fade-out 0.2s ease-out forwards;
          }
        }
      `}</style>
    </div>
  );
}
