import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, Trash2, BookOpen, GripVertical } from 'lucide-react';
import { track } from '@vercel/analytics';
import { useReadingQueue } from '../contexts/ReadingQueueContext';

export default function MyReadingQueuePage({ onNavigate, user, onShowAuthModal }) {
  const { readingQueue, removeFromQueue, updateQueueStatus } = useReadingQueue();
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [localOrder, setLocalOrder] = useState([]);

  // Filter to only show books marked as "want_to_read"
  const queueBooks = useMemo(() => {
    return readingQueue.filter(item => item.status === 'want_to_read');
  }, [readingQueue]);

  const sortedBooks = useMemo(() => {
    const books = [...queueBooks].sort((a, b) => {
      const dateA = new Date(a.added_at || 0);
      const dateB = new Date(b.added_at || 0);
      return dateB - dateA; // Most recent first
    });
    
    // Apply local order if exists
    if (localOrder.length > 0) {
      return books.sort((a, b) => {
        const indexA = localOrder.indexOf(a.id);
        const indexB = localOrder.indexOf(b.id);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }
    
    return books;
  }, [queueBooks, localOrder]);

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return sortedBooks;
    const query = searchQuery.toLowerCase();
    return sortedBooks.filter(book => 
      book.book_title?.toLowerCase().includes(query) || 
      book.book_author?.toLowerCase().includes(query)
    );
  }, [sortedBooks, searchQuery]);

  const handleMarkAsRead = async (book) => {
    if (!user) {
      onShowAuthModal();
      return;
    }

    const result = await updateQueueStatus(book.id, 'finished');
    
    if (result.success) {
      track('book_marked_as_read_from_queue', {
        book_title: book.book_title,
      });
    } else {
      alert('Failed to update book status. Please try again.');
    }
  };

  const handleRemoveBook = async (book) => {
    if (!confirm(`Remove "${book.book_title}" from your reading queue?`)) {
      return;
    }

    const result = await removeFromQueue(book.id);
    
    if (result.success) {
      track('book_removed_from_queue', {
        book_title: book.book_title,
      });
      // Update local order
      setLocalOrder(prev => prev.filter(id => id !== book.id));
    } else {
      alert('Failed to remove book. Please try again.');
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const items = [...filteredBooks];
    const draggedItem = items[draggedIndex];
    items.splice(draggedIndex, 1);
    items.splice(index, 0, draggedItem);

    setLocalOrder(items.map(item => item.id));
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    track('reading_queue_reordered', {
      queue_length: filteredBooks.length
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FDFBF4] via-[#FBF9F0] to-[#F5EFDC] flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-serif text-[#4A5940] mb-4">Sign in to view your reading queue</h2>
          <button
            onClick={onShowAuthModal}
            className="px-6 py-2 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFBF4] via-[#FBF9F0] to-[#F5EFDC]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => onNavigate('home')}
          className="mb-6 flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-serif text-[#4A5940] mb-2">My Reading Queue</h1>
          <p className="text-[#7A8F6C]">
            {queueBooks.length} {queueBooks.length === 1 ? 'book' : 'books'} you want to read
          </p>
        </div>

        {queueBooks.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#96A888]" />
              <input
                type="text"
                placeholder="Search your reading queue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#E8EBE4] focus:outline-none focus:ring-2 focus:ring-[#5F7252] focus:border-transparent"
              />
            </div>
          </div>
        )}

        {filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#7A8F6C] text-sm">
              {searchQuery ? `No books found matching "${searchQuery}"` : 'No books in your reading queue yet'}
            </p>
            {!searchQuery && (
              <p className="text-[#96A888] text-xs mt-2">Add books you want to read from the Add Books page.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBooks.map((book, index) => (
              <div
                key={book.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`bg-white rounded-xl border border-[#E8EBE4] p-4 hover:shadow-md transition-shadow cursor-move ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-1 cursor-grab active:cursor-grabbing" title="Drag to reorder">
                    <GripVertical className="w-5 h-5 text-[#96A888]" />
                  </div>
                  <div className="flex-1 min-w-0 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[#4A5940] mb-1 truncate">
                      {book.book_title}
                    </h3>
                    {book.book_author && (
                      <p className="text-sm text-[#7A8F6C] mb-2">
                        by {book.book_author}
                      </p>
                    )}
                    <p className="text-xs text-[#96A888]">
                      Added {new Date(book.added_at).toLocaleDateString()}
                    </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMarkAsRead(book)}
                        className="px-3 py-1.5 rounded text-sm font-medium text-white bg-[#5F7252] hover:bg-[#4A5940] transition-colors flex items-center gap-1"
                        title="Mark as Read"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        Finished
                      </button>
                      <button
                        onClick={() => handleRemoveBook(book)}
                        className="p-1.5 rounded text-[#96A888] hover:text-[#5F7252] hover:bg-[#F8F6EE] transition-colors"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
