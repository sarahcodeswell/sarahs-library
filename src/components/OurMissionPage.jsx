import React from 'react';
import { ArrowLeft, Heart, Store, BookOpen, Sparkles } from 'lucide-react';

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
            To encourage a love of reading and support the local ecosystems that make it possible.
          </p>
        </div>

        {/* Reading with Purpose */}
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
                  That's why Sarah's Books is designed to help you find the perfect book <em>and</em> support the places you love.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Shop Local */}
        <div className="bg-transparent rounded-xl p-6 sm:p-8 mb-6">
          <h2 className="font-serif text-xl text-[#4A5940] mb-6 text-left">Shop Local</h2>
          
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

        {/* Intentional Design & Community */}
        <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0] mb-6">
          <h2 className="font-serif text-xl text-[#4A5940] mb-4">Intentional Design & Community</h2>
          <div className="space-y-3 text-sm text-[#5F7252] leading-relaxed">
            <p>
              Sarah's Books is not a social media app. We are intentionally designed and moderated to ensure we promote neighborly behavior and genuine book discovery.
            </p>
            <p>
              Our platform prioritizes meaningful connections over engagement metrics, and we maintain clear guidelines to foster a respectful, book-loving community.
            </p>
          </div>
        </div>

        {/* Learn More */}
        <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
          <h2 className="font-serif text-xl text-[#4A5940] mb-4">Our Practices</h2>
          <p className="text-sm text-[#5F7252] leading-relaxed mb-4">
            Learn more about how we handle data, use responsible AI, and maintain our community standards.
          </p>
          <button
            onClick={() => {
              onNavigate('our-practices');
              window.scrollTo(0, 0);
            }}
            className="px-4 py-2 rounded-lg bg-[#5F7252] text-white text-sm font-medium hover:bg-[#4A5940] transition-colors"
          >
            View Our Practices
          </button>
        </div>
      </div>
    </div>
  );
}
