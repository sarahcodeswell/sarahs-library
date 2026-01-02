import React, { useState, useEffect } from 'react';
import { Heart, BookOpen, ShoppingBag, BookMarked, Library, Headphones, Sparkles, Users, RefreshCw, Star, ExternalLink, Check } from 'lucide-react';
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
        console.error('[SharedRecommendationPage] No share token provided');
        setError('Invalid share link');
        setIsLoading(false);
        return;
      }

      console.log('[SharedRecommendationPage] Loading recommendation for token:', shareToken);
      const { data, error: fetchError } = await db.getSharedRecommendation(shareToken);
      
      console.log('[SharedRecommendationPage] Result:', { data, error: fetchError });
      
      if (fetchError) {
        console.error('[SharedRecommendationPage] Fetch error:', fetchError);
        setError(fetchError.message || 'This recommendation could not be found');
        setIsLoading(false);
        return;
      }
      
      if (!data) {
        console.error('[SharedRecommendationPage] No data returned');
        setError('This recommendation could not be found');
        setIsLoading(false);
        return;
      }
      
      if (!data.user_recommendations) {
        console.error('[SharedRecommendationPage] No user_recommendations in data:', data);
        setError('The recommendation data is incomplete');
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

  const getGoodreadsUrl = (title, author) => {
    const query = encodeURIComponent(`${title} ${author}`);
    return `https://www.goodreads.com/search?q=${query}`;
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

  // Handle accept recommendation (for logged-out users)
  const handleAcceptRecommendation = () => {
    // Store the book data in sessionStorage so we can add it after sign up
    const bookData = recommendation.user_recommendations;
    sessionStorage.setItem('pendingRecommendation', JSON.stringify({
      book_title: bookData.book_title,
      book_author: bookData.book_author,
      book_isbn: bookData.book_isbn,
      book_description: bookData.book_description
    }));
    onShowAuthModal();
  };

  // Check if book is already in queue
  const isInQueue = recommendation && readingQueue.some(
    item => item.book_title?.toLowerCase() === recommendation.user_recommendations?.book_title?.toLowerCase()
  );

  // Get recommender first name only
  const recommenderName = React.useMemo(() => {
    const fullName = recommendation?.recommender_name || 'A friend';
    // Extract first name only
    return fullName.split(' ')[0];
  }, [recommendation?.recommender_name]);

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

  // Logged-out view - improved user journey
  if (!user) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
          
          {/* Personal Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F5E8E8] rounded-full mb-4">
              <Heart className="w-4 h-4 text-[#C97B7B] fill-[#C97B7B]" />
              <span className="text-sm text-[#5F7252] font-medium">Book Recommendation</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-[#4A5940] mb-2">
              {recommenderName} thinks you'll love this book
            </h1>
          </div>

          {/* Book Card */}
          <div className="bg-[#F8F6EE] rounded-2xl border border-[#D4DAD0] p-6 sm:p-8 mb-6">
            
            {/* Title & Author */}
            <div className="text-center mb-6">
              <h2 className="font-serif text-xl sm:text-2xl text-[#4A5940] mb-1">
                {bookData.book_title}
              </h2>
              {bookData.book_author && (
                <p className="text-[#7A8F6C]">by {bookData.book_author}</p>
              )}
            </div>

            {/* Why they recommend it - most important */}
            {bookData.recommendation_note && (
              <div className="bg-white rounded-xl p-5 mb-6 border border-[#E8EBE4]">
                <p className="text-sm text-[#96A888] mb-2 font-medium">
                  Why {recommenderName} thinks you'll love it:
                </p>
                <p className="text-[#4A5940] leading-relaxed text-lg italic">
                  "{bookData.recommendation_note}"
                </p>
              </div>
            )}

            {/* Book Description */}
            {bookData.book_description && (
              <div className="mb-6">
                <p className="text-sm text-[#96A888] mb-2 font-medium">About this book:</p>
                <p className="text-sm text-[#5F7252] leading-relaxed">
                  {bookData.book_description}
                </p>
              </div>
            )}

            {/* Goodreads Link */}
            <div className="flex items-center justify-center gap-4 mb-6 py-3 border-t border-b border-[#E8EBE4]">
              <a
                href={getGoodreadsUrl(bookData.book_title, bookData.book_author)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[#5F7252] hover:text-[#4A5940] transition-colors"
              >
                <Star className="w-4 h-4" />
                Read reviews on Goodreads
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Single Clear CTA */}
            <button
              onClick={handleAcceptRecommendation}
              className="w-full px-6 py-4 bg-[#5F7252] text-white rounded-xl hover:bg-[#4A5940] transition-colors font-medium text-lg flex items-center justify-center gap-3"
            >
              <BookMarked className="w-5 h-5" />
              Accept This Recommendation
            </button>
            <p className="text-xs text-center text-[#96A888] mt-3">
              Create a free account to add this to your reading queue
            </p>
          </div>

          {/* Value Prop - Why Join */}
          <div className="bg-white/50 rounded-2xl border border-[#D4DAD0] p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Heart className="w-5 h-5 text-[#E11D48]" />
                <span className="font-serif text-lg text-[#4A5940]">Sarah's Books</span>
              </div>
              <p className="text-sm text-[#5F7252] leading-relaxed">
                To encourage a love of reading and support the local ecosystems that make it possible.
              </p>
            </div>
            
            <div className="space-y-3 max-w-sm mx-auto">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#5F7252]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-[#5F7252]" />
                </div>
                <p className="text-sm text-[#5F7252]">
                  <strong>Personalized recommendations</strong> from a curated collection
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#5F7252]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <BookMarked className="w-3 h-3 text-[#5F7252]" />
                </div>
                <p className="text-sm text-[#5F7252]">
                  <strong>Track your reading</strong> with a personal queue
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#5F7252]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Users className="w-3 h-3 text-[#5F7252]" />
                </div>
                <p className="text-sm text-[#5F7252]">
                  <strong>Share favorites</strong> with friends who love to read
                </p>
              </div>
            </div>

            <p className="text-xs text-center text-[#96A888] mt-6">
              Already use Goodreads? No problem — Sarah's Books works alongside it.
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
        
        {/* Personal Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F5E8E8] rounded-full mb-4">
            <Heart className="w-4 h-4 text-[#C97B7B] fill-[#C97B7B]" />
            <span className="text-sm text-[#5F7252] font-medium">Book Recommendation</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#4A5940] mb-2">
            {recommenderName} thinks you'll love this book
          </h1>
        </div>

        {/* Book Card */}
        <div className="bg-[#F8F6EE] rounded-2xl border border-[#D4DAD0] p-6 sm:p-8 mb-6">
          
          {/* Title & Author */}
          <div className="text-center mb-6">
            <h2 className="font-serif text-xl sm:text-2xl text-[#4A5940] mb-1">
              {bookData.book_title}
            </h2>
            {bookData.book_author && (
              <p className="text-[#7A8F6C]">by {bookData.book_author}</p>
            )}
          </div>

          {/* Why they recommend it - most important */}
          {bookData.recommendation_note && (
            <div className="bg-white rounded-xl p-5 mb-6 border border-[#E8EBE4]">
              <p className="text-sm text-[#96A888] mb-2 font-medium">
                Why {recommenderName} thinks you'll love it:
              </p>
              <p className="text-[#4A5940] leading-relaxed text-lg italic">
                "{bookData.recommendation_note}"
              </p>
            </div>
          )}

          {/* Book Description */}
          {bookData.book_description && (
            <div className="mb-6">
              <p className="text-sm text-[#96A888] mb-2 font-medium">About this book:</p>
              <p className="text-sm text-[#5F7252] leading-relaxed">
                {bookData.book_description}
              </p>
            </div>
          )}

          {/* Goodreads Link */}
          <div className="flex items-center justify-center gap-4 mb-6 py-3 border-t border-b border-[#E8EBE4]">
            <a
              href={getGoodreadsUrl(bookData.book_title, bookData.book_author)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[#5F7252] hover:text-[#4A5940] transition-colors"
            >
              <Star className="w-4 h-4" />
              Read reviews on Goodreads
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            
            {/* Add to Reading Queue */}
            {!isInQueue && !addedToQueue ? (
              <button
                onClick={handleAddToQueue}
                className="w-full px-6 py-4 bg-[#5F7252] text-white rounded-xl hover:bg-[#4A5940] transition-colors font-medium text-lg flex items-center justify-center gap-3"
              >
                <BookMarked className="w-5 h-5" />
                Add to My Reading Queue
              </button>
            ) : (
              <div className="w-full px-6 py-4 bg-[#5F7252]/10 text-[#5F7252] rounded-xl flex items-center justify-center gap-3 font-medium text-lg">
                <Check className="w-5 h-5" />
                {addedToQueue ? 'Added to Your Queue!' : 'Already in Your Queue'}
              </div>
            )}

            {/* Purchase Options */}
            <div className="pt-2">
              <p className="text-xs text-[#96A888] text-center mb-3">Get this book:</p>
              <div className="grid grid-cols-4 gap-2">
                <a
                  href={getBookshopUrl(bookData.book_title, bookData.book_author)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-2.5 bg-white border border-[#D4DAD0] text-[#5F7252] rounded-lg hover:bg-[#F8F6EE] transition-colors flex flex-col items-center justify-center gap-1 text-xs"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Bookstore
                </a>
                <a
                  href={getAudiobookUrl(bookData.book_title, bookData.book_author)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-2.5 bg-white border border-[#D4DAD0] text-[#5F7252] rounded-lg hover:bg-[#F8F6EE] transition-colors flex flex-col items-center justify-center gap-1 text-xs"
                >
                  <Headphones className="w-4 h-4" />
                  Audio
                </a>
                <a
                  href={getLibraryUrl(bookData.book_title, bookData.book_author)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-2.5 bg-white border border-[#D4DAD0] text-[#5F7252] rounded-lg hover:bg-[#F8F6EE] transition-colors flex flex-col items-center justify-center gap-1 text-xs"
                >
                  <Library className="w-4 h-4" />
                  Library
                </a>
                <a
                  href={getAmazonUrl(bookData.book_title, bookData.book_author)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-2.5 bg-white border border-[#D4DAD0] text-[#5F7252]/60 rounded-lg hover:bg-[#F8F6EE] transition-colors flex flex-col items-center justify-center gap-1 text-xs"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Amazon
                </a>
              </div>
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
