import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Search, Trash2, BookMarked, Share2 } from 'lucide-react';
import { track } from '@vercel/analytics';
import { useReadingQueue } from '../contexts/ReadingQueueContext';
import { useRecommendations } from '../contexts/RecommendationContext';
import RecommendationModal from './RecommendationModal';
import StarRating from './StarRating';
import booksData from '../books.json';
import { db } from '../lib/supabase';

const MASTER_ADMIN_EMAIL = 'sarah@darkridge.com';

export default function MyCollectionPage({ onNavigate, user, onShowAuthModal }) {
  const { readingQueue, addToQueue, removeFromQueue, updateQueueStatus, updateQueueItem } = useReadingQueue();
  const { createRecommendation } = useRecommendations();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [userBooks, setUserBooks] = useState([]);

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

  // Combine finished books from reading_queue and user_books table
  const readBooks = useMemo(() => {
    const finishedBooks = readingQueue.filter(item => item.status === 'finished');
    
    // Create a map to track books by title+author to avoid duplicates
    const bookMap = new Map();
    
    // Add finished books from reading queue
    finishedBooks.forEach(book => {
      const key = `${book.book_title?.toLowerCase()}:${book.book_author?.toLowerCase()}`;
      bookMap.set(key, {
        ...book,
        source: 'reading_queue'
      });
    });
    
    // Add books from user_books table
    userBooks.forEach(book => {
      const key = `${book.book_title?.toLowerCase()}:${book.book_author?.toLowerCase()}`;
      if (!bookMap.has(key)) {
        bookMap.set(key, {
          ...book,
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
      const titleA = (a.book_title || '').toLowerCase();
      const titleB = (b.book_title || '').toLowerCase();
      return titleA.localeCompare(titleB);
    });
  }, [readBooks]);

  const filteredBooks = useMemo(() => {
    let books = sortedBooks;
    
    // Filter by selected letter
    if (selectedLetter) {
      books = books.filter(book => {
        const firstLetter = (book.book_title || '').charAt(0).toUpperCase();
        return firstLetter === selectedLetter;
      });
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      books = books.filter(book => 
        book.book_title?.toLowerCase().includes(query) || 
        book.book_author?.toLowerCase().includes(query)
      );
    }
    
    return books;
  }, [sortedBooks, searchQuery, selectedLetter]);

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

  const handleMoveToReadAgain = async (book) => {
    if (!user) {
      onShowAuthModal();
      return;
    }

    // Prevent modifying curated books for master admin
    if (book.isCurated) {
      alert('This is part of your curated collection and cannot be modified.');
      return;
    }

    const result = await updateQueueStatus(book.id, 'want_to_read');
    
    if (result.success) {
      track('book_moved_to_read_again', {
        book_title: book.book_title,
      });
    } else {
      alert('Failed to update book status. Please try again.');
    }
  };

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

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#96A888]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your collection..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#D4DAD0] bg-white text-[#4A5940] placeholder-[#96A888] text-sm focus:outline-none focus:ring-2 focus:ring-[#96A888] focus:border-transparent"
          />
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
            {filteredBooks.map((book) => (
              <div key={book.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#4A5940]">
                      {book.book_title}
                    </div>
                    {book.book_author && (
                      <div className="text-xs text-[#7A8F6C] font-light mt-1">
                        {book.book_author}
                      </div>
                    )}
                    <div className="mt-2">
                      <StarRating 
                        rating={book.rating}
                        onRatingChange={(newRating) => handleRatingChange(book, newRating)}
                        readOnly={false}
                        size="sm"
                      />
                    </div>
                    {book.added_at && (
                      <div className="text-xs text-[#96A888] mt-2">
                        Added {new Date(book.added_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Mobile: Icon-only, Desktop: Icon + Text */}
                    <button
                      onClick={() => handleRecommend(book)}
                      className="p-2 sm:px-3 sm:py-2 rounded text-xs font-medium text-white bg-[#5F7252] hover:bg-[#4A5940] transition-colors flex items-center justify-center gap-1.5"
                      title="Recommend this book to friends"
                    >
                      <Share2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden sm:inline">Recommend</span>
                    </button>
                    <button
                      onClick={() => handleMoveToReadAgain(book)}
                      className="p-2 sm:px-3 sm:py-2 rounded text-xs font-medium text-[#5F7252] bg-white border border-[#D4DAD0] hover:bg-[#E8EBE4] transition-colors flex items-center justify-center gap-1.5"
                      title="Move to reading queue to read again"
                    >
                      <BookMarked className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden sm:inline">Read Again</span>
                    </button>
                    <button
                      onClick={() => handleRemoveBook(book)}
                      className="p-2 rounded text-[#96A888] bg-white border border-[#D4DAD0] hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remove from collection"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
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
