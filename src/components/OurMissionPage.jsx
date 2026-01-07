import React from 'react';
import { ArrowLeft, Store, BookOpen, Sparkles } from 'lucide-react';

export default function OurMissionPage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFBF4] via-[#FBF9F0] to-[#F5EFDC]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => {
            onNavigate('home');
            window.scrollTo(0, 0);
          }}
          className="mb-6 flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="font-serif text-3xl text-[#4A5940] mb-2">Our Mission</h1>
          <p className="text-[#7A8F6C] leading-relaxed">
            We exist to encourage a love of reading and to support the local ecosystems that make it possible.
          </p>
        </div>

        {/* Supporting Local Bookstores & Libraries */}
        <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0] mb-6">
          <h2 className="font-serif text-xl text-[#4A5940] mb-4">Supporting Local Bookstores & Libraries</h2>
          <div className="space-y-4 text-sm text-[#5F7252] leading-relaxed">
            <p>
              Independent bookstores and local libraries are the heartbeat of our literary culture. Every recommendation on Sarah's Books includes direct links to:
            </p>
            <ul className="space-y-2 ml-4">
              <li>• <strong>Bookshop.org</strong> — Purchase books and support independent bookstores with every sale</li>
              <li>• <strong>Libby</strong> — Check if your local library has the book available</li>
              <li>• <strong>Libro.fm</strong> — Choose an independent alternative to Audible for audiobooks</li>
            </ul>
          </div>
        </div>

        {/* Thoughtful Design & Community */}
        <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0] mb-6">
          <h2 className="font-serif text-xl text-[#4A5940] mb-4">Thoughtful Design & Community</h2>
          <div className="space-y-3 text-sm text-[#5F7252] leading-relaxed">
            <p>
              Sarah's Books is not a social media app. We are thoughtfully designed and moderated to ensure we promote neighborly behavior and genuine book discovery.
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
