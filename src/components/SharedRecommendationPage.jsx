import React, { useState, useEffect } from 'react';
import { Heart, BookOpen, ShoppingBag, BookMarked, Library, Headphones, Sparkles, Users, Lock, RefreshCw } from 'lucide-react';
import { db } from '../lib/supabase';
import { useReadingQueue } from '../contexts/ReadingQueueContext';
import { useUser } from '../contexts/UserContext';

const BOOKSHOP_AFFILIATE_ID = '119544';
const AMAZON_AFFILIATE_TAG = 'sarahsbooks01-20';

export default function SharedRecommendationPage({ shareToken, onNavigate, onShowAuthModal }) {
  const [recommendation, setRecommendation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addedToQueue, setAddedToQueue] = useState(false);
  const { user } = useUser();
  const { addToQueue, readingQueue } = useReadingQueue();

  useEffect(() => {
    const loadRecommendation = async () => {
      if (!shareToken) {
        setError('Invalid share link');
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await db.getSharedRecommendation(shareToken);
      
      if (fetchError || !data) {
        setError('This recommendation could not be found');
        setIsLoading(false);
        return;
      }

      setRecommendation(data);
      setIsLoading(false);
    };

    loadRecommendation();
  }, [shareToken]);

  const getBookshopUrl = (title, author) => {
    const query = encodeURIComponent(`${title} ${author}`);
    return `https://bookshop.org/search?keywords=${query}&affiliate=${BOOKSHOP_AFFILIATE_ID}`;
  };

  const getAmazonUrl = (title, author) => {
    const query = encodeURIComponent(`${title} ${author}`);
    return `https://www.amazon.com/s?k=${query}&tag=${AMAZON_AFFILIATE_TAG}`;
  };

  const getLibraryUrl = (title, author) => {
    const query = encodeURIComponent(`${title} ${author}`);
    return `https://www.worldcat.org/search?q=${query}`;
  };

  const getAudiobookUrl = (title, author) => {
    const query = encodeURIComponent(`${title} ${author} audiobook`);
    return `https://libro.fm/search?q=${query}`;
  };

  const handleAddToQueue = async () => {
    if (!user) {
      onShowAuthModal();
      return;
    }

    const bookData = recommendation.user_recommendations;
    const result = await addToQueue({
      book_title: bookData.book_title,
      book_author: bookData.book_author,
      book_isbn: bookData.book_isbn,
      status: 'want_to_read'
    });

    if (result.success) {
      setAddedToQueue(true);
    }
  };

  // Check if book is already in queue
  const isInQueue = recommendation && readingQueue.some(
    item => item.book_title?.toLowerCase() === recommendation.user_recommendations?.book_title?.toLowerCase()
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
        <p className="text-[#7A8F6C]">Loading recommendation...</p>
      </div>
    );
  }

  if (error || !recommendation?.user_recommendations) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#E11D48]/10 flex items-center justify-center">
            <Heart className="w-6 h-6 text-[#E11D48]" />
          </div>
          <h2 className="font-serif text-xl text-[#4A5940] mb-2">Something went wrong</h2>
          <p className="text-sm text-[#7A8F6C] mb-6">
            {error || "We couldn't load this recommendation. It may have been removed or the link is invalid."}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setIsLoading(true);
                setError(null);
                setRecommendation(null);
                // Re-trigger the useEffect by forcing a re-render
                window.location.reload();
              }}
              className="w-full px-4 py-2.5 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={() => {
                window.history.pushState({}, '', '/');
                onNavigate('home');
              }}
              className="w-full px-4 py-2.5 bg-white border border-[#D4DAD0] text-[#5F7252] rounded-lg hover:bg-[#F8F6EE] transition-colors flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Go to Home
            </button>
          </div>
          <p className="text-xs text-[#96A888] mt-4">
            If this problem persists, please refresh the page or contact support.
          </p>
        </div>
      </div>
    );
  }

  const bookData = recommendation.user_recommendations;

  // Logged-out view - show book info but gate actions
  if (!user) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
          
          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-sm text-[#7A8F6C] mb-2">A friend recommended this book for you</p>
            <div className="flex items-center justify-center gap-2">
              <Heart className="w-5 h-5 text-[#E11D48]" />
              <span className="font-serif text-lg text-[#4A5940]">Sarah's Books</span>
            </div>
          </div>

          {/* Book Card */}
          <div className="bg-[#F8F6EE] rounded-2xl border border-[#D4DAD0] p-6 sm:p-8 mb-6">
            
            {/* Title & Author */}
            <div className="text-center mb-4">
              <h1 className="font-serif text-2xl sm:text-3xl text-[#4A5940] mb-2">
                {bookData.book_title}
              </h1>
              {bookData.book_author && (
                <p className="text-[#7A8F6C]">by {bookData.book_author}</p>
              )}
            </div>

            {/* Recommendation Note */}
            {bookData.recommendation_note && (
              <div className="bg-white/50 rounded-xl p-4 mb-6 border border-[#E8EBE4]">
                <p className="text-sm text-[#96A888] mb-2">Why they recommend it:</p>
                <p className="text-[#5F7252] leading-relaxed italic">
                  "{bookData.recommendation_note}"
                </p>
              </div>
            )}

            {/* Greyed-out Actions - clickable to sign up */}
            <div className="space-y-3">
              <button
                onClick={onShowAuthModal}
                className="w-full px-4 py-3 bg-[#5F7252]/30 text-[#5F7252]/60 rounded-lg flex items-center justify-center gap-2 font-medium cursor-pointer hover:bg-[#5F7252]/40 transition-colors"
              >
                <Lock className="w-4 h-4" />
                <BookMarked className="w-5 h-5" />
                Add to Reading Queue
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onShowAuthModal}
                  className="px-3 py-2.5 bg-white/50 border border-[#D4DAD0] text-[#5F7252]/50 rounded-lg flex items-center justify-center gap-2 text-sm cursor-pointer hover:bg-white/70 transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Local Bookstore
                </button>
                <button
                  onClick={onShowAuthModal}
                  className="px-3 py-2.5 bg-white/50 border border-[#D4DAD0] text-[#5F7252]/50 rounded-lg flex items-center justify-center gap-2 text-sm cursor-pointer hover:bg-white/70 transition-colors"
                >
                  <Headphones className="w-4 h-4" />
                  Audiobook
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onShowAuthModal}
                  className="px-3 py-2.5 bg-white/50 border border-[#D4DAD0] text-[#5F7252]/50 rounded-lg flex items-center justify-center gap-2 text-sm cursor-pointer hover:bg-white/70 transition-colors"
                >
                  <Library className="w-4 h-4" />
                  Library
                </button>
                <button
                  onClick={onShowAuthModal}
                  className="px-3 py-2.5 bg-white/50 border border-[#D4DAD0] text-[#5F7252]/50 rounded-lg flex items-center justify-center gap-2 text-sm cursor-pointer hover:bg-white/70 transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Amazon
                </button>
              </div>
              <p className="text-xs text-center text-[#96A888] mt-2">
                <Lock className="w-3 h-3 inline mr-1" />
                Create a free account to unlock
              </p>
            </div>
          </div>

          {/* Mission-focused Sign Up CTA */}
          <div className="bg-[#5F7252]/10 rounded-2xl border border-[#5F7252]/20 p-6 sm:p-8 text-center">
            <h2 className="font-serif text-xl text-[#4A5940] mb-3">
              Join the community
            </h2>
            <p className="text-sm text-[#5F7252] leading-relaxed mb-4">
              To encourage a love of reading and support the local ecosystems that make it possible.
            </p>
            
            <div className="space-y-3 text-left max-w-sm mx-auto mb-6">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#5F7252] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#5F7252]">
                  <strong>Personalized recommendations</strong> from Sarah's curated collection and beyond
                </p>
              </div>
              <div className="flex items-start gap-3">
                <BookMarked className="w-5 h-5 text-[#5F7252] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#5F7252]">
                  <strong>Track your reading</strong> with a personal queue and collection
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-[#5F7252] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#5F7252]">
                  <strong>Share favorites</strong> with friends who love to read
                </p>
              </div>
              <div className="flex items-start gap-3">
                <RefreshCw className="w-5 h-5 text-[#5F7252] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#5F7252]">
                  <strong>Goodreads compatible</strong> — import your reads or export to Goodreads
                </p>
              </div>
            </div>

            <button
              onClick={onShowAuthModal}
              className="w-full sm:w-auto px-8 py-3 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors font-medium"
            >
              Create Free Account
            </button>
            <p className="text-xs text-[#96A888] mt-3">
              Free forever. No credit card required.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Logged-in view - full functionality
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-sm text-[#7A8F6C] mb-2">A friend recommended this book for you</p>
          <div className="flex items-center justify-center gap-2">
            <Heart className="w-5 h-5 text-[#E11D48]" />
            <span className="font-serif text-lg text-[#4A5940]">Sarah's Books</span>
          </div>
        </div>

        {/* Book Card */}
        <div className="bg-[#F8F6EE] rounded-2xl border border-[#D4DAD0] p-6 sm:p-8 mb-6">
          
          {/* Title & Author */}
          <div className="text-center mb-6">
            <h1 className="font-serif text-2xl sm:text-3xl text-[#4A5940] mb-2">
              {bookData.book_title}
            </h1>
            {bookData.book_author && (
              <p className="text-[#7A8F6C]">by {bookData.book_author}</p>
            )}
          </div>

          {/* Recommendation Note */}
          {bookData.recommendation_note && (
            <div className="bg-white/50 rounded-xl p-4 mb-6 border border-[#E8EBE4]">
              <p className="text-sm text-[#96A888] mb-2">Why they recommend it:</p>
              <p className="text-[#5F7252] leading-relaxed italic">
                "{bookData.recommendation_note}"
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            
            {/* Add to Reading Queue */}
            {!isInQueue && !addedToQueue ? (
              <button
                onClick={handleAddToQueue}
                className="w-full px-4 py-3 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <BookMarked className="w-5 h-5" />
                Add to My Reading Queue
              </button>
            ) : (
              <div className="w-full px-4 py-3 bg-[#5F7252]/10 text-[#5F7252] rounded-lg flex items-center justify-center gap-2 font-medium">
                <BookMarked className="w-5 h-5" />
                {addedToQueue ? 'Added to Your Queue!' : 'Already in Your Queue'}
              </div>
            )}

            {/* Purchase Options - Local Bookstore, Audiobook, Library, Amazon */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={getBookshopUrl(bookData.book_title, bookData.book_author)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2.5 bg-white border border-[#D4DAD0] text-[#5F7252] rounded-lg hover:bg-[#F8F6EE] transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                Local Bookstore
              </a>
              <a
                href={getAudiobookUrl(bookData.book_title, bookData.book_author)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2.5 bg-white border border-[#D4DAD0] text-[#5F7252] rounded-lg hover:bg-[#F8F6EE] transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Headphones className="w-4 h-4" />
                Audiobook
              </a>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={getLibraryUrl(bookData.book_title, bookData.book_author)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2.5 bg-white border border-[#D4DAD0] text-[#5F7252] rounded-lg hover:bg-[#F8F6EE] transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Library className="w-4 h-4" />
                Library
              </a>
              <a
                href={getAmazonUrl(bookData.book_title, bookData.book_author)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2.5 bg-white border border-[#D4DAD0] text-[#5F7252] rounded-lg hover:bg-[#F8F6EE] transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                Amazon
              </a>
            </div>
          </div>
        </div>

        {/* CTA to explore more */}
        <div className="text-center">
          <p className="text-sm text-[#7A8F6C] mb-3">
            Want more personalized recommendations?
          </p>
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors text-sm font-medium"
          >
            <BookOpen className="w-4 h-4" />
            Get Recommendations
          </button>
        </div>
      </div>
    </div>
  );
}
