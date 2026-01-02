import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Search, Trash2, Share2, ChevronDown, Star } from 'lucide-react';
import { track } from '@vercel/analytics';
import { useReadingQueue } from '../contexts/ReadingQueueContext';
import { useRecommendations } from '../contexts/RecommendationContext';
import RecommendationModal from './RecommendationModal';
import { useBookEnrichment } from './BookCard';
import StarRating from './StarRating';
import booksData from '../books.json';
import { db } from '../lib/supabase';
import { stripAccoladesFromDescription } from '../lib/descriptionUtils';
import { generateBookDescriptions } from '../lib/descriptionService';

const MASTER_ADMIN_EMAIL = 'sarah@darkridge.com';

// Shimmer placeholder for loading descriptions
function DescriptionShimmer() {
  return (
    <div className="mt-2 space-y-1.5 animate-pulse">
      <div className="h-3 bg-[#E8EBE4] rounded w-full"></div>
      <div className="h-3 bg-[#E8EBE4] rounded w-4/5"></div>
    </div>
  );
}

// Expandable book card component for consistent UI
function CollectionBookCard({ book, onRatingChange, onRecommend, onRemove, isLoadingDescription, showRatingLegend = false }) {
  const [expanded, setExpanded] = useState(false);
  const [isLongDescription, setIsLongDescription] = useState(false);
  const descriptionRef = React.useRef(null);
  
  // Auto-enrich with cover and genres if missing
  const { coverUrl, genres, isEnriching } = useBookEnrichment(
    book.book_title,
    book.book_author,
    book.cover_image_url,
    book.genres
  );
  
  // Description is already resolved in readBooks (with catalog fallback)
  // Strip accolades from description since they're shown in Reputation section
  const description = useMemo(() => {
    return stripAccoladesFromDescription(book.description);
  }, [book.description]);
  const hasDescription = !!description;
  
  // Check if description overflows 2 lines
  React.useEffect(() => {
    if (descriptionRef.current) {
      const lineHeight = parseFloat(getComputedStyle(descriptionRef.current).lineHeight);
      const height = descriptionRef.current.scrollHeight;
      // If more than ~2.5 lines, consider it long
      setIsLongDescription(height > lineHeight * 2.5);
    }
  }, [description]);

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        {/* Cover Image */}
        {coverUrl ? (
          <div className="flex-shrink-0">
            <img 
              src={coverUrl} 
              alt={`Cover of ${book.book_title}`}
              className="w-12 h-18 object-cover rounded shadow-sm"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        ) : isEnriching ? (
          <div className="flex-shrink-0 w-12 h-18 bg-[#E8EBE4] rounded animate-pulse" />
        ) : null}
        
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="text-sm font-medium text-[#4A5940]">
            {book.book_title}
          </div>
          
          {/* Author */}
          {book.book_author && (
            <div className="text-xs text-[#7A8F6C] font-light mt-0.5">
              {book.book_author}
            </div>
          )}
          
          {/* Genres */}
          {genres?.length > 0 && (
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
          
          {/* Reputation & Accolades */}
          {book.reputation && (
            <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs font-medium text-[#4A5940] mb-1 flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500" />
                Reputation & Accolades:
              </p>
              <p className="text-xs text-[#5F7252] leading-relaxed">{book.reputation}</p>
            </div>
          )}
          
          {/* Description - shimmer while loading, then show content */}
          {isLoadingDescription && !hasDescription ? (
            <DescriptionShimmer />
          ) : hasDescription ? (
            <div className="mt-3 pt-3 border-t border-[#E8EBE4]">
              <p className="text-xs font-medium text-[#4A5940] mb-1">About this book:</p>
              <p 
                ref={descriptionRef}
                className={`text-xs text-[#5F7252] leading-relaxed ${!expanded ? 'line-clamp-2' : 'line-clamp-4'}`}
              >
                {description}
              </p>
              
              {/* Only show expand/collapse if description is long */}
              {isLongDescription && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-xs font-medium text-[#7A8F6C] hover:text-[#4A5940] transition-colors mt-1"
                >
                  <span>{expanded ? 'Show less' : 'Show more'}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          ) : null}
          
          {/* Rating */}
          <div className="mt-2">
            <StarRating 
              rating={book.rating}
              onRatingChange={(newRating) => onRatingChange(book, newRating)}
              readOnly={false}
              size="sm"
              showLegend={showRatingLegend}
            />
          </div>
          
          {/* Date Added */}
          {book.added_at && (
            <div className="text-xs text-[#96A888] mt-2">
              Added {new Date(book.added_at).toLocaleDateString()}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onRecommend(book)}
            className="p-2 sm:px-3 sm:py-2 rounded text-xs font-medium text-white bg-[#5F7252] hover:bg-[#4A5940] transition-colors flex items-center justify-center gap-1.5"
            title="Recommend this book to friends"
          >
            <Share2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Recommend</span>
          </button>
          <button
            onClick={() => onRemove(book)}
            className="p-2 rounded text-[#96A888] bg-white border border-[#D4DAD0] hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Remove from collection"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyCollectionPage({ onNavigate, user, onShowAuthModal }) {
  const { readingQueue, addToQueue, removeFromQueue, updateQueueStatus, updateQueueItem } = useReadingQueue();
  const { createRecommendation } = useRecommendations();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [selectedRating, setSelectedRating] = useState(null); // null = all, 1-5 = specific rating
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [userBooks, setUserBooks] = useState([]);
  const [sortBy, setSortBy] = useState('date_added'); // 'date_added', 'title', or 'author'
  const [selectedGenre, setSelectedGenre] = useState(null); // Genre filter
  const [recommendPromptBook, setRecommendPromptBook] = useState(null); // For showing recommend prompt after high rating
  const [hasBackfilledDescriptions, setHasBackfilledDescriptions] = useState(false);
  const [loadingDescriptionIds, setLoadingDescriptionIds] = useState(new Set()); // Track which books are loading descriptions

  // Check if current user is master admin (Sarah)
  const isMasterAdmin = user?.email === MASTER_ADMIN_EMAIL;

  // Load user's books from user_books table
  useEffect(() => {
    if (!user) return;
    
    const loadUserBooks = async () => {
      try {
        const { data, error } = await db.getUserBooks(user.id);
        if (error) {
          console.error('Error loading user books:', error);
        } else {
          setUserBooks(data || []);
        }
      } catch (err) {
        console.error('Exception loading user books:', err);
      }
    };

    loadUserBooks();
  }, [user]);

  // Helper to find catalog description for a book
  const getCatalogDescription = (title, author) => {
    const normalizedTitle = (title || '').toLowerCase().trim();
    const normalizedAuthor = (author || '').toLowerCase().trim();
    
    // Try exact match first
    const exactMatch = booksData.find(b => 
      b.title?.toLowerCase().trim() === normalizedTitle &&
      b.author?.toLowerCase().trim() === normalizedAuthor
    );
    if (exactMatch?.description) return exactMatch.description;
    
    // Try title-only match
    const titleMatch = booksData.find(b => 
      b.title?.toLowerCase().trim() === normalizedTitle
    );
    if (titleMatch?.description) return titleMatch.description;
    
    return null;
  };

  // Combine finished books from reading_queue and user_books table
  const readBooks = useMemo(() => {
    const finishedBooks = readingQueue.filter(item => item.status === 'finished');
    
    // Create a map to track books by title+author to avoid duplicates
    const bookMap = new Map();
    
    // Add finished books from reading queue
    finishedBooks.forEach(book => {
      const key = `${book.book_title?.toLowerCase()}:${book.book_author?.toLowerCase()}`;
      // Fallback to catalog description if not stored
      const description = book.description || getCatalogDescription(book.book_title, book.book_author);
      bookMap.set(key, {
        ...book,
        description,
        source: 'reading_queue'
      });
    });
    
    // Add books from user_books table
    userBooks.forEach(book => {
      const key = `${book.book_title?.toLowerCase()}:${book.book_author?.toLowerCase()}`;
      if (!bookMap.has(key)) {
        // Fallback to catalog description if not stored
        const description = book.description || getCatalogDescription(book.book_title, book.book_author);
        bookMap.set(key, {
          ...book,
          description,
          status: 'finished', // All user_books are considered finished
          source: 'user_books'
        });
      }
    });
    
    // If master admin, merge with all 200 curated books from books.json
    if (isMasterAdmin) {
      booksData.forEach((book, index) => {
        const key = `${book.title?.toLowerCase()}:${book.author?.toLowerCase()}`;
        if (!bookMap.has(key)) {
          bookMap.set(key, {
            id: `curated-${index}`,
            book_title: book.title,
            book_author: book.author,
            description: book.description, // Include description from catalog
            status: 'finished',
            isCurated: true,
            added_at: null,
            source: 'curated'
          });
        }
      });
    }
    
    return Array.from(bookMap.values());
  }, [readingQueue, userBooks, isMasterAdmin]);

  const sortedBooks = useMemo(() => {
    return [...readBooks].sort((a, b) => {
      if (sortBy === 'date_added') {
        // Sort by date added, most recent first
        const dateA = new Date(a.added_at || a.updated_at || 0);
        const dateB = new Date(b.added_at || b.updated_at || 0);
        return dateB - dateA;
      } else if (sortBy === 'author') {
        // Sort alphabetically by author, then by title
        const authorA = (a.book_author || 'ZZZ').toLowerCase();
        const authorB = (b.book_author || 'ZZZ').toLowerCase();
        const authorCompare = authorA.localeCompare(authorB);
        if (authorCompare !== 0) return authorCompare;
        // Same author, sort by title
        const titleA = (a.book_title || '').toLowerCase();
        const titleB = (b.book_title || '').toLowerCase();
        return titleA.localeCompare(titleB);
      } else {
        // Sort alphabetically by title
        const titleA = (a.book_title || '').toLowerCase();
        const titleB = (b.book_title || '').toLowerCase();
        return titleA.localeCompare(titleB);
      }
    });
  }, [readBooks, sortBy]);

  const filteredBooks = useMemo(() => {
    let books = sortedBooks;
    
    // Filter by selected letter
    if (selectedLetter) {
      books = books.filter(book => {
        const firstLetter = (book.book_title || '').charAt(0).toUpperCase();
        return firstLetter === selectedLetter;
      });
    }
    
    // Filter by selected rating
    if (selectedRating !== null) {
      if (selectedRating === 0) {
        // Unrated books
        books = books.filter(book => !book.rating || book.rating === 0);
      } else {
        books = books.filter(book => book.rating === selectedRating);
      }
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      books = books.filter(book => 
        book.book_title?.toLowerCase().includes(query) || 
        book.book_author?.toLowerCase().includes(query)
      );
    }
    
    // Filter by genre
    if (selectedGenre) {
      books = books.filter(book => 
        book.genres?.some(g => g.toLowerCase().includes(selectedGenre.toLowerCase()))
      );
    }
    
    return books;
  }, [sortedBooks, searchQuery, selectedLetter, selectedRating, selectedGenre]);

  // Get available letters from books
  const availableLetters = useMemo(() => {
    const letters = new Set();
    sortedBooks.forEach(book => {
      const firstLetter = (book.book_title || '').charAt(0).toUpperCase();
      if (firstLetter.match(/[A-Z]/)) {
        letters.add(firstLetter);
      }
    });
    return Array.from(letters).sort();
  }, [sortedBooks]);

  // Get available genres from books
  const availableGenres = useMemo(() => {
    const genreCounts = {};
    sortedBooks.forEach(book => {
      (book.genres || []).forEach(genre => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    });
    // Sort by count, return top genres
    return Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([genre]) => genre);
  }, [sortedBooks]);

  // Auto-backfill descriptions for books that don't have them (runs once on load)
  useEffect(() => {
    if (hasBackfilledDescriptions || readBooks.length === 0) return;
    
    const booksNeedingDescriptions = readBooks.filter(
      book => !book.description && book.source === 'reading_queue'
    );
    
    if (booksNeedingDescriptions.length === 0) {
      setHasBackfilledDescriptions(true);
      return;
    }

    // Mark all books needing descriptions as loading
    setLoadingDescriptionIds(new Set(booksNeedingDescriptions.map(b => b.id)));

    // Run backfill in background
    const backfillDescriptions = async () => {
      setHasBackfilledDescriptions(true); // Prevent re-running
      
      const batchSize = 10;
      let updatedCount = 0;

      for (let i = 0; i < booksNeedingDescriptions.length; i += batchSize) {
        const batch = booksNeedingDescriptions.slice(i, i + batchSize);
        const booksForApi = batch.map(b => ({ 
          title: b.book_title, 
          author: b.book_author 
        }));

        try {
          const descriptions = await generateBookDescriptions(booksForApi);

          // Update each book with its new description
          for (const book of batch) {
            const key = `${book.book_title.toLowerCase()}|${(book.book_author || '').toLowerCase()}`;
            const description = descriptions[key];

            if (description) {
              await updateQueueItem(book.id, { description });
              updatedCount++;
            }
            
            // Remove from loading state
            setLoadingDescriptionIds(prev => {
              const next = new Set(prev);
              next.delete(book.id);
              return next;
            });
          }
        } catch (batchError) {
          console.error('Error generating descriptions:', batchError);
          // Remove batch from loading state on error
          batch.forEach(book => {
            setLoadingDescriptionIds(prev => {
              const next = new Set(prev);
              next.delete(book.id);
              return next;
            });
          });
        }
      }

      if (updatedCount > 0) {
        track('descriptions_auto_backfilled', {
          total_books: booksNeedingDescriptions.length,
          updated_count: updatedCount
        });
      }
    };

    backfillDescriptions();
  }, [readBooks, hasBackfilledDescriptions, updateQueueItem]);

  const handleRemoveBook = async (book) => {
    // Prevent removing curated books for master admin
    if (book.isCurated) {
      alert('This is part of your curated collection and cannot be removed.');
      return;
    }

    if (!confirm(`Remove "${book.book_title}" from your collection?`)) {
      return;
    }

    let success = false;
    let error = null;

    // Handle removal based on source
    if (book.source === 'reading_queue') {
      const result = await removeFromQueue(book.id);
      success = result.success;
      error = result.error;
    } else if (book.source === 'user_books') {
      try {
        const { error: removeError } = await db.removeUserBook(book.id);
        success = !removeError;
        error = removeError;
        
        if (success) {
          // Refresh user books list
          const { data, error: fetchError } = await db.getUserBooks(user.id);
          if (!fetchError) {
            setUserBooks(data || []);
          }
        }
      } catch (err) {
        success = false;
        error = err.message;
      }
    }
    
    if (success) {
      track('book_removed_from_collection', {
        book_title: book.book_title,
        source: book.source
      });
    } else {
      alert(`Failed to remove book. ${error ? error.message : 'Please try again.'}`);
    }
  };

  const handleRatingChange = async (book, newRating) => {
    // For curated books, check if already in reading_queue first
    if (book.isCurated) {
      // Check if this book already exists in reading_queue
      const existingBook = readingQueue.find(
        qb => qb.book_title?.toLowerCase() === book.book_title?.toLowerCase() &&
              qb.book_author?.toLowerCase() === book.book_author?.toLowerCase() &&
              qb.status === 'finished'
      );
      
      if (existingBook) {
        // Book already exists, just update the rating
        const result = await updateQueueItem(existingBook.id, { rating: newRating });
        
        if (result.success) {
          track('curated_book_rated', {
            book_title: book.book_title,
            rating: newRating
          });
        }
      } else {
        // Add to reading queue with the rating in one operation
        const result = await addToQueue({
          title: book.book_title,
          author: book.book_author,
          status: 'finished',
          rating: newRating,
        });
        
        if (result.success) {
          track('curated_book_rated', {
            book_title: book.book_title,
            rating: newRating
          });
        }
      }
      return;
    }

    const result = await updateQueueItem(book.id, { rating: newRating });
    
    if (result.success) {
      track('book_rated_in_collection', {
        book_id: book.id,
        rating: newRating
      });
      
      // Show recommend prompt for high ratings (4-5 stars)
      if (newRating >= 4) {
        setRecommendPromptBook(book);
      }
    }
  };

  const handleRecommend = (book) => {
    setSelectedBook(book);
    setShowRecommendModal(true);
    
    track('recommend_button_clicked', {
      book_title: book.book_title,
    });
  };

  const handleCreateRecommendation = async (book, note) => {
    const result = await createRecommendation(book, note);
    
    if (result.success) {
      track('recommendation_created', {
        book_title: book.book_title,
      });
    } else {
      throw new Error(result.error || 'Failed to create recommendation');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <button
            onClick={() => {
              onNavigate('home');
              window.scrollTo(0, 0);
            }}
            className="inline-flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] transition-colors mb-6 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>

          <div className="bg-[#F8F6EE] rounded-xl border border-[#D4DAD0] p-8 text-center">
            <h2 className="font-serif text-2xl text-[#4A5940] mb-3">Sign in to view your collection</h2>
            <p className="text-[#7A8F6C] text-sm mb-6">
              Track books you've read and build your personal library.
            </p>
            <button
              onClick={onShowAuthModal}
              className="px-6 py-2.5 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors font-medium"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
      {/* Recommend Prompt Modal - Shows after 4-5 star rating */}
      {recommendPromptBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#5F7252]/10 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-[#5F7252]" />
              </div>
              <div>
                <h3 className="font-medium text-[#4A5940]">Great rating!</h3>
                <p className="text-xs text-[#7A8F6C]">{recommendPromptBook.book_title}</p>
              </div>
            </div>
            <p className="text-sm text-[#5F7252] mb-4">
              Love this book? Share it with a friend!
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedBook(recommendPromptBook);
                  setShowRecommendModal(true);
                  setRecommendPromptBook(null);
                  track('recommend_prompt_accepted', {
                    book_title: recommendPromptBook.book_title
                  });
                }}
                className="flex-1 px-4 py-2.5 bg-[#5F7252] text-white rounded-lg text-sm font-medium hover:bg-[#4A5940] transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Recommend
              </button>
              <button
                onClick={() => {
                  setRecommendPromptBook(null);
                  track('recommend_prompt_dismissed', {
                    book_title: recommendPromptBook.book_title
                  });
                }}
                className="px-4 py-2.5 bg-[#F8F6EE] text-[#5F7252] rounded-lg text-sm font-medium hover:bg-[#E8EBE4] transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <button
          onClick={() => {
            onNavigate('home');
            window.scrollTo(0, 0);
          }}
          className="inline-flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] transition-colors mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        <div className="mb-6">
          <h1 className="font-serif text-3xl sm:text-4xl text-[#4A5940] mb-2">My Collection</h1>
          <p className="text-[#7A8F6C] text-sm font-light">
            {readBooks.length} book{readBooks.length !== 1 ? 's' : ''} you've read
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative sm:min-w-[220px] sm:flex-1 sm:max-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#96A888]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your collection..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#D4DAD0] bg-white text-[#4A5940] placeholder-[#96A888] text-sm focus:outline-none focus:ring-2 focus:ring-[#96A888] focus:border-transparent"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-[#D4DAD0] bg-white text-[#4A5940] text-sm focus:outline-none focus:ring-2 focus:ring-[#96A888] focus:border-transparent shrink-0"
          >
            <option value="date_added">Recently Added</option>
            <option value="title">A-Z by Title</option>
            <option value="author">A-Z by Author</option>
          </select>
          <select
            value={selectedRating === null ? 'all' : selectedRating}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedRating(val === 'all' ? null : parseInt(val, 10));
            }}
            className="px-3 py-2.5 rounded-lg border border-[#D4DAD0] bg-white text-[#4A5940] text-sm focus:outline-none focus:ring-2 focus:ring-[#96A888] focus:border-transparent"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
            <option value="0">Unrated</option>
          </select>
          {availableGenres.length > 0 && (
            <select
              value={selectedGenre || 'all'}
              onChange={(e) => setSelectedGenre(e.target.value === 'all' ? null : e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-[#D4DAD0] bg-white text-[#4A5940] text-sm focus:outline-none focus:ring-2 focus:ring-[#96A888] focus:border-transparent"
            >
              <option value="all">All Genres</option>
              {availableGenres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          )}
        </div>

        {/* A-Z Letter Navigation */}
        {availableLetters.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedLetter(null)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  selectedLetter === null
                    ? 'bg-[#5F7252] text-white'
                    : 'bg-white text-[#7A8F6C] border border-[#E8EBE4] hover:bg-[#F8F6EE]'
                }`}
              >
                All
              </button>
              {availableLetters.map(letter => (
                <button
                  key={letter}
                  onClick={() => setSelectedLetter(letter)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    selectedLetter === letter
                      ? 'bg-[#5F7252] text-white'
                      : 'bg-white text-[#7A8F6C] border border-[#E8EBE4] hover:bg-[#F8F6EE]'
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#7A8F6C] text-sm">
              {searchQuery ? `No books found matching "${searchQuery}"` : 'No books in your collection yet'}
            </p>
            {!searchQuery && (
              <p className="text-[#96A888] text-xs mt-2">
                Mark books as "Finished" from Add Books or your Reading Queue.
              </p>
            )}
          </div>
        ) : (
          <div className="bg-[#F8F6EE] rounded-xl border border-[#D4DAD0] shadow-sm divide-y divide-[#E8EBE4]">
            {filteredBooks.map((book, index) => (
              <CollectionBookCard
                key={book.id}
                book={book}
                onRatingChange={handleRatingChange}
                onRecommend={handleRecommend}
                onRemove={handleRemoveBook}
                isLoadingDescription={loadingDescriptionIds.has(book.id)}
                showRatingLegend={index === 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recommendation Modal */}
      <RecommendationModal
        isOpen={showRecommendModal}
        onClose={() => {
          setShowRecommendModal(false);
          setSelectedBook(null);
        }}
        book={selectedBook}
        onSubmit={handleCreateRecommendation}
      />
    </div>
  );
}
