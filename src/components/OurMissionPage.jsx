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

        {/* Reading with Purpose */}
        <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0] mb-6">
          <h2 className="font-serif text-xl text-[#4A5940] mb-4">Reading with Purpose</h2>
          <div className="space-y-3 text-sm text-[#5F7252] leading-relaxed">
            <p>
              We believe that discovering your next great read shouldn't come at the expense of the places that make reading communities thrive. Independent bookstores and local libraries are the heartbeat of our literary culture—they host author events, employ passionate booksellers, and create spaces where readers gather.
            </p>
            <p>
              That's why Sarah's Books is designed to help you find the perfect book <em>and</em> support the places you love.
            </p>
          </div>
        </div>

        {/* Your Choices Matter */}
        <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0] mb-6">
          <h2 className="font-serif text-xl text-[#4A5940] mb-4">Your Choices Matter</h2>
          <div className="space-y-3 text-sm text-[#5F7252] leading-relaxed">
            <p>
              Every recommendation on Sarah's Books includes direct links to support local bookstores and libraries:
            </p>
            <ul className="space-y-2 ml-4">
              <li>• <strong>Bookshop.org</strong> — Purchase books and support independent bookstores with every sale</li>
              <li>• <strong>Libby</strong> — Check if your local library has the book available</li>
              <li>• <strong>Libro.fm</strong> — Choose an independent alternative to Audible for audiobooks</li>
            </ul>
            <p>
              When you choose to support these places, you're investing in your community's cultural life and ensuring that future generations have access to curated book selections, knowledgeable staff, and spaces designed for discovery and connection.
            </p>
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
