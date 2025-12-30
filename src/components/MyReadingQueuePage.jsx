import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, Trash2, BookOpen, GripVertical, Library, Headphones, ShoppingBag } from 'lucide-react';
import { track } from '@vercel/analytics';
import { useReadingQueue } from '../contexts/ReadingQueueContext';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const BOOKSHOP_AFFILIATE_ID = '119544';
const AMAZON_AFFILIATE_TAG = 'sarahsbooks01-20';
const LIBRO_FM_AFFILIATE_ID = 'sarahsbooks';
const AUDIBLE_AFFILIATE_TAG = 'sarahsbooks01-20';

function SortableBookCard({ book, index, onMarkAsRead, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: book.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border border-[#E8EBE4] p-4 hover:shadow-md transition-shadow ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-serif text-[#96A888] w-8 text-center select-none">
            {index + 1}
          </span>
          <button
            {...attributes}
            {...listeners}
            className="p-1.5 rounded cursor-grab active:cursor-grabbing text-[#96A888] hover:text-[#5F7252] hover:bg-[#F8F6EE] transition-colors touch-none"
            title="Drag to reorder"
          >
            <GripVertical className="w-5 h-5" />
          </button>
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
            {index === 0 && (
              <span className="inline-block px-2 py-0.5 text-xs font-medium bg-[#5F7252] text-white rounded-full">
                Next Up
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onMarkAsRead(book)}
              className="px-3 py-1.5 rounded text-sm font-medium text-white bg-[#5F7252] hover:bg-[#4A5940] transition-colors flex items-center gap-1"
              title="Mark as Finished"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Finished</span>
            </button>
            <button
              onClick={() => onRemove(book)}
              className="p-1.5 rounded text-[#96A888] hover:text-[#5F7252] hover:bg-[#F8F6EE] transition-colors"
              title="Remove from queue"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyReadingQueuePage({ onNavigate, user, onShowAuthModal }) {
  const { readingQueue, removeFromQueue, updateQueueStatus } = useReadingQueue();
  const [searchQuery, setSearchQuery] = useState('');
  const [localOrder, setLocalOrder] = useState([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      const oldIndex = filteredBooks.findIndex(item => item.id === active.id);
      const newIndex = filteredBooks.findIndex(item => item.id === over.id);
      
      const newOrder = arrayMove(filteredBooks, oldIndex, newIndex);
      setLocalOrder(newOrder.map(item => item.id));
      
      track('reading_queue_reordered', {
        from_position: oldIndex + 1,
        to_position: newIndex + 1,
        queue_length: filteredBooks.length
      });
    }
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

        <div className="mb-6">
          <h1 className="text-3xl font-serif text-[#4A5940] mb-2">My Reading Queue</h1>
          <p className="text-[#7A8F6C]">
            {queueBooks.length} {queueBooks.length === 1 ? 'book' : 'books'} you want to read
          </p>
        </div>

        {/* Smart Acquisition Bar - Shows for #1 book */}
        {filteredBooks.length > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-[#5F7252] to-[#4A5940] rounded-xl border border-[#E8EBE4] text-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🎯</span>
              <span className="text-sm font-medium">Next Up:</span>
              <span className="font-serif">{filteredBooks[0].book_title}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://bookshop.org/search?keywords=${encodeURIComponent(filteredBooks[0].book_title + ' ' + (filteredBooks[0].book_author || ''))}&a_aid=${BOOKSHOP_AFFILIATE_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
              >
                <ShoppingBag className="w-3 h-3" />
                Buy
              </a>
              <a
                href={`https://libro.fm/search?q=${encodeURIComponent(filteredBooks[0].book_title + ' ' + (filteredBooks[0].book_author || ''))}&affiliate=${LIBRO_FM_AFFILIATE_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
              >
                <Headphones className="w-3 h-3" />
                Listen
              </a>
              <a
                href="https://libbyapp.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
              >
                <Library className="w-3 h-3" />
                Library
              </a>
            </div>
          </div>
        )}

        {/* Compact Acquisition Options */}
        <div className="mb-6 p-3 bg-[#F8F6EE] rounded-lg border border-[#E8EBE4]">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer text-xs text-[#5F7252] hover:text-[#4A5940] transition-colors">
              <span className="font-medium">📚 Where to get books</span>
              <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-2 space-y-1 text-xs text-[#7A8F6C]">
              <p>• <strong>Buy:</strong> <a href={`https://bookshop.org/?a_aid=${BOOKSHOP_AFFILIATE_ID}`} className="text-[#5F7252] hover:underline">Bookshop.org</a> (local), <a href={`https://www.amazon.com/kindle-dbs/storefront?tag=${AMAZON_AFFILIATE_TAG}`} className="text-[#5F7252] hover:underline">Kindle</a></p>
              <p>• <strong>Listen:</strong> <a href={`https://libro.fm/?affiliate=${LIBRO_FM_AFFILIATE_ID}`} className="text-[#5F7252] hover:underline">Libro.fm</a>, <a href={`https://www.audible.com/?tag=${AUDIBLE_AFFILIATE_TAG}`} className="text-[#5F7252] hover:underline">Audible</a></p>
              <p>• <strong>Library:</strong> <a href="https://libbyapp.com" className="text-[#5F7252] hover:underline">Libby app</a></p>
            </div>
          </details>
        </div>

        {/* Instructions */}
        <div className="mb-6 p-3 bg-[#F8F6EE] rounded-lg border border-[#E8EBE4]">
          <p className="text-xs text-[#7A8F6C]">
            <strong>💡 Tip:</strong> Drag the ⋮⋮ handle to reorder. Tap "Finished" to move books to your collection.
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
              <p className="text-[#96A888] text-xs mt-2">Add books from recommendations to start building your queue.</p>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredBooks.map(b => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {filteredBooks.map((book, index) => (
                  <SortableBookCard
                    key={book.id}
                    book={book}
                    index={index}
                    onMarkAsRead={handleMarkAsRead}
                    onRemove={handleRemoveBook}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
