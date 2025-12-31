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
        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3 mb-4">
          <button
            onClick={() => handleNavigation('about', '/how-it-works')}
            className={`text-sm font-medium hover:text-[#4A5940] transition-colors ${currentPage === 'about' ? 'text-[#4A5940]' : 'text-[#5F7252]'}`}
          >
            How It Works
          </button>
          <button
            onClick={() => handleNavigation('meet-sarah', '/meet-sarah')}
            className={`text-sm font-medium hover:text-[#4A5940] transition-colors ${currentPage === 'meet-sarah' ? 'text-[#4A5940]' : 'text-[#5F7252]'}`}
          >
            Meet Sarah
          </button>
          <button
            onClick={() => handleNavigation('shop', '/shop')}
            className={`text-sm font-medium hover:text-[#4A5940] transition-colors ${currentPage === 'shop' ? 'text-[#4A5940]' : 'text-[#5F7252]'}`}
          >
            Shop
          </button>
          <a
            href="mailto:hello@sarahsbooks.com"
            className="text-sm font-medium text-[#5F7252] hover:text-[#4A5940] transition-colors flex items-center gap-1.5"
          >
            <Mail className="w-4 h-4" />
            Contact
          </a>
        </nav>

        {/* Copyright */}
        <p className="text-xs text-[#96A888] text-center">
          © {new Date().getFullYear()} Sarah's Books
        </p>
      </div>
    </footer>
  );
}
