import React, { useState, useMemo } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import bookCatalog from '../books.json';

const THEME_INFO = {
  'womens-lives': { label: "Women's Interior Lives", emoji: '💗' },
  'emotional-truth': { label: 'Emotional Truth', emoji: '📖' },
  'identity': { label: 'Identity & Belonging', emoji: '🔍' },
  'spiritual': { label: 'Spiritual Seeker', emoji: '✨' },
  'justice': { label: 'Justice & Systems', emoji: '⚖️' },
  'favorites': { label: 'All-Time Favorites', emoji: '⭐' }
};

function CategorySection({ theme, books, onBookClick }) {
  const [expanded, setExpanded] = useState(false);
  const themeInfo = THEME_INFO[theme] || { label: theme, emoji: '📚' };
  const displayBooks = expanded ? books : books.slice(0, 3);

  return (
    <div className="bg-white rounded-xl p-5 border border-[#D4DAD0] shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-4"
      >
        <h3 className="font-serif text-lg text-[#4A5940] flex items-center gap-2">
          {themeInfo.emoji} {themeInfo.label} <span className="text-[#7A8F6C] font-light">({books.length})</span>
        </h3>
        {books.length > 3 && (
          expanded ? <ChevronUp className="w-5 h-5 text-[#7A8F6C]" /> : <ChevronDown className="w-5 h-5 text-[#7A8F6C]" />
        )}
      </button>
      
      <div className="space-y-2">
        {displayBooks.map((book, idx) => (
          <button
            key={idx}
            onClick={() => onBookClick(book)}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F8F6EE] transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="text-sm font-medium text-[#4A5940] group-hover:text-[#5F7252] transition-colors">
                  {book.title}
                </div>
                {book.author && (
                  <div className="text-xs text-[#7A8F6C] font-light mt-0.5">
                    {book.author}
                  </div>
                )}
              </div>
              {book.favorite && (
                <span className="text-amber-400 text-sm">⭐</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {books.length > 3 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full mt-3 text-xs text-[#5F7252] hover:text-[#4A5940] font-medium transition-colors"
        >
          View all {books.length} books →
        </button>
      )}
    </div>
  );
}

export default function CollectionPage({ onNavigate, onBookClick }) {
  const [sortBy, setSortBy] = useState('theme');

  const booksByTheme = useMemo(() => {
    const grouped = {};
    
    bookCatalog.forEach(book => {
      if (book.favorite) {
        if (!grouped['favorites']) grouped['favorites'] = [];
        grouped['favorites'].push(book);
      }
      
      if (book.themes && Array.isArray(book.themes)) {
        book.themes.forEach(theme => {
          if (!grouped[theme]) grouped[theme] = [];
          grouped[theme].push(book);
        });
      }
    });

    return grouped;
  }, []);

  const totalBooks = bookCatalog.length;
  const themeCount = Object.keys(booksByTheme).length;

  return (
    <div className="min-h-screen bg-[#FDFBF4]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back Button */}
        <button
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] transition-colors mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl text-[#4A5940] mb-2">My Collection</h1>
          <p className="text-[#7A8F6C] text-sm font-light">
            {totalBooks} books across {themeCount} themes
          </p>
        </div>

        {/* Categories */}
        <div className="space-y-4">
          {Object.entries(booksByTheme)
            .sort(([themeA], [themeB]) => {
              // Favorites first
              if (themeA === 'favorites') return -1;
              if (themeB === 'favorites') return 1;
              return 0;
            })
            .map(([theme, books]) => (
              <CategorySection
                key={theme}
                theme={theme}
                books={books}
                onBookClick={onBookClick}
              />
            ))}
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center text-xs text-[#7A8F6C] font-light">
          <p>This collection grows as I read. Last updated: December 2025</p>
        </div>
      </div>
    </div>
  );
}
