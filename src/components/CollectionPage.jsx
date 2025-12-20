import React, { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import bookCatalog from '../books.json';

export default function CollectionPage({ onNavigate, onBookClick }) {
  const sortedBooks = useMemo(() => {
    return [...bookCatalog].sort((a, b) => {
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();
      return titleA.localeCompare(titleB);
    });
  }, []);

  const totalBooks = bookCatalog.length;

  return (
    <div className="min-h-screen bg-[#FDFBF4]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
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
            {totalBooks} books, alphabetically sorted
          </p>
        </div>

        {/* Alphabetized Book List */}
        <div className="bg-white rounded-xl border border-[#D4DAD0] shadow-sm divide-y divide-[#E8EBE4]">
          {sortedBooks.map((book, idx) => (
            <button
              key={idx}
              onClick={() => onBookClick(book)}
              className="w-full text-left px-5 py-4 hover:bg-[#F8F6EE] transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#4A5940] group-hover:text-[#5F7252] transition-colors">
                    {book.title}
                  </div>
                  {book.author && (
                    <div className="text-xs text-[#7A8F6C] font-light mt-1">
                      {book.author}
                    </div>
                  )}
                </div>
                {book.favorite && (
                  <span className="text-amber-400 text-sm flex-shrink-0">⭐</span>
                )}
              </div>
            </button>
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
