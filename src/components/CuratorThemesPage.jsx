import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, BookText, BookHeart, Heart, Users, Sparkles, Scale, Star, MessageCircle, Sun, X, BookOpen, Award, ChevronLeft, ChevronRight } from 'lucide-react';
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

  const { coverUrl, genres } = useBookEnrichment(book?.title, book?.author, book?.coverUrl);

  useEffect(() => {
    if (isOpen && book && !enrichedDescription && !isEnrichingDescription) {
      const bookDesc = book.description;
      if (bookDesc && bookDesc.length > 100) {
        setEnrichedDescription(bookDesc);
      } else {
        setIsEnrichingDescription(true);
        generateBookDescriptions([{ title: book.title, author: book.author }])
          .then((result) => {
            const key = `${book.title.toLowerCase()}|${(book.author || '').toLowerCase()}`;
            if (result[key]) setEnrichedDescription(result[key]);
            else if (bookDesc) setEnrichedDescription(bookDesc);
          })
          .catch(() => { if (bookDesc) setEnrichedDescription(bookDesc); })
          .finally(() => setIsEnrichingDescription(false));
      }
    }
  }, [isOpen, book, enrichedDescription, isEnrichingDescription]);

  useEffect(() => { if (!isOpen) setEnrichedDescription(null); }, [isOpen]);

  const handleClose = () => { setIsClosing(true); setTimeout(() => { setIsClosing(false); onClose(); }, 200); };
  if (!isOpen || !book) return null;
  const displayCover = coverUrl || book.coverUrl;

  return (
    <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={handleClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className={`relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden shadow-xl ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-[#E8EBE4] px-4 py-3 flex items-center justify-between z-10">
          <h2 className="font-serif text-lg text-[#4A5940]">From Sarah's Collection</h2>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-[#F8F6EE] transition-colors text-[#7A8F6C]"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto max-h-[calc(90vh-60px)] p-4 sm:p-6">
          <div className="flex gap-4 mb-6">
            <div className="flex-shrink-0 w-24 h-36 rounded-lg bg-gradient-to-br from-[#96A888] to-[#7A8F6C] flex items-center justify-center overflow-hidden shadow-md">
              {displayCover ? <img src={displayCover} alt="" className="w-full h-full object-cover" /> : <BookOpen className="w-8 h-8 text-white/70" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-serif text-xl text-[#4A5940] mb-1">{book.title}</h3>
              <p className="text-[#7A8F6C] mb-3">by {book.author}</p>
              <div className="flex flex-wrap gap-1">
                {book.genre && <span className="px-2 py-0.5 bg-[#F8F6EE] text-[#5F7252] text-xs rounded-full border border-[#E8EBE4]">{book.genre}</span>}
                {genres && genres.slice(0, 2).map((g, i) => <span key={i} className="px-2 py-0.5 bg-[#F8F6EE] text-[#5F7252] text-xs rounded-full border border-[#E8EBE4]">{g}</span>)}
              </div>
            </div>
          </div>
          {isEnrichingDescription ? (
            <div className="mb-6"><h4 className="text-sm font-medium text-[#4A5940] mb-2">About this book</h4><div className="space-y-2 animate-pulse"><div className="h-3 w-full bg-[#E8EBE4] rounded" /><div className="h-3 w-full bg-[#E8EBE4] rounded" /><div className="h-3 w-3/4 bg-[#E8EBE4] rounded" /></div></div>
          ) : enrichedDescription ? (
            <div className="mb-6"><h4 className="text-sm font-medium text-[#4A5940] mb-2">About this book</h4><ExpandableDescription text={enrichedDescription} /></div>
          ) : null}
          {book.reputation && <div className="mb-6 p-4 bg-[#F8F6EE] rounded-xl"><h4 className="text-sm font-medium text-[#4A5940] mb-2 flex items-center gap-2"><Award className="w-4 h-4 text-[#5F7252]" />Reputation & Accolades</h4><p className="text-sm text-[#5F7252] leading-relaxed">{book.reputation}</p></div>}
          {book.sarah_assessment && (
            <div className="mb-6 p-4 bg-[#5F7252]/5 rounded-xl border border-[#5F7252]/10">
              <h4 className="text-sm font-medium text-[#4A5940] mb-2 flex items-center gap-2"><Star className="w-4 h-4 text-[#5F7252] fill-[#5F7252]" />Sarah's Take</h4>
              {isLoggedIn ? (
                <p className="text-sm text-[#5F7252] leading-relaxed italic">{book.sarah_assessment}</p>
              ) : (
                <p className="text-sm text-[#96A888] leading-relaxed"><button onClick={handleClose} className="text-[#5F7252] underline hover:text-[#4A5940]">Sign in</button> to see Sarah's personal take on this book.</p>
              )}
            </div>
          )}
          <div className="border-t border-[#E8EBE4] pt-4">
            {userHasBook ? (
              <div className="text-center py-3"><div className="flex items-center justify-center gap-2 text-[#5F7252]"><Heart className="w-5 h-5 fill-[#C97B7B] text-[#C97B7B]" /><span className="font-medium">We have this one in common!</span></div></div>
            ) : (
              <button onClick={() => { onAddToQueue(book); handleClose(); }} className="w-full py-3 px-4 bg-[#5F7252] text-white rounded-xl font-medium hover:bg-[#4A5940] transition-colors flex items-center justify-center gap-2">
                <BookOpen className="w-5 h-5" />{isLoggedIn ? 'Add to My Queue' : 'Sign in to Add to Queue'}
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
        @media (min-width: 640px) { .animate-slide-up { animation: fade-in 0.2s ease-out forwards; transform: translateY(0); } .animate-slide-down { animation: fade-out 0.2s ease-out forwards; } }
      `}</style>
    </div>
  );
}

function BookShelf({ books, onBookClick, userBookTitles, totalCount, isLoggedIn, onViewAll }) {
  const scrollRef = React.useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const hasMore = totalCount > books.length;
  const checkScroll = () => { if (scrollRef.current) { const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current; setCanScrollLeft(scrollLeft > 0); setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10); } };
  useEffect(() => { checkScroll(); const ref = scrollRef.current; if (ref) ref.addEventListener('scroll', checkScroll); return () => ref?.removeEventListener('scroll', checkScroll); }, [books]);
  const scroll = (dir) => { if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' }); };
  if (!books || books.length === 0) return null;

  return (
    <div className="relative group">
      {canScrollLeft && <button onClick={() => scroll(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 rounded-full shadow-md flex items-center justify-center text-[#5F7252] hover:bg-white transition-all opacity-0 group-hover:opacity-100"><ChevronLeft className="w-5 h-5" /></button>}
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-2 px-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {books.map((book, i) => {
          const hasBook = userBookTitles.includes(book.title?.toLowerCase());
          return (
            <button key={`${book.title}-${i}`} onClick={() => onBookClick(book)} className="flex-shrink-0 group/book relative">
              <div className="w-20 h-28 rounded-lg bg-gradient-to-br from-[#96A888] to-[#7A8F6C] flex items-center justify-center overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                {book.coverUrl ? <img src={book.coverUrl} alt="" className="w-full h-full object-cover" /> : <BookOpen className="w-6 h-6 text-white/70" />}
              </div>
              {hasBook && <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#C97B7B] rounded-full flex items-center justify-center"><Heart className="w-3 h-3 text-white fill-white" /></div>}
              <p className="mt-1.5 text-xs text-[#5F7252] text-center truncate w-20 group-hover/book:text-[#4A5940]">{book.title?.length > 15 ? book.title.slice(0, 13) + '...' : book.title}</p>
              <div className="flex justify-center gap-0.5 mt-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={`w-2.5 h-2.5 ${book.favorite ? 'text-[#5F7252] fill-[#5F7252]' : 'text-[#96A888] fill-[#96A888]'}`} />)}</div>
            </button>
          );
        })}
        {hasMore && (
          <button onClick={onViewAll} className="flex-shrink-0 w-20 h-28 rounded-lg bg-[#5F7252]/10 border-2 border-dashed border-[#5F7252]/30 flex flex-col items-center justify-center hover:bg-[#5F7252]/20 hover:border-[#5F7252]/50 transition-all">
            <span className="text-[#5F7252] text-xs font-medium">+{totalCount - books.length}</span>
            <span className="text-[#5F7252] text-[10px] mt-1">{isLoggedIn ? 'View All' : 'Sign in'}</span>
          </button>
        )}
      </div>
      {canScrollRight && <button onClick={() => scroll(1)} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 rounded-full shadow-md flex items-center justify-center text-[#5F7252] hover:bg-white transition-all opacity-0 group-hover:opacity-100"><ChevronRight className="w-5 h-5" /></button>}
    </div>
  );
}

export default function CuratorThemesPage({ onNavigate, onShowAuthModal }) {
  const [selectedBook, setSelectedBook] = useState(null);
  const [userBookTitles, setUserBookTitles] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const booksByTheme = useMemo(() => {
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
    };
  }, []);

  useEffect(() => {
    const checkUserBooks = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      if (!user) return;
      const [{ data: queue }, { data: collection }] = await Promise.all([
        supabase.from('reading_queue').select('book_title').eq('user_id', user.id),
        supabase.from('user_books').select('book_title').eq('user_id', user.id)
      ]);
      setUserBookTitles([...(queue || []).map(b => b.book_title?.toLowerCase()), ...(collection || []).map(b => b.book_title?.toLowerCase())].filter(Boolean));
    };
    checkUserBooks();
  }, []);

  const handleAddToQueue = async (book) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { onShowAuthModal?.(); return; }
    await supabase.from('reading_queue').insert({ user_id: user.id, book_title: book.title, book_author: book.author, cover_image_url: book.coverUrl, status: 'want_to_read', source: 'sarah_collection' });
    setUserBookTitles(prev => [...prev, book.title?.toLowerCase()]);
  };

  const handleViewAll = () => {
    if (!isLoggedIn) onShowAuthModal?.();
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back Button */}
        <button
          onClick={() => {
            onNavigate('meet-sarah');
            window.scrollTo(0, 0);
          }}
          className="inline-flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] transition-colors mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Meet Sarah
        </button>

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl text-[#4A5940] mb-4">What I Read</h1>
          <p className="text-base text-[#5F7252] leading-relaxed max-w-xl mx-auto">
            These are the themes that keep showing up in my collection—the questions I return to, the stories that stay with me.
          </p>
        </div>

        {/* Curator Themes */}
        <div className="space-y-6 mb-8">
          {/* Women's Untold Stories */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <h3 className="font-serif text-lg text-[#4A5940] mb-3 flex items-center gap-2">
              <BookHeart className="w-5 h-5 text-[#5F7252]" />
              Women's Untold Stories
            </h3>
            <p className="text-sm text-[#5F7252] leading-relaxed mb-4">
              I'm drawn to stories that illuminate the experiences we rarely hear about—the women who've been footnotes in history books, the ones who survived impossible circumstances, and those whose inner lives were infinitely more complex than the world allowed them to show.
            </p>
            <BookShelf books={booksByTheme.women.books} onBookClick={setSelectedBook} userBookTitles={userBookTitles} totalCount={booksByTheme.women.total} isLoggedIn={isLoggedIn} onViewAll={handleViewAll} />
          </div>

          {/* Beach Reads */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <h3 className="font-serif text-lg text-[#4A5940] mb-3 flex items-center gap-2">
              <Sun className="w-5 h-5 text-[#5F7252]" />
              Beach Reads
            </h3>
            <p className="text-sm text-[#5F7252] leading-relaxed mb-4">
              These are my go-to books when I want to feel like I'm wrapped in a warm hug. Tales of second chances, unexpected friendships, and characters who are beautifully flawed but utterly lovable.
            </p>
            <BookShelf books={booksByTheme.beach.books} onBookClick={setSelectedBook} userBookTitles={userBookTitles} totalCount={booksByTheme.beach.total} isLoggedIn={isLoggedIn} onViewAll={handleViewAll} />
          </div>

          {/* Emotional Truth */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <h3 className="font-serif text-lg text-[#4A5940] mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-[#5F7252]" />
              Emotional Truth
            </h3>
            <p className="text-sm text-[#5F7252] leading-relaxed mb-4">
              These are the books that have reached into my chest and rearranged something fundamental—stories that don't just entertain but transform how I see the world and my place in it.
            </p>
            <BookShelf books={booksByTheme.emotional.books} onBookClick={setSelectedBook} userBookTitles={userBookTitles} totalCount={booksByTheme.emotional.total} isLoggedIn={isLoggedIn} onViewAll={handleViewAll} />
          </div>

          {/* Identity & Belonging */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <h3 className="font-serif text-lg text-[#4A5940] mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#5F7252]" />
              Identity & Belonging
            </h3>
            <p className="text-sm text-[#5F7252] leading-relaxed mb-4">
              These are the books that have made me feel less alone in the world. Stories about people figuring out who they are when everything familiar falls away.
            </p>
            <BookShelf books={booksByTheme.identity.books} onBookClick={setSelectedBook} userBookTitles={userBookTitles} totalCount={booksByTheme.identity.total} isLoggedIn={isLoggedIn} onViewAll={handleViewAll} />
          </div>

          {/* Spiritual Seeking */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <h3 className="font-serif text-lg text-[#4A5940] mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#5F7252]" />
              Spiritual Seeking
            </h3>
            <p className="text-sm text-[#5F7252] leading-relaxed mb-4">
              Stories and teachings that explore life's biggest questions without pretending to have all the answers. Each book here has taught me something profound about finding meaning.
            </p>
            <BookShelf books={booksByTheme.spiritual.books} onBookClick={setSelectedBook} userBookTitles={userBookTitles} totalCount={booksByTheme.spiritual.total} isLoggedIn={isLoggedIn} onViewAll={handleViewAll} />
          </div>

          {/* Invisible Injustices */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <h3 className="font-serif text-lg text-[#4A5940] mb-3 flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#5F7252]" />
              Invisible Injustices
            </h3>
            <p className="text-sm text-[#5F7252] leading-relaxed mb-4">
              Stories that pull back the curtain on injustices hiding in plain sight. They're not always easy reads, but they're essential ones that change how you see the world.
            </p>
            <BookShelf books={booksByTheme.justice.books} onBookClick={setSelectedBook} userBookTitles={userBookTitles} totalCount={booksByTheme.justice.total} isLoggedIn={isLoggedIn} onViewAll={handleViewAll} />
          </div>

        </div>

        {/* CTA */}
        <div className="bg-[#F8F6EE] rounded-2xl p-6 sm:p-8 border border-[#D4DAD0] shadow-sm text-center">
          <h2 className="font-serif text-xl text-[#4A5940] mb-3">Sound like your kind of reading?</h2>
          <p className="text-sm text-[#7A8F6C] mb-6">
            Let me help you find your next great read.
          </p>
          <button
            onClick={() => {
              onNavigate('home');
              window.scrollTo(0, 0);
            }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#5F7252] text-white text-sm font-medium hover:bg-[#4A5940] transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Ask Sarah for a Recommendation
          </button>
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
