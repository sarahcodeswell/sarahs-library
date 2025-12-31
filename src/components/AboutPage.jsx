import React from 'react';
import { ArrowLeft, Library, Upload, BookMarked, Share2, Sparkles, Star, Check, ShoppingBag, User, X, GripVertical } from 'lucide-react';

export default function AboutPage({ onNavigate }) {

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
          <h1 className="font-serif text-3xl sm:text-4xl text-[#4A5940] mb-2">How It Works</h1>
          <p className="text-sm text-[#7A8F6C] leading-relaxed">
            3 simple steps to discover your next great read
          </p>
        </div>

        {/* 3 Simple Steps - Now directly after header */}
        <div className="space-y-4 mb-6">
          {/* Step 1: Get Recommendations */}
          <div className="bg-[#F8F6EE] rounded-xl p-5 border border-[#D4DAD0]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#5F7252] text-white flex items-center justify-center text-sm font-medium">1</div>
              <Sparkles className="w-5 h-5 text-[#5F7252]" />
              <h3 className="font-medium text-[#4A5940] text-base">Get Recommendations</h3>
            </div>
            <p className="text-sm text-[#7A8F6C] leading-relaxed mb-4">
              Ask Sarah for personalized book recommendations. For each book, you have 3 choices:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <Library className="w-4 h-4 text-[#5F7252] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#5F7252] font-medium">Already Read</span>
                  <span className="text-[#96A888]"> → Goes to My Collection</span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <BookMarked className="w-4 h-4 text-[#5F7252] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#5F7252] font-medium">Want to Read</span>
                  <span className="text-[#96A888]"> → Goes to My Reading Queue</span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <X className="w-4 h-4 text-[#96A888] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#5F7252] font-medium">Not for Me</span>
                  <span className="text-[#96A888]"> → Improves future recommendations</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Step 2: My Reading Queue */}
          <div className="bg-[#F8F6EE] rounded-xl p-5 border border-[#D4DAD0]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#5F7252] text-white flex items-center justify-center text-sm font-medium">2</div>
              <BookMarked className="w-5 h-5 text-[#5F7252]" />
              <h3 className="font-medium text-[#4A5940] text-base">My Reading Queue</h3>
            </div>
            <p className="text-sm text-[#7A8F6C] leading-relaxed mb-4">
              Books you want to read. Here you can:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <GripVertical className="w-4 h-4 text-[#5F7252] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#5F7252] font-medium">Prioritize</span>
                  <span className="text-[#96A888]"> — Drag to reorder your list</span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <ShoppingBag className="w-4 h-4 text-[#5F7252] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#5F7252] font-medium">Purchase</span>
                  <span className="text-[#96A888]"> — Local bookstore, Libro.fm, library, or Amazon</span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-[#5F7252] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#5F7252] font-medium">Finish</span>
                  <span className="text-[#96A888]"> — Mark as read when done</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Step 3: My Collection */}
          <div className="bg-[#F8F6EE] rounded-xl p-5 border border-[#D4DAD0]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#5F7252] text-white flex items-center justify-center text-sm font-medium">3</div>
              <Library className="w-5 h-5 text-[#5F7252]" />
              <h3 className="font-medium text-[#4A5940] text-base">My Collection</h3>
            </div>
            <p className="text-sm text-[#7A8F6C] leading-relaxed mb-4">
              Books you've finished reading. Here you can:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <Star className="w-4 h-4 text-[#5F7252] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#5F7252] font-medium">Rate</span>
                  <span className="text-[#96A888]"> — Your ratings improve future recommendations</span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Share2 className="w-4 h-4 text-[#5F7252] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#5F7252] font-medium">Share</span>
                  <span className="text-[#96A888]"> — Recommend favorites to friends</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pro Tip: Add Your Books */}
        <div className="bg-[#5F7252]/10 rounded-2xl p-6 sm:p-8 border border-[#5F7252]/20 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#5F7252] text-white flex items-center justify-center flex-shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium text-[#4A5940] text-base">Pro Tip: Add Your Books First</h3>
              </div>
              <p className="text-sm text-[#5F7252] leading-relaxed mb-4">
                Upload photos of books you've already read so Sarah never recommends something you've finished—and to personalize your recommendations based on your taste.
              </p>
              <button
                onClick={() => {
                  onNavigate('my-books');
                  window.scrollTo(0, 0);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5F7252] text-white text-sm font-medium hover:bg-[#4A5940] transition-colors"
              >
                <Upload className="w-4 h-4" />
                Add Your Books
              </button>
            </div>
          </div>
        </div>

        {/* Ready to Start CTA */}
        <div className="bg-[#F8F6EE] rounded-2xl p-6 sm:p-8 border border-[#D4DAD0] shadow-sm text-center">
          <h2 className="font-serif text-2xl text-[#4A5940] mb-3">Ready to find your next great read?</h2>
          <p className="text-sm text-[#7A8F6C] mb-6">
            Whether from my curated collection or discoveries from the world's library.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                onNavigate('home');
                window.scrollTo(0, 0);
              }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#5F7252] text-white text-sm font-medium hover:bg-[#4A5940] transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Get Your First Recommendation
            </button>
            <button
              onClick={() => {
                onNavigate('meet-sarah');
                window.scrollTo(0, 0);
              }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-[#5F7252] text-[#5F7252] text-sm font-medium hover:bg-[#F8F6EE] transition-colors"
            >
              <User className="w-4 h-4" />
              Meet Sarah
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
