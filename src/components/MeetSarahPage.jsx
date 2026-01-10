import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Mail, BookText, BookHeart, Heart, Users, Sparkles, Scale, Star, Sun, X, BookOpen, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import bookCatalog from '../books-enriched.json';
import { supabase } from '../lib/supabase';
import { ExpandableDescription } from './ExpandableDescription';
import { useBookEnrichment } from './BookCard';
import { generateBookDescriptions } from '../lib/descriptionService';

// Rich modal for browsing Sarah's collection with enriched descriptions
function CuratorBookModal({ book, isOpen, onClose, userHasBook, onAddToQueue, isLoggedIn }) {
  const [isClosing, setIsClosing] = useState(false);
  const [enrichedDescription, setEnrichedDescription] = useState(null);
  const [isEnrichingDescription, setIsEnrichingDescription] = useState(false);

  // Fetch enriched cover and genres
  const { coverUrl, genres, isEnriching } = useBookEnrichment(
    book?.title,
    book?.author,
    book?.coverUrl
  );

  // Auto-enrich description when modal opens
  useEffect(() => {
    if (isOpen && book && !enrichedDescription && !isEnrichingDescription) {
      const bookDesc = book.description;
      if (bookDesc && bookDesc.length > 100) {
        // Already have a good description
        setEnrichedDescription(bookDesc);
      } else {
        // Fetch richer description from Claude
        setIsEnrichingDescription(true);
        generateBookDescriptions([{ title: book.title, author: book.author }])
          .then((result) => {
            const key = `${book.title.toLowerCase()}|${(book.author || '').toLowerCase()}`;
            if (result[key]) {
              setEnrichedDescription(result[key]);
            } else if (bookDesc) {
              setEnrichedDescription(bookDesc);
            }
          })
          .catch(() => {
            if (bookDesc) setEnrichedDescription(bookDesc);
          })
          .finally(() => setIsEnrichingDescription(false));
      }
    }
  }, [isOpen, book, enrichedDescription, isEnrichingDescription]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEnrichedDescription(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  if (!isOpen || !book) return null;

  const displayCover = coverUrl || book.coverUrl;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 ${
        isClosing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      
      <div 
        className={`relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden shadow-xl ${
          isClosing ? 'animate-slide-down' : 'animate-slide-up'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-[#E8EBE4] px-4 py-3 flex items-center justify-between z-10">
          <h2 className="font-serif text-lg text-[#4A5940]">From Sarah's Collection</h2>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-[#F8F6EE] transition-colors text-[#7A8F6C]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-60px)] p-4 sm:p-6">
          <div className="flex gap-4 mb-6">
            <div className="flex-shrink-0 w-24 h-36 rounded-lg bg-gradient-to-br from-[#96A888] to-[#7A8F6C] flex items-center justify-center overflow-hidden shadow-md">
              {displayCover ? (
                <img src={displayCover} alt="" className="w-full h-full object-cover" />
              ) : (
                <BookOpen className="w-8 h-8 text-white/70" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-serif text-xl text-[#4A5940] mb-1">{book.title}</h3>
              <p className="text-[#7A8F6C] mb-3">by {book.author}</p>
              <div className="flex flex-wrap gap-1">
                {book.genre && (
                  <span className="px-2 py-0.5 bg-[#F8F6EE] text-[#5F7252] text-xs rounded-full border border-[#E8EBE4]">
                    {book.genre}
                  </span>
                )}
                {genres && genres.slice(0, 2).map((g, i) => (
                  <span key={i} className="px-2 py-0.5 bg-[#F8F6EE] text-[#5F7252] text-xs rounded-full border border-[#E8EBE4]">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Description with loading state */}
          {isEnrichingDescription ? (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-[#4A5940] mb-2">About this book</h4>
              <div className="space-y-2 animate-pulse">
                <div className="h-3 w-full bg-[#E8EBE4] rounded" />
                <div className="h-3 w-full bg-[#E8EBE4] rounded" />
                <div className="h-3 w-3/4 bg-[#E8EBE4] rounded" />
              </div>
            </div>
          ) : enrichedDescription ? (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-[#4A5940] mb-2">About this book</h4>
              <ExpandableDescription text={enrichedDescription} />
            </div>
          ) : null}

          {book.reputation && (
            <div className="mb-6 p-4 bg-[#F8F6EE] rounded-xl">
              <h4 className="text-sm font-medium text-[#4A5940] mb-2 flex items-center gap-2">
                <Award className="w-4 h-4 text-[#5F7252]" />
                Reputation & Accolades
              </h4>
              <p className="text-sm text-[#5F7252] leading-relaxed">{book.reputation}</p>
            </div>
          )}

          {/* Sarah's Review - only for signed-in users */}
          {book.sarah_assessment && (
            <div className="mb-6 p-4 bg-[#5F7252]/5 rounded-xl border border-[#5F7252]/10">
              <h4 className="text-sm font-medium text-[#4A5940] mb-2 flex items-center gap-2">
                <Star className="w-4 h-4 text-[#5F7252] fill-[#5F7252]" />
                Sarah's Take
              </h4>
              {isLoggedIn ? (
                <p className="text-sm text-[#5F7252] leading-relaxed italic">{book.sarah_assessment}</p>
              ) : (
                <p className="text-sm text-[#96A888] leading-relaxed">
                  <button onClick={() => { handleClose(); }} className="text-[#5F7252] underline hover:text-[#4A5940]">Sign in</button> to see Sarah's personal take on this book.
                </p>
              )}
            </div>
          )}

          <div className="border-t border-[#E8EBE4] pt-4">
            {userHasBook ? (
              <div className="text-center py-3">
                <div className="flex items-center justify-center gap-2 text-[#5F7252]">
                  <Heart className="w-5 h-5 fill-[#C97B7B] text-[#C97B7B]" />
                  <span className="font-medium">We have this one in common!</span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { onAddToQueue(book); handleClose(); }}
                className="w-full py-3 px-4 bg-[#5F7252] text-white rounded-xl font-medium hover:bg-[#4A5940] transition-colors flex items-center justify-center gap-2"
              >
                <BookOpen className="w-5 h-5" />
                {isLoggedIn ? 'Add to My Queue' : 'Sign in to Add to Queue'}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slide-down { from { transform: translateY(0); } to { transform: translateY(100%); } }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
        .animate-fade-out { animation: fade-out 0.2s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
        .animate-slide-down { animation: slide-down 0.2s ease-out forwards; }
        @media (min-width: 640px) {
          .animate-slide-up { animation: fade-in 0.2s ease-out forwards; transform: translateY(0); }
          .animate-slide-down { animation: fade-out 0.2s ease-out forwards; }
        }
      `}</style>
    </div>
  );
}

// Horizontal scrollable book shelf component
function BookShelf({ books, onBookClick, userBookTitles, totalCount, isLoggedIn, onViewAll }) {
  const scrollRef = React.useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const hasMore = totalCount > books.length;

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) ref.addEventListener('scroll', checkScroll);
    return () => ref?.removeEventListener('scroll', checkScroll);
  }, [books]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
    }
  };

  if (!books || books.length === 0) return null;

  return (
    <div className="relative group">
      {canScrollLeft && (
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 rounded-full shadow-md flex items-center justify-center text-[#5F7252] hover:bg-white transition-all opacity-0 group-hover:opacity-100"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-2 px-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {books.map((book, i) => {
          const hasBook = userBookTitles.includes(book.title?.toLowerCase());
          return (
            <button
              key={`${book.title}-${i}`}
              onClick={() => onBookClick(book)}
              className="flex-shrink-0 group/book relative"
            >
              <div className="w-20 h-28 rounded-lg bg-gradient-to-br from-[#96A888] to-[#7A8F6C] flex items-center justify-center overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <BookOpen className="w-6 h-6 text-white/70" />
                )}
              </div>
              {hasBook && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#C97B7B] rounded-full flex items-center justify-center">
                  <Heart className="w-3 h-3 text-white fill-white" />
                </div>
              )}
              <p className="mt-1.5 text-xs text-[#5F7252] text-center truncate w-20 group-hover/book:text-[#4A5940]">
                {book.title?.length > 15 ? book.title.slice(0, 13) + '...' : book.title}
              </p>
              <div className="flex justify-center gap-0.5 mt-0.5">
                {[1,2,3,4,5].map(star => (
                  <Star key={star} className={`w-2.5 h-2.5 ${book.favorite ? 'text-[#5F7252] fill-[#5F7252]' : 'text-[#96A888] fill-[#96A888]'}`} />
                ))}
              </div>
            </button>
          );
        })}
        {hasMore && (
          <button
            onClick={onViewAll}
            className="flex-shrink-0 w-20 h-28 rounded-lg bg-[#5F7252]/10 border-2 border-dashed border-[#5F7252]/30 flex flex-col items-center justify-center hover:bg-[#5F7252]/20 hover:border-[#5F7252]/50 transition-all"
          >
            <span className="text-[#5F7252] text-xs font-medium">+{totalCount - books.length}</span>
            <span className="text-[#5F7252] text-[10px] mt-1">{isLoggedIn ? 'View All' : 'Sign in'}</span>
          </button>
        )}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 rounded-full shadow-md flex items-center justify-center text-[#5F7252] hover:bg-white transition-all opacity-0 group-hover:opacity-100"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

export default function MeetSarahPage({ onNavigate }) {
  const [selectedBook, setSelectedBook] = useState(null);
  const [userBookTitles, setUserBookTitles] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Get books by theme with counts
  const booksByTheme = useMemo(() => {
    const favoriteTitles = ['Tell Me How to Be', 'Where the Red Fern Grows', 'Loving Frank', 'Just Mercy', 'Heartland'];
    const favorites = favoriteTitles.map(title => bookCatalog.find(b => b.title === title)).filter(Boolean);

    const womenAll = bookCatalog.filter(b => b.themes?.includes('women'));
    const beachAll = bookCatalog.filter(b => b.themes?.includes('beach'));
    const emotionalAll = bookCatalog.filter(b => b.themes?.includes('emotional'));
    const identityAll = bookCatalog.filter(b => b.themes?.includes('identity'));
    const spiritualAll = bookCatalog.filter(b => b.themes?.includes('spiritual'));
    const justiceAll = bookCatalog.filter(b => b.themes?.includes('justice'));

    return {
      women: { books: womenAll.slice(0, 15), total: womenAll.length },
      beach: { books: beachAll, total: beachAll.length },
      emotional: { books: emotionalAll.slice(0, 15), total: emotionalAll.length },
      identity: { books: identityAll.slice(0, 15), total: identityAll.length },
      spiritual: { books: spiritualAll.slice(0, 15), total: spiritualAll.length },
      justice: { books: justiceAll.slice(0, 15), total: justiceAll.length },
      favorites: { books: favorites, total: favorites.length },
    };
  }, []);

  // Check user's queue/collection
  useEffect(() => {
    const checkUserBooks = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      if (!user) return;
      
      const [{ data: queue }, { data: collection }] = await Promise.all([
        supabase.from('reading_queue').select('book_title').eq('user_id', user.id),
        supabase.from('user_books').select('book_title').eq('user_id', user.id)
      ]);
      
      const titles = [
        ...(queue || []).map(b => b.book_title?.toLowerCase()),
        ...(collection || []).map(b => b.book_title?.toLowerCase()),
      ].filter(Boolean);
      setUserBookTitles(titles);
    };
    checkUserBooks();
  }, []);

  const handleAddToQueue = async (book) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      onNavigate('auth');
      return;
    }
    
    await supabase.from('reading_queue').insert({
      user_id: user.id,
      book_title: book.title,
      book_author: book.author,
      cover_image_url: book.coverUrl,
      status: 'want_to_read',
      source: 'sarah_collection',
    });
    
    setUserBookTitles(prev => [...prev, book.title?.toLowerCase()]);
  };

  const handleViewAll = () => {
    if (!isLoggedIn) {
      onNavigate('auth');
    }
    // For logged-in users, could navigate to full collection view in future
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back Button */}
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

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-serif text-3xl sm:text-4xl text-[#4A5940] mb-2">Meet Sarah</h1>
          <p className="text-sm text-[#7A8F6C] leading-relaxed">
            The reader behind the recommendations
          </p>
        </div>

        {/* Sarah's Bio Card */}
        <div className="bg-[#F8F6EE] rounded-2xl p-6 sm:p-8 border border-[#D4DAD0] shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <img
              src="/sarah.png"
              alt="Sarah"
              className="w-24 h-24 rounded-full object-cover border-4 border-[#E8EBE4] shadow-sm"
            />
            <div className="flex-1 text-center sm:text-left">
              <h2 className="font-serif text-2xl text-[#4A5940] mb-3">Hi, I'm Sarah!</h2>
              <div className="space-y-3 text-sm text-[#5F7252] leading-relaxed">
                <p>
                  I've always been the friend people call when they need a book recommendation. I get it—finding the right book at the right moment is a small kind of magic.
                </p>
                <p>
                  So I built this: a digital version of my bookshelves, searchable and powered by AI that knows my taste. My 200 curated books are the foundation, but now you can build your own library too—upload photos of your books, track what you want to read, and get personalized recommendations based on both our collections.
                </p>
                <p>
                  It's a living library that grows as we both read, with a discovery engine to help us find what's next. And when you're ready to buy, I hope you'll support a local bookstore—they're the heartbeat of our communities.
                </p>
                <p className="text-[#7A8F6C]">
                  Happy reading, friends!
                </p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    onNavigate('home');
                    window.scrollTo(0, 0);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5F7252] text-white text-sm font-medium hover:bg-[#4A5940] transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Get Your First Recommendation
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* What I Read - Link to Curator Themes */}
        <div id="curator-themes" className="bg-[#F8F6EE] rounded-2xl p-6 sm:p-8 border border-[#D4DAD0] shadow-sm mb-6">
          <h2 className="font-serif text-2xl text-[#4A5940] mb-4 flex items-center gap-2">
            <BookText className="w-5 h-5 text-[#5F7252]" />
            What I Read
          </h2>
          <p className="text-base text-[#5F7252] leading-relaxed mb-6">
            These are the themes that keep showing up in my collection—the questions I return to, the stories that stay with me.
          </p>
          
          <button
            onClick={() => {
              onNavigate('curator-themes');
              window.scrollTo(0, 0);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5F7252] text-white text-sm font-medium hover:bg-[#4A5940] transition-colors mb-8"
          >
            <BookText className="w-4 h-4" />
            Browse My Curator Themes
          </button>

          {/* All-Time Favorites */}
          <div>
            <h3 className="font-serif text-lg text-[#4A5940] mb-2 flex items-center gap-2">
              <Star className="w-5 h-5 text-[#5F7252]" />
              All-Time Favorites
            </h3>
            <p className="text-sm text-[#5F7252] leading-relaxed mb-3">
              These five books reveal what I care about most: the weight of family secrets and cultural identity, the fierce loyalty that shapes a childhood, forbidden love that defies convention, the moral courage to fight injustice, and the invisible class lines that define American life. Together, they're a map of my heart—stories about belonging, sacrifice, and the quiet heroism of ordinary people.
            </p>
            <BookShelf books={booksByTheme.favorites.books} onBookClick={setSelectedBook} userBookTitles={userBookTitles} totalCount={booksByTheme.favorites.total} isLoggedIn={isLoggedIn} onViewAll={handleViewAll} />
          </div>
        </div>

        {/* Contact */}
        <div className="bg-[#F8F6EE] rounded-2xl p-6 sm:p-8 border border-[#D4DAD0] shadow-sm">
          <h2 className="font-serif text-xl text-[#4A5940] mb-4">Get in Touch</h2>
          <p className="text-sm text-[#5F7252] mb-4 leading-relaxed">
            Have a question or book recommendation? I'd love to hear from you.
          </p>
          <a
            href="mailto:hello@sarahsbooks.com"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5F7252] text-white text-sm font-medium hover:bg-[#4A5940] transition-colors"
          >
            <Mail className="w-4 h-4" />
            hello@sarahsbooks.com
          </a>
        </div>
      </div>

      {/* Book Detail Modal */}
      <CuratorBookModal
        book={selectedBook}
        isOpen={!!selectedBook}
        onClose={() => setSelectedBook(null)}
        userHasBook={selectedBook ? userBookTitles.includes(selectedBook.title?.toLowerCase()) : false}
        onAddToQueue={handleAddToQueue}
        isLoggedIn={isLoggedIn}
      />
    </div>
  );
}
