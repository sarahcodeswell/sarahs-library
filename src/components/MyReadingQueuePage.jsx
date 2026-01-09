import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Search, Trash2, BookOpen, Library, Headphones, ShoppingBag, Star, Info, GripVertical, ChevronDown, ChevronUp, Book, PartyPopper } from 'lucide-react';
import { track } from '@vercel/analytics';
import { useReadingQueue } from '../contexts/ReadingQueueContext';
import { db } from '../lib/supabase';
import { useBookEnrichment } from './BookCard';
import { BookCover, GenreBadges, ReputationBox, ExpandToggle } from './ui';
import { enrichBookReputation } from '../lib/reputationEnrichment';
import { stripAccoladesFromDescription } from '../lib/descriptionUtils';
import { ExpandableDescription } from './ExpandableDescription';
import booksData from '../books.json';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
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

// Droppable zone component for status changes
function DroppableZone({ id, label, icon: Icon, color, isOver, children, isEmpty }) {
  const { setNodeRef } = useDroppable({ id });
  
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 border-dashed p-4 transition-all duration-200 ${
        isOver 
          ? `${color.activeBorder} ${color.activeBg} scale-[1.02]` 
          : `${color.border} ${color.bg}`
      }`}
    >
      {children ? (
        children
      ) : (
        <div className={`flex items-center justify-center gap-2 py-4 ${isOver ? color.activeText : color.text}`}>
          <Icon className="w-5 h-5" />
          <span className="text-sm font-medium">{label}</span>
        </div>
      )}
    </div>
  );
}

// Compact book card for drag overlay
function DragOverlayCard({ book }) {
  return (
    <div className="rounded-xl border border-[#5F7252] bg-white p-3 shadow-xl opacity-90 max-w-xs">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-[#5F7252]" />
        <div className="min-w-0">
          <p className="font-medium text-[#4A5940] text-sm truncate">{book.book_title}</p>
          <p className="text-xs text-[#7A8F6C] truncate">{book.book_author}</p>
        </div>
      </div>
    </div>
  );
}

// Compact sortable book card for Currently Reading
function SortableCurrentlyReadingCard({ book, index, onFinished, onNotForMe, onMoveToQueue }) {
  // Auto-enrich with cover if missing
  const { coverUrl, isEnriching } = useBookEnrichment(
    book.book_title,
    book.book_author,
    book.cover_image_url,
    book.genres
  );

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
      className={`rounded-lg border border-[#E8EBE4] bg-[#FDFCF9] p-3 hover:shadow-md transition-all ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded cursor-grab active:cursor-grabbing text-[#96A888] hover:text-[#5F7252] hover:bg-[#F8F6EE] transition-colors touch-none flex-shrink-0"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        
        {/* Small cover */}
        <div className="flex-shrink-0 w-10 h-14 rounded bg-gradient-to-br from-[#96A888] to-[#7A8F6C] flex items-center justify-center overflow-hidden">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          ) : isEnriching ? (
            <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
          ) : (
            <BookOpen className="w-4 h-4 text-white/70" />
          )}
        </div>
        
        {/* Title and author */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[#4A5940] text-sm truncate">{book.book_title}</p>
          <p className="text-xs text-[#7A8F6C] truncate">{book.book_author}</p>
        </div>
        
        {/* Compact action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onMoveToQueue(book)}
            className="px-2 py-1 rounded text-xs text-[#96A888] hover:text-[#5F7252] hover:bg-[#E8EBE4] transition-colors"
            title="Move back to Want to Read"
          >
            ←
          </button>
          <button
            onClick={() => onFinished(book)}
            className="px-2.5 py-1 rounded text-xs font-medium text-white bg-[#5F7252] hover:bg-[#4A5940] transition-colors"
          >
            Finished
          </button>
          <button
            onClick={() => onNotForMe(book)}
            className="p-1 rounded text-[#96A888] hover:text-[#7A8F6C] hover:bg-[#F8F6EE] transition-colors"
            title="Not for me"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Currently Reading section - sortable list
function CurrentlyReadingSection({ isOver, books, onFinished, onNotForMe, onMoveToQueue }) {
  const { setNodeRef } = useDroppable({ id: 'reading-zone' });
  
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 transition-all duration-200 ${
        isOver 
          ? 'border-[#5F7252] bg-[#5F7252]/5 scale-[1.01]' 
          : books.length > 0 
            ? 'border-[#E8EBE4] bg-[#F8F6EE]' 
            : 'border-dashed border-[#96A888] bg-[#F8F6EE]/50'
      }`}
    >
      {books.length > 0 ? (
        <div className="p-4">
          <SortableContext
            items={books.map(b => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {books.map((book, index) => (
                <SortableCurrentlyReadingCard
                  key={book.id}
                  book={book}
                  index={index}
                  onFinished={onFinished}
                  onNotForMe={onNotForMe}
                  onMoveToQueue={onMoveToQueue}
                />
              ))}
            </div>
          </SortableContext>
        </div>
      ) : (
        <div className={`flex flex-col items-center justify-center gap-2 py-6 px-4 ${isOver ? 'text-[#5F7252]' : 'text-[#96A888]'}`}>
          <BookOpen className="w-5 h-5" />
          <span className="text-sm">Drag a book down here to start reading</span>
        </div>
      )}
    </div>
  );
}

// Collection book thumbnail with cover enrichment
function CollectionBookThumbnail({ book, onClick }) {
  // Auto-enrich cover if missing
  const { coverUrl, isEnriching } = useBookEnrichment(
    book.title,
    book.author,
    book.cover_url,
    null
  );

  return (
    <div
      className="flex-shrink-0 w-20 group cursor-pointer"
      onClick={onClick}
    >
      <div className="w-20 h-28 rounded-lg bg-gradient-to-br from-[#96A888] to-[#7A8F6C] flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : isEnriching ? (
          <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
        ) : (
          <BookOpen className="w-6 h-6 text-white/70" />
        )}
      </div>
      <p className="text-xs text-[#5F7252] mt-1.5 truncate font-medium">{book.title}</p>
      {book.rating && (
        <div className="flex items-center gap-0.5 mt-0.5">
          {[...Array(book.rating)].map((_, i) => (
            <Star key={i} className="w-2.5 h-2.5 fill-[#5F7252] text-[#5F7252]" />
          ))}
        </div>
      )}
    </div>
  );
}

// Want to Read drop zone (for dragging from Currently Reading back)
function WantToReadDropZone({ isOver, children }) {
  const { setNodeRef } = useDroppable({ id: 'want-to-read-zone' });
  
  return (
    <div
      ref={setNodeRef}
      className={`mb-6 rounded-xl transition-all duration-200 ${
        isOver 
          ? 'ring-2 ring-[#5F7252] ring-offset-2 bg-[#5F7252]/5' 
          : ''
      }`}
    >
      {children}
    </div>
  );
}

// Add to Collection drop zone (positive signal - finished and kept)
function CollectionDropZone({ isOver }) {
  const { setNodeRef } = useDroppable({ id: 'collection-zone' });
  
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 border-dashed transition-all duration-200 ${
        isOver 
          ? 'border-[#5F7252] bg-[#5F7252]/10 scale-[1.01]' 
          : 'border-[#5F7252]/50 bg-[#F8F6EE]/50'
      }`}
    >
      <div className={`flex items-center justify-center gap-2 py-6 px-4 ${isOver ? 'text-[#5F7252]' : 'text-[#7A8F6C]'}`}>
        <Library className="w-5 h-5" />
        <span className="text-sm font-medium">Add to My Collection</span>
      </div>
    </div>
  );
}

// "Not for me" drop zone (negative signal - dismissed)
function NotForMeDropZone({ isOver }) {
  const { setNodeRef } = useDroppable({ id: 'not-for-me-zone' });
  
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 border-dashed transition-all duration-200 ${
        isOver 
          ? 'border-[#96A888] bg-[#96A888]/10 scale-[1.01]' 
          : 'border-[#96A888]/50 bg-[#F8F6EE]/30'
      }`}
    >
      <div className={`flex items-center justify-center gap-2 py-6 px-4 ${isOver ? 'text-[#7A8F6C]' : 'text-[#96A888]'}`}>
        <Trash2 className="w-5 h-5" />
        <span className="text-sm font-medium">Not for me</span>
      </div>
    </div>
  );
}

// Finished Book Modal - asks if user wants to add to collection with rating/review
function FinishedBookModal({ book, onAddToCollection, onNoThanks, onClose }) {
  const [step, setStep] = useState('ask'); // 'ask' or 'rate'
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');

  const handleYes = () => {
    setStep('rate');
  };

  const handleSaveAndDone = () => {
    onAddToCollection(book, rating || null, review.trim() || null);
  };

  const handleSkip = () => {
    onAddToCollection(book, null, null);
  };

  if (step === 'rate') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#5F7252]/10 flex items-center justify-center">
              <Library className="w-6 h-6 text-[#5F7252]" />
            </div>
            <h3 className="text-lg font-serif text-[#4A5940]">Added to your collection!</h3>
          </div>

          <div className="mb-6">
            <p className="text-sm text-[#7A8F6C] mb-3 text-center">How would you rate it?</p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoverRating || rating)
                        ? 'fill-[#5F7252] text-[#5F7252]'
                        : 'text-[#E8EBE4]'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-[#7A8F6C] mb-2">Share your thoughts (optional)</p>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="What did you love about this book? Would you recommend it to others?"
              className="w-full p-3 border border-[#E8EBE4] rounded-lg text-sm text-[#4A5940] placeholder:text-[#96A888] focus:outline-none focus:ring-2 focus:ring-[#5F7252] resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 px-4 py-2.5 text-[#7A8F6C] hover:bg-[#F8F6EE] rounded-lg text-sm font-medium transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleSaveAndDone}
              className="flex-1 px-4 py-2.5 bg-[#5F7252] text-white rounded-lg text-sm font-medium hover:bg-[#4A5940] transition-colors"
            >
              Save & Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative overflow-hidden">
        {/* Celebratory background decoration */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#5F7252] via-[#96A888] to-[#5F7252]" />
        
        <div className="text-center mb-6">
          {/* Fun celebration icon */}
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-[#5F7252] to-[#7A8F6C] flex items-center justify-center shadow-lg">
            <PartyPopper className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-serif text-[#4A5940]">
            Congrats! You finished
          </h3>
          <p className="text-lg font-serif text-[#5F7252] italic mt-1">
            {book.book_title}
          </p>
          <p className="text-sm text-[#7A8F6C] mt-3">Add to your collection?</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleYes}
            className="w-full p-4 rounded-xl border-2 border-[#5F7252] bg-[#5F7252]/5 hover:bg-[#5F7252]/10 transition-colors text-left"
          >
            <p className="font-medium text-[#4A5940]">Yes, add to my collection</p>
            <p className="text-xs text-[#7A8F6C] mt-1">
              I loved it! Show me more books like this.
            </p>
          </button>

          <button
            onClick={() => onNoThanks(book)}
            className="w-full p-4 rounded-xl border border-[#E8EBE4] hover:bg-[#F8F6EE] transition-colors text-left"
          >
            <p className="font-medium text-[#7A8F6C]">No thanks</p>
            <p className="text-xs text-[#96A888] mt-1">
              Keep my collection for books I've loved.
            </p>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 text-xs text-[#96A888] hover:text-[#7A8F6C]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function SortableBookCard({ book, index, onRemove, onStartReading, onNotForMe, isFirst, onUpdateBook, onToggleOwned }) {
  const [expanded, setExpanded] = useState(false);
  const [reputation, setReputation] = useState(book.reputation || null);
  const [isEnrichingReputation, setIsEnrichingReputation] = useState(false);
  const [owned, setOwned] = useState(book.owned || false);
  const [showAcquisition, setShowAcquisition] = useState(false);
  
  // Auto-enrich reputation when expanded and missing
  useEffect(() => {
    if (expanded && !reputation && !isEnrichingReputation && book.book_title) {
      setIsEnrichingReputation(true);
      enrichBookReputation(book)
        .then((rep) => {
          if (rep) {
            setReputation(rep);
            // Update parent state if callback provided
            if (onUpdateBook) {
              onUpdateBook(book.id, { reputation: rep });
            }
          }
        })
        .catch(console.error)
        .finally(() => setIsEnrichingReputation(false));
    }
  }, [expanded, reputation, isEnrichingReputation, book]);
  
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

  // Auto-enrich with cover and genres if missing
  const { coverUrl, genres, isEnriching } = useBookEnrichment(
    book.book_title,
    book.book_author,
    book.cover_image_url,
    book.genres
  );

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
            <div className="flex gap-3 flex-1 min-w-0">
              <BookCover coverUrl={coverUrl} title={book.book_title} isEnriching={isEnriching} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-1">
                  <h3 className={`font-medium ${
                    isFirst ? 'text-[#4A5940] text-base' : 'text-[#4A5940] text-sm'
                  }`}>
                    {book.book_title}
                  </h3>
                </div>
                {book.book_author && (
                  <p className="text-sm text-[#7A8F6C]">
                    by {book.book_author}
                  </p>
                )}
                
                {/* Genres */}
                <div className="mt-1">
                  <GenreBadges genres={genres} maxDisplay={2} />
                </div>
                
                {/* Show more/less toggle for book details */}
                {bookDetails && (
                  <ExpandToggle expanded={expanded} onToggle={() => setExpanded(!expanded)} className="mt-2" />
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Ownership toggle - single book icon, gray when unowned, dark sage with white outline when owned */}
              <button
                onClick={() => {
                  const newOwned = !owned;
                  setOwned(newOwned);
                  onToggleOwned(book.id, newOwned);
                }}
                className={`p-1.5 rounded border transition-colors ${
                  owned 
                    ? 'bg-[#5F7252] text-white border-white shadow-sm hover:bg-[#4A5940]' 
                    : 'text-[#96A888] border-transparent hover:text-[#5F7252] hover:bg-[#F8F6EE]'
                }`}
                title={owned ? 'I own this book (click to unmark)' : 'Mark as owned'}
              >
                <Book className="w-4 h-4" />
              </button>
              
              {/* Show Get It button on all books, hide when owned */}
              {!owned && (
                <button
                  onClick={() => setShowAcquisition(!showAcquisition)}
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
                onClick={() => onStartReading(book)}
                className="px-3 py-1.5 rounded text-xs font-medium text-white bg-[#5F7252] hover:bg-[#4A5940] transition-colors flex items-center gap-1"
                title="Start Reading"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Start Reading</span>
              </button>
              <button
                onClick={() => onNotForMe(book)}
                className="p-1.5 rounded text-[#96A888] hover:text-[#7A8F6C] hover:bg-[#F8F6EE] transition-colors"
                title="Not for me"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Inline Acquisition Options - Show when Get It is expanded and book not owned */}
          {showAcquisition && !owned && (
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
                  <ExpandableDescription text={stripAccoladesFromDescription(bookDetails.description)} />
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
  const { readingQueue, removeFromQueue, updateQueueStatus, updateQueueItem, addToQueue } = useReadingQueue();
  const [searchQuery, setSearchQuery] = useState('');
  const [localOrder, setLocalOrder] = useState([]);
  const [finishedBook, setFinishedBook] = useState(null); // For showing confirmation modal
  const [collectionBooks, setCollectionBooks] = useState([]);
  const [addBookSearch, setAddBookSearch] = useState('');
  const [showAddBook, setShowAddBook] = useState(false);

  // Load collection books for preview
  useEffect(() => {
    const loadCollection = async () => {
      if (!user) return;
      
      // Get user_books (collection)
      const { data: userBooks } = await db.getUserBooks(user.id);
      
      // Get finished books from reading queue
      const finishedFromQueue = readingQueue.filter(
        item => item.status === 'finished' || item.status === 'already_read'
      );
      
      // Combine and dedupe
      const allBooks = [
        ...(userBooks || []).map(b => ({
          id: b.id,
          title: b.book_title,
          author: b.book_author,
          cover_url: b.cover_image_url,
          rating: b.rating,
        })),
        ...finishedFromQueue.map(b => ({
          id: b.id,
          title: b.book_title,
          author: b.book_author,
          cover_url: b.cover_image_url,
          rating: b.rating,
        })),
      ];
      
      // Remove duplicates by title
      const seen = new Set();
      const unique = allBooks.filter(book => {
        const key = book.title?.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      
      setCollectionBooks(unique.slice(0, 10)); // Show up to 10 for preview
    };
    
    loadCollection();
  }, [user, readingQueue]);

  // Search results for adding books
  const addBookResults = useMemo(() => {
    if (!addBookSearch.trim() || addBookSearch.length < 2) return [];
    const query = addBookSearch.toLowerCase();
    
    // Ensure booksData is an array
    const catalog = Array.isArray(booksData) ? booksData : [];
    
    // Search the catalog
    const results = catalog
      .filter(book => 
        book.title?.toLowerCase().includes(query) ||
        book.author?.toLowerCase().includes(query)
      )
      .slice(0, 5); // Limit to 5 results
    
    // Filter out books already in queue
    const queueTitles = new Set(readingQueue.map(b => b.book_title?.toLowerCase()));
    const filtered = results.filter(book => !queueTitles.has(book.title?.toLowerCase()));
    
    console.log('[BookSearch] Query:', query, 'Catalog:', catalog.length, 'Results:', results.length, 'Filtered:', filtered.length);
    
    return filtered;
  }, [addBookSearch, readingQueue]);

  // Add a book to the queue
  const handleAddBook = async (book) => {
    const result = await addToQueue({
      book_title: book.title,
      book_author: book.author,
      description: book.description,
      status: 'want_to_read',
    });
    
    if (result.success) {
      track('book_added_to_queue_direct', {
        book_title: book.title,
        book_author: book.author,
      });
      setAddBookSearch('');
      setShowAddBook(false);
    } else {
      alert('Failed to add book. Please try again.');
    }
  };

  // Handle ownership toggle
  const handleToggleOwned = async (bookId, owned) => {
    const result = await db.updateBookOwnership(bookId, owned);
    if (result.error) {
      console.error('Failed to update ownership:', result.error);
    } else {
      track('book_ownership_toggled', { book_id: bookId, owned });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Track which item is being dragged
  const [activeId, setActiveId] = useState(null);
  const activeBook = useMemo(() => {
    if (!activeId) return null;
    return readingQueue.find(book => book.id === activeId);
  }, [activeId, readingQueue]);

  // Filter books by status
  const currentlyReadingBooks = useMemo(() => {
    return readingQueue.filter(item => item.status === 'reading');
  }, [readingQueue]);

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
    if (import.meta.env.DEV) {
      console.log('🔍 [handleMarkAsRead] Starting process for:', {
        bookId: book.id,
        title: book.book_title,
        author: book.book_author,
        userId: user?.id
      });
    }
    
    if (!user) {
      if (import.meta.env.DEV) console.log('❌ [handleMarkAsRead] No user logged in');
      onShowAuthModal();
      return;
    }

    let addedToCollection = false;

    // First update the status to 'finished'
    if (import.meta.env.DEV) console.log('📝 [handleMarkAsRead] Updating status to finished...');
    const statusResult = await updateQueueStatus(book.id, 'finished');
    
    if (import.meta.env.DEV) {
      console.log('📊 [handleMarkAsRead] Status update result:', {
        success: statusResult.success,
        error: statusResult.error
      });
    }
    
    if (statusResult.success) {
      // Also add to user's collection (user_books table)
      try {
        if (import.meta.env.DEV) console.log('📚 [handleMarkAsRead] Adding to user collection...');
        const { db } = await import('../lib/supabase');
        const collectionResult = await db.addUserBook(user.id, {
          title: book.book_title,
          author: book.book_author,
          addedVia: 'reading_queue'
        });
        
        if (import.meta.env.DEV) {
          console.log('📊 [handleMarkAsRead] Collection add result:', {
            success: !collectionResult.error,
            error: collectionResult.error,
            data: collectionResult.data
          });
        }
        
        if (collectionResult.error) {
          console.error('❌ [handleMarkAsRead] Failed to add to collection:', collectionResult.error);
        } else {
          if (import.meta.env.DEV) console.log('✅ [handleMarkAsRead] Book successfully added to collection:', book.book_title);
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
    
    if (import.meta.env.DEV) console.log('🏁 [handleMarkAsRead] Process completed');
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

  const handleStartReading = async (book) => {
    const result = await updateQueueStatus(book.id, 'reading');
    
    if (result.success) {
      track('book_started_reading', {
        book_title: book.book_title,
      });
    } else {
      alert('Failed to update book status. Please try again.');
    }
  };

  // Move book from Currently Reading back to Want to Read queue
  const handleMoveToQueue = async (book) => {
    const result = await updateQueueStatus(book.id, 'want_to_read');
    
    if (result.success) {
      track('book_moved_to_queue', {
        book_title: book.book_title,
        from_status: book.status,
      });
    } else {
      alert('Failed to move book. Please try again.');
    }
  };

  // Show the "Finished" modal to ask about adding to collection
  const handleFinished = (book) => {
    setFinishedBook(book);
  };

  // Add book to collection (finished and kept - strongest positive signal)
  const handleAddToCollection = async (book, rating = null, review = null) => {
    await handleMarkAsRead(book);
    
    // If rating or review provided, update the user_books entry
    if (rating || review) {
      // The book was just added to user_books by handleMarkAsRead
      // We need to update it with the rating/review
      const { data: userBooks } = await db.getUserBooks(user.id);
      const addedBook = userBooks?.find(b => 
        b.book_title?.toLowerCase() === book.book_title?.toLowerCase()
      );
      if (addedBook) {
        await db.updateUserBook(addedBook.id, { rating, review });
      }
    }
    
    track('book_added_to_collection', {
      book_title: book.book_title,
      from_status: book.status,
      has_rating: !!rating,
      has_review: !!review,
    });
    
    setFinishedBook(null);
  };

  // Mark as finished but don't add to collection - also add to dismissed_recommendations
  // This gives reader credit for finishing while signaling "wouldn't recommend"
  const handleFinishedNoCollection = async (book) => {
    // Update status to finished (keeps in reading_queue for counting)
    const result = await updateQueueStatus(book.id, 'finished');
    
    if (result.success) {
      // Also add to dismissed_recommendations as negative signal
      // "Finished but wouldn't add to collection" = valuable algo signal
      await db.addDismissedRecommendation(user.id, book.book_title, book.book_author);
      
      track('book_finished_no_collection', {
        book_title: book.book_title,
      });
    }
    
    setFinishedBook(null);
  };

  // "Not for me" - dismiss book and add to dismissed_recommendations
  const handleNotForMe = async (book) => {
    // Remove from reading queue
    const result = await removeFromQueue(book.id);
    
    if (result.success) {
      // Add to dismissed_recommendations (same as recommendation dismissal)
      await db.addDismissedRecommendation(user.id, book.book_title, book.book_author);
      
      track('book_not_for_me', {
        book_title: book.book_title,
        from_status: book.status,
      });
    } else {
      alert('Failed to remove book. Please try again.');
    }
  };

  // Track which zone is being hovered
  const [overZone, setOverZone] = useState(null);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { over } = event;
    if (over?.id === 'reading-zone' || over?.id === 'want-to-read-zone' || over?.id === 'collection-zone' || over?.id === 'not-for-me-zone') {
      setOverZone(over.id);
    } else {
      setOverZone(null);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    setOverZone(null);
    
    if (!over) return;

    // Check if dropped on a status zone
    if (over.id === 'reading-zone') {
      const book = readingQueue.find(b => b.id === active.id);
      if (book && book.status === 'want_to_read') {
        await handleStartReading(book);
        track('book_dragged_to_reading', { book_title: book.book_title });
      }
      return;
    }

    // Handle dropping from Currently Reading back to Want to Read
    if (over.id === 'want-to-read-zone') {
      const book = readingQueue.find(b => b.id === active.id);
      if (book && book.status === 'reading') {
        await handleMoveToQueue(book);
        track('book_dragged_to_want_to_read', { book_title: book.book_title });
      }
      return;
    }

    if (over.id === 'collection-zone') {
      const book = readingQueue.find(b => b.id === active.id);
      if (book) {
        // Show the finished modal for collection prompt
        handleFinished(book);
        track('book_dragged_to_collection', { book_title: book.book_title });
      }
      return;
    }

    if (over.id === 'not-for-me-zone') {
      const book = readingQueue.find(b => b.id === active.id);
      if (book) {
        await handleNotForMe(book);
        track('book_dragged_to_not_for_me', { book_title: book.book_title });
      }
      return;
    }

    // Otherwise, handle reordering within the list
    if (active.id !== over.id) {
      const oldIndex = filteredBooks.findIndex(item => item.id === active.id);
      const newIndex = filteredBooks.findIndex(item => item.id === over.id);
      
      if (oldIndex === -1 || newIndex === -1) return;
      
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
      {/* Finished Book Modal - asks about adding to collection */}
      {finishedBook && (
        <FinishedBookModal
          book={finishedBook}
          onAddToCollection={handleAddToCollection}
          onNoThanks={handleFinishedNoCollection}
          onClose={() => setFinishedBook(null)}
        />
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
          <h1 className="text-3xl font-serif text-[#4A5940] mb-2">Reading Queue</h1>
          <p className="text-[#7A8F6C]">
            {currentlyReadingBooks.length > 0 && `${currentlyReadingBooks.length} currently reading · `}
            {queueBooks.length} {queueBooks.length === 1 ? 'book' : 'books'} to read
          </p>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >

        {/* ===== WANT TO READ (Top) ===== */}
        <WantToReadDropZone isOver={overZone === 'want-to-read-zone' && activeBook?.status === 'reading'}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#5F7252]/10 flex items-center justify-center">
                <Book className="w-4 h-4 text-[#5F7252]" />
              </div>
              <h2 className="text-lg font-serif text-[#4A5940]">Want to Read</h2>
              {queueBooks.length > 0 && (
                <span className="text-sm text-[#96A888]">({queueBooks.length})</span>
              )}
            </div>
            {/* Filter search - only show if more than 5 books */}
            {queueBooks.length > 5 && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#96A888]" />
                <input
                  type="text"
                  placeholder="Filter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-32 pl-8 pr-3 py-1.5 rounded-lg border border-[#E8EBE4] text-sm focus:outline-none focus:ring-2 focus:ring-[#5F7252] focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* Action buttons - always visible */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowAddBook(!showAddBook)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                showAddBook 
                  ? 'bg-[#5F7252] text-white' 
                  : 'bg-[#F8F6EE] border border-[#E8EBE4] text-[#5F7252] hover:bg-[#E8EBE4]'
              }`}
            >
              <Search className="w-4 h-4" />
              I know what I want to read
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-[#F8F6EE] border border-[#E8EBE4] text-[#5F7252] hover:bg-[#E8EBE4] transition-colors flex items-center justify-center gap-2"
            >
              <Star className="w-4 h-4" />
              Help me find my next read
            </button>
          </div>

          {/* Search Panel - shown when "I know what I want to read" is clicked */}
          {showAddBook && (
            <div className="mb-4 p-4 rounded-xl bg-[#F8F6EE] border border-[#E8EBE4]">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#96A888]" />
                <input
                  type="text"
                  placeholder="Search for a book by title or author..."
                  value={addBookSearch}
                  onChange={(e) => setAddBookSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E8EBE4] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5F7252] focus:border-transparent"
                  autoFocus
                />
              </div>
              {addBookResults.length > 0 ? (
                <div className="space-y-2">
                  {addBookResults.map((book) => (
                    <div
                      key={book.title}
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#E8EBE4] hover:border-[#5F7252] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[#4A5940] text-sm truncate">{book.title}</p>
                        <p className="text-xs text-[#7A8F6C] truncate">{book.author}</p>
                      </div>
                      <button
                        onClick={() => handleAddBook(book)}
                        className="ml-3 px-3 py-1 rounded-lg text-xs font-medium text-white bg-[#5F7252] hover:bg-[#4A5940] transition-colors flex-shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              ) : addBookSearch.length >= 2 ? (
                <p className="text-sm text-[#96A888] text-center py-2">No books found in our catalog. Try a different search.</p>
              ) : (
                <p className="text-sm text-[#96A888] text-center py-2">Type at least 2 characters to search</p>
              )}
            </div>
          )}

          {filteredBooks.length === 0 && !showAddBook && (
            <div className="rounded-xl border-2 border-dashed border-[#96A888] bg-[#F8F6EE]/50 py-6 px-4 text-center">
              {searchQuery ? (
                <p className="text-[#7A8F6C] text-sm">No books found matching "{searchQuery}"</p>
              ) : (
                <div className="flex items-center justify-center gap-2 text-[#96A888]">
                  <Book className="w-5 h-5" />
                  <span className="text-sm">Your reading list is empty</span>
                </div>
              )}
            </div>
          )}
          
          {filteredBooks.length > 0 && (
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
                    onRemove={handleRemoveBook}
                    onStartReading={handleStartReading}
                    onNotForMe={handleNotForMe}
                    isFirst={index === 0}
                    onUpdateBook={updateQueueItem}
                    onToggleOwned={handleToggleOwned}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </WantToReadDropZone>

        {/* ===== CURRENTLY READING (Middle) ===== */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#5F7252]/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-[#5F7252]" />
            </div>
            <h2 className="text-lg font-serif text-[#4A5940]">Currently Reading</h2>
            {currentlyReadingBooks.length > 0 && (
              <span className="text-sm text-[#96A888]">({currentlyReadingBooks.length})</span>
            )}
          </div>
          <CurrentlyReadingSection 
            isOver={overZone === 'reading-zone'} 
            books={currentlyReadingBooks}
            onFinished={handleFinished}
            onNotForMe={handleNotForMe}
            onMoveToQueue={handleMoveToQueue}
          />
        </div>

        {/* Drop Zones - only show Collection/Not for me when dragging from Currently Reading */}
        {activeId && activeBook?.status === 'reading' && (
          <div className="mb-6 grid grid-cols-2 gap-4">
            <CollectionDropZone isOver={overZone === 'collection-zone'} />
            <NotForMeDropZone isOver={overZone === 'not-for-me-zone'} />
          </div>
        )}

        {/* Drag Overlay */}
        <DragOverlay>
          {activeBook ? <DragOverlayCard book={activeBook} /> : null}
        </DragOverlay>

        </DndContext>

        {/* ===== MY COLLECTION (Bottom) ===== */}
        <div className="pt-6 border-t border-[#E8EBE4]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#5F7252]/10 flex items-center justify-center">
                <Library className="w-4 h-4 text-[#5F7252]" />
              </div>
              <h2 className="text-lg font-serif text-[#4A5940]">My Collection</h2>
              {collectionBooks.length > 0 && (
                <span className="text-sm text-[#96A888]">({collectionBooks.length}+)</span>
              )}
            </div>
            {collectionBooks.length > 0 && (
              <button
                onClick={() => {
                  onNavigate('collection');
                  window.scrollTo(0, 0);
                }}
                className="text-sm text-[#5F7252] hover:text-[#4A5940] font-medium flex items-center gap-1"
              >
                View All
                <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
              </button>
            )}
          </div>
          
          {collectionBooks.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {collectionBooks.map((book) => (
                <CollectionBookThumbnail 
                  key={book.id} 
                  book={book} 
                  onClick={() => onNavigate('collection')} 
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-[#96A888]/50 bg-[#F8F6EE]/30 py-6 px-4 text-center">
              <Library className="w-6 h-6 text-[#96A888] mx-auto mb-2" />
              <p className="text-[#96A888] text-sm">
                Books you love will appear here after finishing
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
