import React, { useState, useMemo, useRef } from 'react';
import { ArrowLeft, Search, ShoppingCart, Star, Bookmark, ChevronDown } from 'lucide-react';
import bookCatalog from '../books.json';

const BOOKSHOP_AFFILIATE_ID = '119544';
const AMAZON_AFFILIATE_TAG = 'sarahsbooks01-20';

function getBookshopSearchUrl(title, author) {
  const query = author ? `${title} ${author}` : title;
  return `https://bookshop.org/search?keywords=${encodeURIComponent(query)}&aff_id=${BOOKSHOP_AFFILIATE_ID}`;
}

function getAmazonKindleUrl(title, author) {
  const query = author ? `${title} ${author}` : title;
  return `https://www.amazon.com/s?k=${encodeURIComponent(query + ' kindle')}&tag=${AMAZON_AFFILIATE_TAG}`;
}

function getGoodreadsSearchUrl(title, author) {
  const query = author ? `${title} ${author}` : title;
  return `https://www.goodreads.com/search?q=${encodeURIComponent(query)}`;
}

export default function CollectionPage({ onNavigate, onBookClick, user, readingQueue, onAddToQueue, onShowAuthModal }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBook, setExpandedBook] = useState(null);
  const [showBuyOptions, setShowBuyOptions] = useState(null);
  const letterRefs = useRef({});

  const sortedBooks = useMemo(() => {
    return [...bookCatalog].sort((a, b) => {
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();
      return titleA.localeCompare(titleB);
    });
  }, []);

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return sortedBooks;
    const query = searchQuery.toLowerCase();
    return sortedBooks.filter(book => 
      book.title?.toLowerCase().includes(query) || 
      book.author?.toLowerCase().includes(query)
    );
  }, [sortedBooks, searchQuery]);

  const booksByLetter = useMemo(() => {
    const grouped = {};
    filteredBooks.forEach(book => {
      const firstLetter = (book.title?.[0] || '#').toUpperCase();
      const letter = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(book);
    });
    return grouped;
  }, [filteredBooks]);

  const availableLetters = Object.keys(booksByLetter).sort();
  const totalBooks = bookCatalog.length;

  const scrollToLetter = (letter) => {
    letterRefs.current[letter]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleAddToQueue = async (book, e) => {
    e.stopPropagation();
    if (!user) {
      onShowAuthModal();
      return;
    }
    await onAddToQueue(book);
  };

  const isInQueue = (book) => {
    return readingQueue?.some(item => 
      item.book_title?.toLowerCase() === book.title?.toLowerCase()
    );
  };

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
        <div className="mb-6">
          <h1 className="font-serif text-3xl sm:text-4xl text-[#4A5940] mb-2">My Collection</h1>
          <p className="text-[#7A8F6C] text-sm font-light">
            {totalBooks} books, alphabetically sorted
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#96A888]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or author..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#D4DAD0] bg-white text-[#4A5940] placeholder-[#96A888] text-sm focus:outline-none focus:ring-2 focus:ring-[#96A888] focus:border-transparent"
            />
          </div>
        </div>

        {/* Alphabet Navigation - Compact */}
        {!searchQuery && (
          <div className="mb-6 bg-white rounded-lg border border-[#D4DAD0] p-3">
            <div className="text-xs text-[#7A8F6C] font-light mb-2 text-center">Jump to letter:</div>
            <div className="flex flex-wrap gap-1 justify-center">
              {availableLetters.map(letter => (
                <button
                  key={letter}
                  onClick={() => scrollToLetter(letter)}
                  className="w-6 h-6 rounded text-[#5F7252] hover:bg-[#5F7252] hover:text-white text-xs font-medium transition-colors"
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Books Grouped by Letter */}
        <div className="space-y-8">
          {availableLetters.map(letter => (
            <div key={letter} ref={el => letterRefs.current[letter] = el}>
              <h2 className="font-serif text-2xl text-[#4A5940] mb-3 sticky top-0 bg-[#FDFBF4] py-2 z-10">
                {letter}
              </h2>
              <div className="bg-white rounded-xl border border-[#D4DAD0] shadow-sm divide-y divide-[#E8EBE4]">
                {booksByLetter[letter].map((book, idx) => {
                  const isExpanded = expandedBook === `${letter}-${idx}`;
                  const inQueue = isInQueue(book);
                  
                  return (
                    <div key={idx} className="px-5 py-4">
                      <button
                        onClick={() => setExpandedBook(isExpanded ? null : `${letter}-${idx}`)}
                        className="w-full text-left group"
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

                      {/* Action Buttons */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-[#E8EBE4] flex flex-wrap gap-2">
                          {/* Buy Button with Dropdown */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowBuyOptions(showBuyOptions === `${letter}-${idx}` ? null : `${letter}-${idx}`);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4DAD0] bg-white hover:bg-[#F8F6EE] text-[#5F7252] text-xs font-medium transition-colors"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              Buy
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            
                            {showBuyOptions === `${letter}-${idx}` && (
                              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-[#E8EBE4] shadow-lg py-1 w-max z-10">
                                <a
                                  href={getBookshopSearchUrl(book.title, book.author)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="block px-4 py-2 text-xs text-[#4A5940] hover:bg-[#F8F6EE] transition-colors whitespace-nowrap"
                                >
                                  📚 Bookshop.org
                                </a>
                                <a
                                  href={getAmazonKindleUrl(book.title, book.author)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="block px-4 py-2 text-xs text-[#4A5940] hover:bg-[#F8F6EE] transition-colors whitespace-nowrap"
                                >
                                  📱 Kindle
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Reviews Button */}
                          <a
                            href={getGoodreadsSearchUrl(book.title, book.author)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4DAD0] bg-white hover:bg-[#F8F6EE] text-[#5F7252] text-xs font-medium transition-colors"
                          >
                            <Star className="w-3.5 h-3.5" />
                            Reviews
                          </a>

                          {/* Save Button */}
                          <button
                            onClick={(e) => handleAddToQueue(book, e)}
                            disabled={inQueue}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                              inQueue
                                ? 'border-[#96A888] bg-[#E8EBE4] text-[#7A8F6C] cursor-default'
                                : 'border-[#D4DAD0] bg-white hover:bg-[#F8F6EE] text-[#5F7252]'
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                            {inQueue ? 'Saved' : 'Save'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredBooks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#7A8F6C] text-sm">No books found matching "{searchQuery}"</p>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-8 text-center text-xs text-[#7A8F6C] font-light">
          <p>This collection grows as I read. Last updated: December 2025</p>
        </div>
      </div>
    </div>
  );
}
