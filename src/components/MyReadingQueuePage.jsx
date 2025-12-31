import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, Trash2, BookOpen, GripVertical, Library, Headphones, ShoppingBag, ChevronDown, ChevronUp, Info } from 'lucide-react';
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

function SortableBookCard({ book, index, onMarkAsRead, onRemove, isFirst, showAcquisition, onToggleAcquisition }) {
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
      className={`bg-white rounded-xl border ${
        isFirst ? 'border-[#5F7252] ring-1 ring-[#5F7252]/20' : 'border-[#E8EBE4]'
      } p-4 hover:shadow-md transition-all ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-serif w-8 text-center select-none ${
            isFirst ? 'text-[#5F7252]' : 'text-[#96A888]'
          }`}>
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
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className={`font-medium mb-1 truncate ${
                isFirst ? 'text-[#4A5940] text-base' : 'text-[#4A5940] text-sm'
              }`}>
                {book.book_title}
              </h3>
              {book.book_author && (
                <p className="text-sm text-[#7A8F6C]">
                  by {book.book_author}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {isFirst && (
                <button
                  onClick={onToggleAcquisition}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                    showAcquisition 
                      ? 'bg-[#5F7252] text-white' 
                      : 'bg-[#F8F6EE] text-[#5F7252] hover:bg-[#E8EBE4]'
                  }`}
                >
                  Get It
                  {showAcquisition ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
              <button
                onClick={() => onMarkAsRead(book)}
                className="px-3 py-1.5 rounded text-xs font-medium text-white bg-[#5F7252] hover:bg-[#4A5940] transition-colors flex items-center gap-1"
                title="Mark as Finished"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Finished</span>
              </button>
              <button
                onClick={() => onRemove(book)}
                className="p-1.5 rounded text-[#96A888] hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Remove from queue"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Inline Acquisition Options - Only for #1 book when expanded */}
          {isFirst && showAcquisition && (
            <div className="mt-3 pt-3 border-t border-[#E8EBE4]">
              <div className="flex flex-wrap gap-2">
                <a
                  href={`https://bookshop.org/search?keywords=${encodeURIComponent(book.book_title + ' ' + (book.book_author || ''))}&a_aid=${BOOKSHOP_AFFILIATE_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#F8F6EE] hover:bg-[#E8EBE4] rounded-lg text-xs text-[#5F7252] transition-colors flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Bookshop.org
                </a>
                <a
                  href={`https://www.amazon.com/s?k=${encodeURIComponent(book.book_title + ' ' + (book.book_author || ''))}&i=digital-text&tag=${AMAZON_AFFILIATE_TAG}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#F8F6EE] hover:bg-[#E8EBE4] rounded-lg text-xs text-[#5F7252] transition-colors flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Kindle
                </a>
                <a
                  href={`https://libro.fm/search?q=${encodeURIComponent(book.book_title + ' ' + (book.book_author || ''))}&affiliate=${LIBRO_FM_AFFILIATE_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#F8F6EE] hover:bg-[#E8EBE4] rounded-lg text-xs text-[#5F7252] transition-colors flex items-center gap-1.5"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  Libro.fm
                </a>
                <a
                  href={`https://www.audible.com/search?keywords=${encodeURIComponent(book.book_title + ' ' + (book.book_author || ''))}&tag=${AUDIBLE_AFFILIATE_TAG}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#F8F6EE] hover:bg-[#E8EBE4] rounded-lg text-xs text-[#5F7252] transition-colors flex items-center gap-1.5"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  Audible
                </a>
                <a
                  href="https://libbyapp.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#F8F6EE] hover:bg-[#E8EBE4] rounded-lg text-xs text-[#5F7252] transition-colors flex items-center gap-1.5"
                >
                  <Library className="w-3.5 h-3.5" />
                  Library
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyReadingQueuePage({ onNavigate, user, onShowAuthModal }) {
  const { readingQueue, removeFromQueue, updateQueueStatus } = useReadingQueue();
  const [searchQuery, setSearchQuery] = useState('');
  const [localOrder, setLocalOrder] = useState([]);
  const [showAcquisition, setShowAcquisition] = useState(false);

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

        {/* Search Bar - At top for easy access */}
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
                    isFirst={index === 0}
                    showAcquisition={showAcquisition}
                    onToggleAcquisition={() => setShowAcquisition(!showAcquisition)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Inline tip at bottom */}
        {filteredBooks.length > 0 && (
          <div className="mt-6 flex items-center gap-2 text-xs text-[#96A888]">
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Drag the handle to reorder your queue. Tap "Finished" to move books to your collection.</span>
          </div>
        )}
      </div>
    </div>
  );
}
