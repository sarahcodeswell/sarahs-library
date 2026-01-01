import React from 'react';
import { ArrowLeft, Shield, Bot, Heart, BookOpen, Lock, Trash2 } from 'lucide-react';

export default function OurPracticesPage({ onNavigate }) {
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
        <div className="mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl text-[#4A5940] mb-2">Our Practices</h1>
          <p className="text-sm text-[#7A8F6C] leading-relaxed">
            How we handle your data, use AI responsibly, and support the reading community
          </p>
        </div>

        {/* Your Data, Your Control */}
        <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0] mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#5F7252] text-white flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-serif text-xl text-[#4A5940] mb-3">Your Data, Your Control</h2>
              <div className="space-y-3 text-sm text-[#5F7252] leading-relaxed">
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#7A8F6C]" />
                  <p><strong>We never sell your data.</strong> Your reading preferences, book lists, and personal information are never shared with third parties for advertising or any other purpose.</p>
                </div>
                <div className="flex items-start gap-2">
                  <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#7A8F6C]" />
                  <p><strong>Used only for recommendations.</strong> We use your reading history and preferences solely to provide you with better, more personalized book recommendations.</p>
                </div>
                <div className="flex items-start gap-2">
                  <Trash2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#7A8F6C]" />
                  <p><strong>You own your data.</strong> You can export or delete your data at any time from your profile settings.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Responsible AI */}
        <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0] mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#5F7252] text-white flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-serif text-xl text-[#4A5940] mb-3">Responsible AI</h2>
              <div className="space-y-3 text-sm text-[#5F7252] leading-relaxed">
                <p>
                  Sarah's Books uses <strong>Claude by Anthropic</strong> to power our book recommendations. Claude is designed to be <a href="https://www.anthropic.com/news/claudes-character" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#4A5940]">helpful, harmless, and honest</a>.
                </p>
                <p>
                  When you ask for recommendations, Claude analyzes your request against Sarah's curated collection of 200+ books and the broader world of literature to find your perfect match.
                </p>
                <p>
                  We're transparent about AI use: every recommendation clearly shows whether it comes from Sarah's personal library or is a discovery from the world's library.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Our Mission */}
        <div className="bg-[#5F7252]/10 rounded-xl p-6 border border-[#5F7252]/20 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#5F7252] text-white flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-serif text-xl text-[#4A5940] mb-3">Our Mission</h2>
              <div className="space-y-3 text-sm text-[#5F7252] leading-relaxed">
                <p className="text-base font-medium text-[#4A5940]">
                  To encourage a love of reading and support the local ecosystems that make it possible.
                </p>
                <p>
                  We believe in the power of books to transform lives, expand perspectives, and connect us to each other. That's why we're committed to:
                </p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-[#5F7252]">•</span>
                    <span><strong>Supporting local bookstores</strong> — Our purchase links prioritize independent bookshops through Bookshop.org</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#5F7252]">•</span>
                    <span><strong>Promoting audiobooks</strong> — We partner with Libro.fm to support local bookstores even when you listen</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#5F7252]">•</span>
                    <span><strong>Championing public libraries</strong> — Every book includes a link to check availability at your local library</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="text-center text-sm text-[#7A8F6C]">
          <p>Questions about our practices? <a href="mailto:hello@sarahsbooks.com" className="text-[#5F7252] underline hover:text-[#4A5940]">Get in touch</a></p>
        </div>
      </div>
    </div>
  );
}
