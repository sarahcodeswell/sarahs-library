import React from 'react';
import { ArrowLeft, Heart, Store, MapPin, BookOpen, Users, Sparkles } from 'lucide-react';

export default function OurMissionPage({ onNavigate }) {
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
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl text-[#4A5940] mb-3">Our Mission</h1>
          <p className="text-base text-[#7A8F6C] leading-relaxed max-w-2xl mx-auto">
            Every book you read and share is a chance to support your local bookstore or library
          </p>
        </div>

        {/* Mission Statement */}
        <div className="bg-[#F8F6EE] rounded-xl p-6 sm:p-8 border border-[#D4DAD0] mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#5F7252] text-white flex items-center justify-center flex-shrink-0">
              <Heart className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="font-serif text-xl text-[#4A5940] mb-3">Reading with Purpose</h2>
              <div className="space-y-3 text-sm text-[#5F7252] leading-relaxed">
                <p>
                  We believe that discovering your next great read shouldn't come at the expense of the places that make reading communities thrive. Independent bookstores and local libraries are the heartbeat of our literary culture—they host author events, employ passionate booksellers, and create spaces where readers gather.
                </p>
                <p>
                  That's why Sarah's Books is designed to help you find the perfect book <em>and</em> support the places you love. Every recommendation includes direct links to purchase from independent bookstores through Bookshop.org, which supports local stores with every sale.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-[#D4DAD0] mb-6">
          <h2 className="font-serif text-xl text-[#4A5940] mb-6 text-center">How Your Choices Make a Difference</h2>
          
          <div className="space-y-6">
            {/* Bookshop.org */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#E8EBE4] flex items-center justify-center flex-shrink-0">
                <Store className="w-5 h-5 text-[#5F7252]" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-[#4A5940] mb-2">Support Independent Bookstores</h3>
                <p className="text-sm text-[#5F7252] leading-relaxed">
                  When you purchase through our Bookshop.org links, a portion of every sale goes directly to independent bookstores. You can even choose a specific store to support—or let Bookshop.org distribute funds to stores across the country.
                </p>
              </div>
            </div>

            {/* Local Library */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#E8EBE4] flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-[#5F7252]" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-[#4A5940] mb-2">Check Your Local Library</h3>
                <p className="text-sm text-[#5F7252] leading-relaxed">
                  Every recommendation includes a Libby link to check if your library has the book available. Libraries are free, accessible, and vital to our communities—using them strengthens the case for continued funding and support.
                </p>
              </div>
            </div>

            {/* Audiobooks */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#E8EBE4] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-[#5F7252]" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-[#4A5940] mb-2">Choose Libro.fm for Audiobooks</h3>
                <p className="text-sm text-[#5F7252] leading-relaxed">
                  Prefer audiobooks? Libro.fm is an independent alternative to Audible that shares profits with local bookstores. Every audiobook you buy supports the store of your choice.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Personalize Your Support */}
        <div className="bg-[#5F7252]/10 rounded-xl p-6 sm:p-8 border border-[#5F7252]/20 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#5F7252] text-white flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-serif text-xl text-[#4A5940] mb-3">Add Your Favorite Bookstore</h2>
              <p className="text-sm text-[#5F7252] leading-relaxed mb-4">
                Have a local bookstore you love? Add it to your profile, and we'll prioritize showing you ways to support them. Your bookstore information helps us connect you with the places that matter most to you.
              </p>
              <button
                onClick={() => {
                  onNavigate('profile');
                  window.scrollTo(0, 0);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5F7252] text-white text-sm font-medium hover:bg-[#4A5940] transition-colors"
              >
                <Users className="w-4 h-4" />
                Update Your Profile
              </button>
            </div>
          </div>
        </div>

        {/* Community Impact */}
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-[#D4DAD0]">
          <h2 className="font-serif text-xl text-[#4A5940] mb-4 text-center">The Bigger Picture</h2>
          <div className="space-y-3 text-sm text-[#5F7252] leading-relaxed">
            <p>
              Independent bookstores and libraries aren't just retail spaces—they're community anchors. They host book clubs, author readings, and writing workshops. They employ people who genuinely love books and can guide you to your next favorite read. They create third spaces where people gather, connect, and share ideas.
            </p>
            <p>
              When you choose to support these places, you're investing in your community's cultural life. You're ensuring that future generations have access to curated book selections, knowledgeable staff, and spaces designed for discovery and connection.
            </p>
            <p className="text-[#4A5940] font-medium">
              Every book matters. Every choice matters. Thank you for reading with intention.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
