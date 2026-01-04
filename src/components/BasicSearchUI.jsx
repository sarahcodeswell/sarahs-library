import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, Sparkles, Library } from 'lucide-react';
import { basicSearch, getAvailableGenres, getAvailableAuthors } from '../lib/basicSearch';

// Common genres (hardcoded for speed, supplements DB)
const COMMON_GENRES = [
  'Literary Fiction',
  'Thriller & Mystery',
  'Memoir',
  'Historical Fiction',
  'Romance',
  'Self-Help & Personal Growth',
  'Spirituality & Mindfulness',
  'Biography',
  'Science Fiction',
  'Fantasy'
];

export default function BasicSearchUI({ onResults, onLoading, disabled }) {
  const [searchType, setSearchType] = useState('genre'); // 'genre' or 'author'
  const [searchValue, setSearchValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [genres, setGenres] = useState(COMMON_GENRES);
  const [isSearching, setIsSearching] = useState(false);

  // Load genres from DB on mount
  useEffect(() => {
    getAvailableGenres().then(dbGenres => {
      if (dbGenres.length > 0) {
        const combined = [...new Set([...COMMON_GENRES, ...dbGenres])];
        setGenres(combined.sort());
      }
    });
  }, []);

  const handleSearch = async () => {
    if (!searchValue.trim()) return;
    
    setIsSearching(true);
    onLoading?.(true);
    
    try {
      const results = await basicSearch(searchType, searchValue.trim());
      onResults?.(results);
    } catch (err) {
      console.error('[BasicSearchUI] Search failed:', err);
    } finally {
      setIsSearching(false);
      onLoading?.(false);
    }
  };

  return (
    <div className="mb-4">
      {/* Toggle to show/hide basic search */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-[#7A8F6C] hover:text-[#5F7252] transition-colors mb-2"
      >
        <Filter className="w-4 h-4" />
        <span>Search by Genre or Author</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="bg-[#F8F6EE] rounded-xl border border-[#E8EBE4] p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Type Toggle */}
            <div className="flex rounded-lg overflow-hidden border border-[#E8EBE4]">
              <button
                onClick={() => { setSearchType('genre'); setSearchValue(''); }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  searchType === 'genre'
                    ? 'bg-[#5F7252] text-white'
                    : 'bg-white text-[#4A5940] hover:bg-[#F0EDE5]'
                }`}
              >
                Genre
              </button>
              <button
                onClick={() => { setSearchType('author'); setSearchValue(''); }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  searchType === 'author'
                    ? 'bg-[#5F7252] text-white'
                    : 'bg-white text-[#4A5940] hover:bg-[#F0EDE5]'
                }`}
              >
                Author
              </button>
            </div>

            {/* Search Input */}
            <div className="flex-1 flex gap-2">
              {searchType === 'genre' ? (
                <select
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-[#E8EBE4] bg-white text-[#4A5940] text-sm focus:outline-none focus:ring-2 focus:ring-[#7A8F6C]"
                >
                  <option value="">Select a genre...</option>
                  {genres.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter author name..."
                  className="flex-1 px-3 py-2 rounded-lg border border-[#E8EBE4] bg-white text-[#4A5940] text-sm focus:outline-none focus:ring-2 focus:ring-[#7A8F6C]"
                />
              )}

              <button
                onClick={handleSearch}
                disabled={!searchValue.trim() || isSearching || disabled}
                className="px-4 py-2 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Search</span>
              </button>
            </div>
          </div>

          {/* Info text */}
          <p className="mt-3 text-xs text-[#96A888] flex items-center gap-2">
            <Library className="w-3 h-3" />
            Searches my curated catalog first, then discovers more from the world's library
          </p>
        </div>
      )}
    </div>
  );
}
