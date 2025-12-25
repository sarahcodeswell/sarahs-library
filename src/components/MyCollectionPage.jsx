import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, Trash2, BookMarked } from 'lucide-react';
import { track } from '@vercel/analytics';
import { useReadingQueue } from '../contexts/ReadingQueueContext';

export default function MyCollectionPage({ onNavigate, user, onShowAuthModal }) {
  const { readingQueue, removeFromQueue, updateQueueStatus } = useReadingQueue();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter to only show books marked as "read"
  const readBooks = useMemo(() => {
    return readingQueue.filter(item => item.status === 'read');
  }, [readingQueue]);

  const sortedBooks = useMemo(() => {
    return [...readBooks].sort((a, b) => {
      const titleA = (a.book_title || '').toLowerCase();
      const titleB = (b.book_title || '').toLowerCase();
      return titleA.localeCompare(titleB);
    });
  }, [readBooks]);

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return sortedBooks;
    const query = searchQuery.toLowerCase();
    return sortedBooks.filter(book => 
      book.book_title?.toLowerCase().includes(query) || 
      book.book_author?.toLowerCase().includes(query)
    );
  }, [sortedBooks, searchQuery]);

  const handleMoveToWantToRead = async (book) => {
    if (!user) {
      onShowAuthModal();
      return;
    }

    const result = await updateQueueStatus(book.id, 'want_to_read');
    
    if (result.success) {
      track('book_moved_to_want_to_read', {
        book_title: book.book_title,
      });
    } else {
      alert('Failed to update book status. Please try again.');
    }
  };

  const handleRemoveBook = async (book) => {
    if (!confirm(`Remove "${book.book_title}" from your collection?`)) {
      return;
    }

    const result = await removeFromQueue(book.id);
    
    if (result.success) {
      track('book_removed_from_collection', {
        book_title: book.book_title,
      });
    } else {
      alert('Failed to remove book. Please try again.');
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

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#96A888]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your collection..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#D4DAD0] bg-white text-[#4A5940] placeholder-[#96A888] text-sm focus:outline-none focus:ring-2 focus:ring-[#96A888] focus:border-transparent"
          />
        </div>

        {filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#7A8F6C] text-sm">
              {searchQuery ? `No books found matching "${searchQuery}"` : 'No books in your collection yet'}
            </p>
            {!searchQuery && (
              <p className="text-[#96A888] text-xs mt-2">
                Mark books as "Read" from Add Books to build your collection
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
                    <div className="text-xs text-[#96A888] mt-2">
                      Added {new Date(book.added_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleMoveToWantToRead(book)}
                      className="px-2 py-1 rounded text-xs font-medium text-[#5F7252] hover:bg-[#E8EBE4] transition-colors flex items-center gap-1"
                      title="Move to Want to Read"
                    >
                      <BookMarked className="w-3.5 h-3.5" />
                      Want to Read
                    </button>
                    <button
                      onClick={() => handleRemoveBook(book)}
                      className="p-1 rounded text-[#96A888] hover:text-[#5F7252] transition-colors"
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
    </div>
  );
}
