import React from 'react';
import { ArrowLeft, MessageCircle, Library, Upload, Share2, Sparkles, User } from 'lucide-react';

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

        {/* Header - What we are and what's in it for you */}
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl text-[#4A5940] mb-4">How It Works</h1>
          <p className="text-base text-[#5F7252] leading-relaxed max-w-xl mx-auto">
            Sarah is a curator who knows what makes a great story. Get personalized recommendations from her collection—or let her guide you to the perfect book from the world's library.
          </p>
        </div>

        {/* Progressive Journey - Visual Flow */}
        <div className="space-y-4 mb-8">
          
          {/* Step 1: ASK */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#5F7252] text-white flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-xl text-[#4A5940] mb-1">Ask</h3>
                <p className="text-sm text-[#7A8F6C]">
                  Tell me what you're looking for. I'll search my curated library first—and if there's a better match out there, I'll find it from the world's library too.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2: BUILD */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#5F7252] text-white flex items-center justify-center flex-shrink-0">
                <Library className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-xl text-[#4A5940] mb-1">Build</h3>
                <p className="text-sm text-[#7A8F6C]">
                  Tell me what you've read. I'll meet you where you are—recommending from your taste while helping you discover what's next.
                </p>
              </div>
            </div>
            <div className="mt-4 ml-[4.5rem]">
              <button
                onClick={() => {
                  onNavigate('my-books');
                  window.scrollTo(0, 0);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5F7252]/10 text-[#5F7252] text-sm font-medium hover:bg-[#5F7252]/20 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Add books you've read
              </button>
            </div>
          </div>

          {/* Step 3: SHARE */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#5F7252] text-white flex items-center justify-center flex-shrink-0">
                <Share2 className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-xl text-[#4A5940] mb-1">Share</h3>
                <p className="text-sm text-[#7A8F6C]">
                  Be the friend with great book recommendations. Send your picks to people who trust your taste.
                </p>
              </div>
            </div>
          </div>

          {/* Step 4: CURATE */}
          <div className="bg-[#5F7252]/10 rounded-xl p-6 border border-[#5F7252]/20">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#5F7252] text-white flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-serif text-xl text-[#4A5940]">Curate</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#5F7252]/20 text-[#5F7252]">Coming Soon</span>
                </div>
                <p className="text-sm text-[#7A8F6C]">
                  Become a curator yourself. Create your own themes, build your library, and help others find their next great read.
                </p>
              </div>
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
              <MessageCircle className="w-4 h-4" />
              Ask Sarah
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
