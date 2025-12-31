import React from 'react';
import { Mail } from 'lucide-react';

export default function Footer({ onNavigate, currentPage }) {
  const handleNavigation = (page, path) => {
    onNavigate(page);
    window.scrollTo(0, 0);
    window.history.pushState({}, '', path);
  };

  return (
    <footer className="bg-[#F8F6EE] border-t border-[#E8EBE4] mt-auto">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
          {/* Navigation Links */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            <button
              onClick={() => handleNavigation('about', '/how-it-works')}
              className={`hover:text-[#4A5940] transition-colors ${currentPage === 'about' ? 'text-[#4A5940] font-medium' : 'text-[#7A8F6C]'}`}
            >
              How It Works
            </button>
            <button
              onClick={() => handleNavigation('meet-sarah', '/meet-sarah')}
              className={`hover:text-[#4A5940] transition-colors ${currentPage === 'meet-sarah' ? 'text-[#4A5940] font-medium' : 'text-[#7A8F6C]'}`}
            >
              Meet Sarah
            </button>
            <button
              onClick={() => handleNavigation('shop', '/shop')}
              className={`hover:text-[#4A5940] transition-colors ${currentPage === 'shop' ? 'text-[#4A5940] font-medium' : 'text-[#7A8F6C]'}`}
            >
              Shop
            </button>
            <a
              href="mailto:hello@sarahsbooks.com"
              className="text-[#7A8F6C] hover:text-[#4A5940] transition-colors flex items-center gap-1"
            >
              <Mail className="w-3.5 h-3.5" />
              Contact
            </a>
          </nav>

          {/* Copyright */}
          <p className="text-xs text-[#96A888]">
            © {new Date().getFullYear()} Sarah's Books
          </p>
        </div>
      </div>
    </footer>
  );
}
