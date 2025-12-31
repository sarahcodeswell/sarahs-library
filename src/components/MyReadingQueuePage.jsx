import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, Trash2, BookOpen, Library, Headphones, ShoppingBag, Star, Info, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { track } from '@vercel/analytics';
import { useReadingQueue } from '../contexts/ReadingQueueContext';
import booksData from '../books.json';

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

// Theme info for displaying themes
const themeInfo = {
  identity: { label: 'Identity & Belonging', icon: null, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  family: { label: 'Family & Relationships', icon: null, color: 'bg-pink-100 text-pink-800 border-pink-200' },
  love: { label: 'Love & Relationships', icon: null, color: 'bg-red-100 text-red-800 border-red-200' },
  grief: { label: 'Grief & Loss', icon: null, color: 'bg-gray-100 text-gray-800 border-gray-200' },
  friendship: { label: 'Friendship', icon: null, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  community: { label: 'Community & Society', icon: null, color: 'bg-green-100 text-green-800 border-green-200' },
  justice: { label: 'Justice & Systems', icon: null, color: 'bg-purple-100 text-purple-800 border-purple-200' },
  coming_of_age: { label: 'Coming of Age', icon: null, color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  historical: { label: 'Historical Fiction', icon: null, color: 'bg-orange-100 text-orange-800 border-orange-200' },
  memoir: { label: 'Memoir & Biography', icon: null, color: 'bg-teal-100 text-teal-800 border-teal-200' },
  mental_health: { label: 'Mental Health', icon: null, color: 'bg-lime-100 text-lime-800 border-lime-200' },
  immigration: { label: 'Immigration & Migration', icon: null, color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  race: { label: 'Race & Racism', icon: null, color: 'bg-rose-100 text-rose-800 border-rose-200' },
  war: { label: 'War & Conflict', icon: null, color: 'bg-slate-100 text-slate-800 border-slate-200' },
  technology: { label: 'Technology & Science', icon: null, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  art: { label: 'Art & Creativity', icon: null, color: 'bg-violet-100 text-violet-800 border-violet-200' },
  philosophy: { label: 'Philosophy & Ideas', icon: null, color: 'bg-amber-100 text-amber-800 border-amber-200' },
  spirituality: { label: 'Spirituality & Faith', icon: null, color: 'bg-sky-100 text-sky-800 border-sky-200' },
  nature: { label: 'Nature & Environment', icon: null, color: 'bg-green-100 text-green-800 border-green-200' },
  education: { label: 'Education & Learning', icon: null, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  work: { label: 'Work & Career', icon: null, color: 'bg-purple-100 text-purple-800 border-purple-200' },
  health: { label: 'Health & Wellness', icon: null, color: 'bg-red-100 text-red-800 border-red-200' },
  food: { label: 'Food & Culture', icon: null, color: 'bg-orange-100 text-orange-800 border-orange-200' },
  travel: { label: 'Travel & Adventure', icon: null, color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  sports: { label: 'Sports & Competition', icon: null, color: 'bg-lime-100 text-lime-800 border-lime-200' },
  music: { label: 'Music & Performance', icon: null, color: 'bg-pink-100 text-pink-800 border-pink-200' },
  humor: { label: 'Humor & Comedy', icon: null, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  mystery: { label: 'Mystery & Thriller', icon: null, color: 'bg-gray-100 text-gray-800 border-gray-200' },
  fantasy: { label: 'Fantasy & Magic', icon: null, color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  science_fiction: { label: 'Science Fiction', icon: null, color: 'bg-slate-100 text-slate-800 border-slate-200' },
  business: { label: 'Business & Economics', icon: null, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  politics: { label: 'Politics & Government', icon: null, color: 'bg-red-100 text-red-800 border-red-200' },
  religion: { label: 'Religion & Belief', icon: null, color: 'bg-sky-100 text-sky-800 border-sky-200' },
  parenting: { label: 'Parenting & Family', icon: null, color: 'bg-rose-100 text-rose-800 border-rose-200' },
  aging: { label: 'Aging & Time', icon: null, color: 'bg-gray-100 text-gray-800 border-gray-200' },
  disability: { label: 'Disability & Accessibility', icon: null, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  addiction: { label: 'Addiction & Recovery', icon: null, color: 'bg-purple-100 text-purple-800 border-purple-200' },
  rural: { label: 'Rural Life', icon: null, color: 'bg-green-100 text-green-800 border-green-200' },
  urban: { label: 'Urban Life', icon: null, color: 'bg-gray-100 text-gray-800 border-gray-200' },
  lgbtq: { label: 'LGBTQ+ Stories', icon: null, color: 'bg-rainbow-100 text-rainbow-800 border-rainbow-200' },
  feminism: { label: 'Feminism & Gender', icon: null, color: 'bg-pink-100 text-pink-800 border-pink-200' },
  colonialism: { label: 'Colonialism & Post-Colonialism', icon: null, color: 'bg-orange-100 text-orange-800 border-orange-200' },
  diaspora: { label: 'Diaspora & Migration', icon: null, color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  class: { label: 'Class & Economic', icon: null, color: 'bg-slate-100 text-slate-800 border-slate-200' },
  environment: { label: 'Environment & Climate', icon: null, color: 'bg-green-100 text-green-800 border-green-200' },
  animal: { label: 'Animal Stories', icon: null, color: 'bg-amber-100 text-amber-800 border-amber-200' },
  biography: { label: 'Biography & Memoir', icon: null, color: 'bg-teal-100 text-teal-800 border-teal-200' },
  poetry: { label: 'Poetry & Literature', icon: null, color: 'bg-violet-100 text-violet-800 border-violet-200' },
  short_stories: { label: 'Short Stories', icon: null, color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  essays: { label: 'Essays & Nonfiction', icon: null, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  graphic_novels: { label: 'Graphic Novels', icon: null, color: 'bg-pink-100 text-pink-800 border-pink-200' },
  young_adult: { label: 'Young Adult', icon: null, color: 'bg-purple-100 text-purple-800 border-purple-200' },
  children: { label: "Children's Books", icon: null, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  self_help: { label: 'Self Help & Personal Growth', icon: null, color: 'bg-green-100 text-green-800 border-green-200' }
};

function SortableBookCard({ book, index, onMarkAsRead, onRemove, isFirst, showAcquisition, onToggleAcquisition }) {
  const [expanded, setExpanded] = useState(false);
  
  // Look up full book details from local catalog, or use stored data
  const bookDetails = useMemo(() => {
    const t = String(book?.book_title || '');
    const key = t.toLowerCase().trim();
    const catalogBook = booksData.find(b => b.title?.toLowerCase().trim() === key);
    
    // If found in catalog, use catalog data
    if (catalogBook) {
      return {
        ...catalogBook,
        source: 'catalog'
      };
    }
    
    // Otherwise, use stored data from the book itself (from recommendations)
    if (book.description || book.why_recommended) {
      return {
        title: book.book_title,
        author: book.book_author,
        description: book.description || book.why_recommended,
        themes: [],
        source: 'stored'
      };
    }
    
    return null;
  }, [book]);

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
      className={`rounded-xl border ${
        isFirst 
          ? 'bg-gradient-to-r from-[#F8F6EE] to-white border-[#5F7252] ring-1 ring-[#5F7252]/20' 
          : 'bg-white border-[#E8EBE4]'
      } p-4 hover:shadow-md transition-all ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      {/* Next Up Badge for first book */}
      {isFirst && (
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#E8EBE4]">
          <span className="px-2 py-0.5 bg-[#5F7252] text-white text-xs font-medium rounded-full">
            Next Up
          </span>
          <span className="text-xs text-[#7A8F6C]">Ready to read? Get your copy below.</span>
        </div>
      )}
      
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
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1">
                <h3 className={`font-medium ${
                  isFirst ? 'text-[#4A5940] text-base' : 'text-[#4A5940] text-sm'
                }`}>
                  {book.book_title}
                </h3>
                {bookDetails && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="p-1 hover:bg-[#E8EBE4] rounded transition-colors flex-shrink-0 mt-0.5"
                    aria-label={expanded ? "Show less" : "Show more"}
                  >
                    <ChevronDown className={`w-4 h-4 text-[#7A8F6C] transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
              {book.book_author && (
                <p className="text-sm text-[#7A8F6C]">
                  by {book.book_author}
                </p>
              )}
              
              {/* Brief description when collapsed */}
              {!expanded && bookDetails?.description && (
                <p className="text-xs text-[#5F7252] mt-2 line-clamp-2">
                  {bookDetails.description}
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
              <p className="text-xs text-[#7A8F6C] mb-2 italic">
                We encourage readers to support local bookstores, independent audiobook sellers, and public libraries
              </p>
              <div className="flex flex-wrap gap-2">
                {/* Preferred: Local Bookstore */}
                <a
                  href={`https://bookshop.org/search?keywords=${encodeURIComponent(book.book_title + ' ' + (book.book_author || ''))}&a_aid=${BOOKSHOP_AFFILIATE_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#5F7252] hover:bg-[#4A5940] rounded-lg text-xs text-white transition-colors flex items-center gap-1.5 font-medium"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Local Bookstore
                </a>
                {/* Preferred: Libro.fm */}
                <a
                  href={`https://libro.fm/search?q=${encodeURIComponent(book.book_title + ' ' + (book.book_author || ''))}&affiliate=${LIBRO_FM_AFFILIATE_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#5F7252] hover:bg-[#4A5940] rounded-lg text-xs text-white transition-colors flex items-center gap-1.5 font-medium"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  Libro.fm
                </a>
                {/* Library - preferred free option */}
                <a
                  href="https://libbyapp.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#5F7252] hover:bg-[#4A5940] rounded-lg text-xs text-white transition-colors flex items-center gap-1.5 font-medium"
                >
                  <Library className="w-3.5 h-3.5" />
                  Library
                </a>
                {/* Amazon options - last */}
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
                  href={`https://www.audible.com/search?keywords=${encodeURIComponent(book.book_title + ' ' + (book.book_author || ''))}&tag=${AUDIBLE_AFFILIATE_TAG}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#F8F6EE] hover:bg-[#E8EBE4] rounded-lg text-xs text-[#5F7252] transition-colors flex items-center gap-1.5"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  Audible
                </a>
              </div>
            </div>
          )}
          
          {/* Expanded Book Details */}
          {expanded && bookDetails && (
            <div className="mt-3 pt-3 border-t border-[#E8EBE4]">
              {bookDetails.favorite && (
                <div className="mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <p className="text-xs font-medium text-[#4A5940]">All-Time Favorite</p>
                </div>
              )}
              
              {bookDetails.description && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-[#4A5940] mb-2">About this book:</p>
                  <p className="text-xs text-[#5F7252] leading-relaxed">{bookDetails.description}</p>
                </div>
              )}
              
              {bookDetails.themes && bookDetails.themes.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-[#4A5940] mb-2">Themes:</p>
                  <div className="flex flex-wrap gap-2">
                    {bookDetails.themes.slice(0, 5).map(theme => {
                      const ThemeIcon = themeInfo[theme]?.icon;
                      return (
                        <span 
                          key={theme} 
                          className={`text-xs px-2 py-0.5 rounded-full border ${themeInfo[theme]?.color || 'bg-gray-100 text-gray-800 border-gray-200'} flex items-center gap-1`}
                        >
                          {ThemeIcon && <ThemeIcon className="w-3 h-3" />}
                          {themeInfo[theme]?.label || theme}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Reviews Link */}
              <div className="pt-3 border-t border-[#E8EBE4]">
                <a
                  href={`https://www.goodreads.com/search?q=${encodeURIComponent((bookDetails.title || book.book_title) + ' ' + (bookDetails.author || book.book_author))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    track('read_reviews_clicked', { 
                      book_title: bookDetails.title || book.book_title,
                      book_author: bookDetails.author || book.book_author,
                      source: 'reading_queue'
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
  const [finishedBook, setFinishedBook] = useState(null); // For showing confirmation modal

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
    console.log('🔍 [handleMarkAsRead] Starting process for:', {
      bookId: book.id,
      title: book.book_title,
      author: book.book_author,
      userId: user?.id
    });
    
    if (!user) {
      console.log('❌ [handleMarkAsRead] No user logged in');
      onShowAuthModal();
      return;
    }

    let addedToCollection = false;

    // First update the status to 'finished'
    console.log('📝 [handleMarkAsRead] Updating status to finished...');
    const statusResult = await updateQueueStatus(book.id, 'finished');
    
    console.log('📊 [handleMarkAsRead] Status update result:', {
      success: statusResult.success,
      error: statusResult.error
    });
    
    if (statusResult.success) {
      // Also add to user's collection (user_books table)
      try {
        console.log('📚 [handleMarkAsRead] Adding to user collection...');
        const { db } = await import('../lib/supabase');
        const collectionResult = await db.addUserBook(user.id, {
          title: book.book_title,
          author: book.book_author,
          addedVia: 'reading_queue'
        });
        
        console.log('📊 [handleMarkAsRead] Collection add result:', {
          success: !collectionResult.error,
          error: collectionResult.error,
          data: collectionResult.data
        });
        
        if (collectionResult.error) {
          console.error('❌ [handleMarkAsRead] Failed to add to collection:', collectionResult.error);
        } else {
          console.log('✅ [handleMarkAsRead] Book successfully added to collection:', book.book_title);
          addedToCollection = true;
        }
      } catch (error) {
        console.error('❌ [handleMarkAsRead] Exception adding to collection:', error);
      }
      
      track('book_marked_as_read_from_queue', {
        book_title: book.book_title,
        added_to_collection: addedToCollection
      });
      
      // Show confirmation modal
      setFinishedBook(book);
    } else {
      console.error('❌ [handleMarkAsRead] Failed to update book status:', statusResult.error);
      alert('Failed to update book status. Please try again.');
    }
    
    console.log('🏁 [handleMarkAsRead] Process completed');
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
      {/* Finished Book Confirmation Modal */}
      {finishedBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#5F7252]/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[#5F7252]" />
              </div>
              <div>
                <h3 className="font-medium text-[#4A5940]">Moved to Collection!</h3>
                <p className="text-xs text-[#7A8F6C]">{finishedBook.book_title}</p>
              </div>
            </div>
            <p className="text-sm text-[#5F7252] mb-4">
              Rate this book to improve your future recommendations.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setFinishedBook(null);
                  onNavigate('collection');
                  track('finished_confirmation_go_to_collection', {
                    book_title: finishedBook.book_title
                  });
                }}
                className="flex-1 px-4 py-2.5 bg-[#5F7252] text-white rounded-lg text-sm font-medium hover:bg-[#4A5940] transition-colors flex items-center justify-center gap-2"
              >
                <Library className="w-4 h-4" />
                Go to Collection
              </button>
              <button
                onClick={() => {
                  setFinishedBook(null);
                  track('finished_confirmation_stay', {
                    book_title: finishedBook.book_title
                  });
                }}
                className="px-4 py-2.5 bg-[#F8F6EE] text-[#5F7252] rounded-lg text-sm font-medium hover:bg-[#E8EBE4] transition-colors"
              >
                Stay Here
              </button>
            </div>
          </div>
        </div>
      )}

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
            {searchQuery ? (
              <p className="text-[#7A8F6C] text-sm">No books found matching "{searchQuery}"</p>
            ) : (
              <div className="max-w-sm mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#5F7252]/10 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-[#5F7252]" />
                </div>
                <h3 className="font-medium text-[#4A5940] mb-2">Your reading queue is empty</h3>
                <p className="text-[#7A8F6C] text-sm mb-4">
                  Ready to discover your next great read?
                </p>
                <button
                  onClick={() => onNavigate('home')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#5F7252] text-white rounded-lg text-sm font-medium hover:bg-[#4A5940] transition-colors"
                >
                  <Star className="w-4 h-4" />
                  Ask Sarah for Recommendations
                </button>
              </div>
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
