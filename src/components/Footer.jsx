import React from 'react';
import { Mail } from 'lucide-react';

export default function Footer({ onNavigate, currentPage }) {
  const handleNavigation = (page, path) => {
    onNavigate(page);
    window.scrollTo(0, 0);
    window.history.pushState({}, '', path);
  };

  return (
    <footer className="bg-[#F8F6EE] border-t border-[#D4DAD0] mt-auto">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Navigation Links - More prominent */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-4">
          <button
            onClick={() => handleNavigation('our-mission', '/our-mission')}
            className={`text-sm font-medium hover:text-[#4A5940] transition-colors ${currentPage === 'our-mission' ? 'text-[#4A5940]' : 'text-[#5F7252]'}`}
          >
            Our Mission
          </button>
          <button
            onClick={() => handleNavigation('our-practices', '/our-practices')}
            className={`text-sm font-medium hover:text-[#4A5940] transition-colors ${currentPage === 'our-practices' ? 'text-[#4A5940]' : 'text-[#5F7252]'}`}
          >
            Our Practices
          </button>
          <button
            onClick={() => handleNavigation('shop', '/shop')}
            className={`text-sm font-medium hover:text-[#4A5940] transition-colors ${currentPage === 'shop' ? 'text-[#4A5940]' : 'text-[#5F7252]'}`}
          >
            Shop
          </button>
          <button
            onClick={() => handleNavigation('privacy-policy', '/privacy-policy')}
            className={`text-sm font-medium hover:text-[#4A5940] transition-colors ${currentPage === 'privacy-policy' ? 'text-[#4A5940]' : 'text-[#5F7252]'}`}
          >
            Privacy Notice
          </button>
          <button
            onClick={() => handleNavigation('terms-of-use', '/terms-of-use')}
            className={`text-sm font-medium hover:text-[#4A5940] transition-colors ${currentPage === 'terms-of-use' ? 'text-[#4A5940]' : 'text-[#5F7252]'}`}
          >
            Terms of Use
          </button>
          <a
            href="mailto:hello@sarahsbooks.com"
            className="text-sm font-medium text-[#5F7252] hover:text-[#4A5940] transition-colors flex items-center gap-1.5"
          >
            <Mail className="w-4 h-4" />
            Contact
          </a>
        </nav>

        {/* Tagline */}
        <p className="text-xs text-[#7A8F6C] text-center mb-3 font-light">
          A Curated Collection of Infinite Possibilities
        </p>

        {/* Copyright */}
        <p className="text-xs text-[#96A888] text-center">
          © {new Date().getFullYear()} Sarah's Books
        </p>
      </div>
    </footer>
  );
}
