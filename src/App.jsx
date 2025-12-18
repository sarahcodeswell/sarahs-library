import React, { useState, useRef, useEffect } from 'react';
import { Search, Book, Star, MessageCircle, X, Send, ExternalLink, Globe, Library } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { track } from '@vercel/analytics';
import bookCatalog from './books.json';

const themeInfo = {
  women: { emoji: "📚", label: "Women's Untold Stories", color: "bg-rose-50 text-rose-700 border-rose-200" },
  emotional: { emoji: "💔", label: "Emotional Truth", color: "bg-amber-50 text-amber-700 border-amber-200" },
  identity: { emoji: "🎭", label: "Identity & Belonging", color: "bg-violet-50 text-violet-700 border-violet-200" },
  spiritual: { emoji: "🕯", label: "Spiritual Seeking", color: "bg-teal-50 text-teal-700 border-teal-200" },
  justice: { emoji: "⚖️", label: "Invisible Injustices", color: "bg-emerald-50 text-emerald-700 border-emerald-200" }
};

const genres = ["All", "Literary Fiction", "Historical Fiction", "Memoir", "Self-Help & Spirituality", "Thriller & Mystery", "Romance & Contemporary", "Nonfiction"];

const getGoodreadsSearchUrl = (title, author) => {
  const searchQuery = encodeURIComponent(`${title} ${author || ''}`);
  return `https://www.goodreads.com/search?q=${searchQuery}`;
};

const getSystemPrompt = (mode, catalog) => {
  const basePersonality = `You are Sarah, a warm, thoughtful book lover. You're passionate about reading and love helping people find their next great book.

Your reading personality:
- You're drawn to women's interior lives and untold stories
- You read for emotional truth, not escapism
- You grapple with questions of identity and belonging
- You're a spiritual seeker with eclectic tastes
- You care deeply about justice, especially invisible injustices

Be conversational and personal, like chatting with a friend. Keep responses concise but warm (2-3 paragraphs max).`;

  if (mode === 'library') {
    const catalogSummary = catalog.map(b => 
      `- "${b.title}" by ${b.author} (${b.genre})${b.favorite ? ' ⭐FAVORITE' : ''}: ${b.description}`
    ).join('\n');
    
    return `${basePersonality}

You can ONLY recommend books from your personal library below. If asked about books not in your collection, acknowledge you don't own them and suggest similar books you DO have.

MY LIBRARY:
${catalogSummary}`;
  } else {
    return `${basePersonality}

You're helping discover NEW books beyond your personal library. Use your broad knowledge of literature to recommend books the user might enjoy. Consider their interests, mood, and reading preferences.

For context, here are some of your favorite books and themes to understand the user's taste:
- Kristin Hannah, Paula McLain, Marie Benedict (women's historical fiction)
- Khaled Hosseini, Yaa Gyasi (identity and emotional depth)
- Brené Brown (vulnerability and growth)
- Books about justice, invisible injustices, and untold stories

Recommend books you genuinely think are excellent. Include a mix of well-known and lesser-known titles.`;
  }
};

function BookCard({ book, onClick }) {
  return (
    <div 
      onClick={() => onClick(book)}
      className="group cursor-pointer bg-white rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 border border-[#D4DAD0] hover:border-[#96A888]"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-serif text-lg text-[#4A5940] group-hover:text-[#5F7252] transition-colors leading-tight pr-2">
          {book.title}
        </h3>
        {book.favorite && (
          <Star className="w-5 h-5 text-amber-400 fill-amber-400 flex-shrink-0" />
        )}
      </div>
      <p className="text-sm text-[#7A8F6C] mb-4 font-light">{book.author}</p>
      <div className="flex flex-wrap gap-1.5">
        {book.themes.slice(0, 3).map(theme => (
          <span key={theme} className="text-sm opacity-80 hover:opacity-100 transition-opacity" title={themeInfo[theme]?.label}>
            {themeInfo[theme]?.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}

function BookDetail({ book, onClose }) {
  const handleGoodreadsClick = () => {
    track('goodreads_click', {
      book_title: book.title,
      book_author: book.author,
      book_genre: book.genre,
      is_favorite: book.favorite || false,
      source: 'book_detail'
    });
  };

  const goodreadsUrl = getGoodreadsSearchUrl(book.title, book.author);

  return (
    <div className="fixed inset-0 bg-[#4A5940]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-[#FDFBF4] rounded-3xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-[#D4DAD0]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="font-serif text-2xl text-[#4A5940]">{book.title}</h2>
                {book.favorite && <Star className="w-5 h-5 text-amber-400 fill-amber-400" />}
              </div>
              <p className="text-[#7A8F6C] font-light">{book.author}</p>
            </div>
            <button onClick={onClose} className="text-[#96A888] hover:text-[#4A5940] transition-colors p-1">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="mb-5">
            <span className="text-xs text-[#7A8F6C] font-medium uppercase tracking-wider">Genre</span>
            <div className="mt-1">
              <span className="inline-block px-4 py-1.5 bg-[#E8EBE4] text-[#4A5940] text-sm rounded-full font-medium">
                {book.genre}
              </span>
            </div>
          </div>
          
          <p className="text-[#5F7252] leading-relaxed mb-6">{book.description}</p>
          
          <div className="mb-6">
            <span className="text-xs text-[#7A8F6C] font-medium uppercase tracking-wider">Themes</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {book.themes.map(theme => (
                <span 
                  key={theme} 
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border ${themeInfo[theme]?.color}`}
                >
                  {themeInfo[theme]?.emoji} {themeInfo[theme]?.label}
                </span>
              ))}
            </div>
          </div>

          <a 
            href={goodreadsUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={handleGoodreadsClick}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#5F7252] text-white rounded-xl hover:bg-[#4A5940] transition-colors font-medium text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Find on Goodreads
          </a>
        </div>
      </div>
    </div>
  );
}

function GoodreadsSearchBox({ onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    
    track('goodreads_click', {
      book_title: searchTerm,
      book_author: '',
      book_genre: 'unknown',
      is_favorite: false,
      source: 'chat_search'
    });

    const url = getGoodreadsSearchUrl(searchTerm, '');
    window.open(url, '_blank');
    setSearchTerm('');
    onClose();
  };

  return (
    <div className="mt-2 flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        onKeyPress={e => e.key === 'Enter' && handleSearch()}
        placeholder="Enter book title..."
        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#D4DAD0] focus:border-[#96A888] outline-none text-[#4A5940] placeholder-[#96A888]"
      />
      <button
        onClick={handleSearch}
        disabled={!searchTerm.trim()}
        className="px-3 py-1.5 bg-[#5F7252] text-white rounded-lg text-xs hover:bg-[#4A5940] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Search
      </button>
      <button
        onClick={onClose}
        className="px-2 py-1.5 text-[#96A888] hover:text-[#4A5940] transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function ChatMessage({ message, isUser, showGoodreadsOption }) {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <img 
          src="/sarah.png" 
          alt="Sarah"
          className="w-10 h-10 rounded-full object-cover mr-3 border-2 border-[#D4DAD0] flex-shrink-0"
        />
      )}
      <div className="flex flex-col max-w-[80%]">
        <div className={`rounded-2xl px-5 py-3 ${
          isUser 
            ? 'bg-[#5F7252] text-white rounded-br-sm' 
            : 'bg-white text-[#4A5940] rounded-bl-sm border border-[#D4DAD0]'
        }`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
        </div>
        
        {!isUser && showGoodreadsOption && (
          <>
            {!showSearch ? (
              <button
                onClick={() => setShowSearch(true)}
                className="self-start mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#7A8F6C] hover:text-[#5F7252] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Find a book on Goodreads
              </button>
            ) : (
              <GoodreadsSearchBox onClose={() => setShowSearch(false)} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('browse');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [chatMode, setChatMode] = useState('library');
  const [messages, setMessages] = useState([
    { text: "Hi! I'm Sarah, and this is my personal library. 📚 I'd love to help you find your next read. Tell me what you're in the mood for, or ask me anything about these books—I've read them all!", isUser: false }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (chatMode === 'library') {
      setMessages([{ 
        text: "Hi! I'm Sarah, and this is my personal library. 📚 I'd love to help you find your next read. Tell me what you're in the mood for, or ask me anything about these books—I've read them all!", 
        isUser: false 
      }]);
    } else {
      setMessages([{ 
        text: "Let's discover something new! 🌍 I'll recommend books from beyond my personal collection. Tell me what you're in the mood for—a specific genre, theme, or vibe—and I'll suggest some titles you might love.", 
        isUser: false 
      }]);
    }
  }, [chatMode]);

  const filteredBooks = bookCatalog.filter(book => {
    if (selectedGenre !== 'All' && book.genre !== selectedGenre) return false;
    if (selectedTheme && !book.themes.includes(selectedTheme)) return false;
    if (showFavoritesOnly && !book.favorite) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return book.title.toLowerCase().includes(query) || 
             book.author.toLowerCase().includes(query);
    }
    return true;
  });

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setIsLoading(true);

    track('chat_message', {
      mode: chatMode,
      message_length: userMessage.length
    });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: getSystemPrompt(chatMode, bookCatalog),
          messages: [
            ...messages.filter(m => m.isUser !== undefined).map(m => ({
              role: m.isUser ? 'user' : 'assistant',
              content: m.text
            })),
            { role: 'user', content: userMessage }
          ]
        })
      });

      const data = await response.json();
      const assistantMessage = data.content?.[0]?.text || "I'm having trouble thinking right now. Could you try again?";
      setMessages(prev => [...prev, { text: assistantMessage, isUser: false }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        text: "Oops, I'm having a moment. Let me catch my breath and try again!", 
        isUser: false 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestionChips = chatMode === 'library' 
    ? ["What's your favorite book?", "Something about strong women", "I need a good cry"]
    : ["Best books of 2024", "Hidden gems like Kristin Hannah", "Something completely different"];

  return (
    <div className="min-h-screen font-sans" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)', fontFamily: "'Poppins', sans-serif" }}>
      <Analytics />
      <header className="bg-[#FDFBF4]/90 backdrop-blur-md border-b border-[#D4DAD0] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <img 
                src="/sarah.png" 
                alt="Sarah" 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-[#D4DAD0] shadow-sm"
              />
              <div>
                <h1 className="font-serif text-xl sm:text-2xl text-[#4A5940]">Sarah's Library</h1>
                <p className="text-xs text-[#7A8F6C] font-light tracking-wide">{bookCatalog.length} books · 7 genres · curated with love</p>
              </div>
            </div>
            
            <div className="flex bg-[#E8EBE4] rounded-full p-1 sm:p-1.5">
              <button
                onClick={() => setView('browse')}
                className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-sm font-medium transition-all ${
                  view === 'browse' 
                    ? 'bg-white text-[#4A5940] shadow-sm' 
                    : 'text-[#5F7252] hover:text-[#4A5940]'
                }`}
              >
                <span className="hidden sm:inline">Browse</span>
                <Book className="w-4 h-4 sm:hidden" />
              </button>
              <button
                onClick={() => setView('chat')}
                className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-sm font-medium transition-all ${
                  view === 'chat' 
                    ? 'bg-white text-[#4A5940] shadow-sm' 
                    : 'text-[#5F7252] hover:text-[#4A5940]'
                }`}
              >
                <span className="hidden sm:inline">Ask Sarah</span>
                <MessageCircle className="w-4 h-4 sm:hidden" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {view === 'browse' ? (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="mb-6 sm:mb-8 rounded-2xl overflow-hidden shadow-lg relative">
            <img src="/books.jpg" alt="Stack of books" className="w-full h-36 sm:h-44 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#4A5940]/70 to-transparent flex items-center">
              <div className="px-4 sm:px-8 py-3 rounded-r-xl bg-[#4A5940]/60 backdrop-blur-sm">
                <h2 className="text-white font-serif text-xl sm:text-3xl mb-1 sm:mb-2">Welcome to My Library</h2>
                <p className="text-white/90 text-xs sm:text-sm font-light">Discover {bookCatalog.length} hand-picked books across 7 genres</p>
              </div>
            </div>
          </div>

          <div className="mb-6 sm:mb-8 space-y-4 sm:space-y-5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#96A888]" />
              <input
                type="text"
                placeholder="Search titles or authors..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-5 py-3 sm:py-4 bg-white rounded-2xl border border-[#D4DAD0] focus:border-[#96A888] focus:ring-4 focus:ring-[#E8EBE4] outline-none transition-all text-[#4A5940] placeholder-[#96A888]"
              />
            </div>

            <div className="flex flex-wrap gap-4 sm:gap-6 items-start">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#7A8F6C] font-medium uppercase tracking-wider">Genre</label>
                <select
                  value={selectedGenre}
                  onChange={e => setSelectedGenre(e.target.value)}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white rounded-xl border border-[#D4DAD0] text-sm focus:border-[#96A888] outline-none text-[#5F7252] font-medium min-w-[160px] sm:min-w-[180px]"
                >
                  {genres.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#7A8F6C] font-medium uppercase tracking-wider">Themes</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(themeInfo).map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedTheme(selectedTheme === key ? null : key)}
                      className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-sm transition-all font-medium flex items-center gap-1.5 ${
                        selectedTheme === key
                          ? 'bg-[#5F7252] text-white shadow-md'
                          : 'bg-white border border-[#D4DAD0] text-[#5F7252] hover:border-[#96A888]'
                      }`}
                      title={info.label}
                    >
                      <span>{info.emoji}</span>
                      <span className="hidden md:inline text-xs">{info.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#7A8F6C] font-medium uppercase tracking-wider">Show</label>
                <button
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all font-medium ${
                    showFavoritesOnly
                      ? 'bg-amber-100 text-amber-700 border border-amber-300'
                      : 'bg-white border border-[#D4DAD0] text-[#5F7252] hover:border-[#96A888]'
                  }`}
                >
                  <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
                  <span className="hidden sm:inline">Favorites Only</span>
                  <span className="sm:hidden">Favorites</span>
                </button>
              </div>
            </div>
          </div>

          <p className="text-sm text-[#7A8F6C] mb-4 sm:mb-6 font-light">
            Showing {filteredBooks.length} of {bookCatalog.length} books
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredBooks.map((book, idx) => (
              <BookCard key={idx} book={book} onClick={setSelectedBook} />
            ))}
          </div>

          {filteredBooks.length === 0 && (
            <div className="text-center py-16">
              <Book className="w-16 h-16 text-[#D4DAD0] mx-auto mb-4" />
              <p className="text-[#96A888] font-light">No books match your filters</p>
            </div>
          )}
        </main>
      ) : (
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 h-[calc(100vh-80px)] sm:h-[calc(100vh-100px)] flex flex-col">
          <div className="mb-4 flex justify-center">
            <div className="bg-white rounded-full p-1 border border-[#D4DAD0] shadow-sm">
              <button
                onClick={() => setChatMode('library')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 sm:gap-2 ${
                  chatMode === 'library'
                    ? 'bg-[#5F7252] text-white'
                    : 'text-[#5F7252] hover:text-[#4A5940]'
                }`}
              >
                <Library className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                My Library
              </button>
              <button
                onClick={() => setChatMode('discover')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 sm:gap-2 ${
                  chatMode === 'discover'
                    ? 'bg-[#5F7252] text-white'
                    : 'text-[#5F7252] hover:text-[#4A5940]'
                }`}
              >
                <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Discover New
              </button>
            </div>
          </div>

          {messages.length <= 2 && (
            <div className="mb-4 sm:mb-6 rounded-2xl overflow-hidden shadow-lg relative">
              <img src="/books.jpg" alt="Stack of books" className="w-full h-24 sm:h-32 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#4A5940]/70 to-transparent flex items-center">
                <div className="px-4 sm:px-6 py-2 rounded-r-xl bg-[#4A5940]/60 backdrop-blur-sm">
                  <h2 className="text-white font-serif text-lg sm:text-xl">
                    {chatMode === 'library' ? 'Ask About My Books' : 'Discover Something New'}
                  </h2>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto pb-4">
            {messages.map((msg, idx) => (
              <ChatMessage 
                key={idx} 
                message={msg.text} 
                isUser={msg.isUser} 
                showGoodreadsOption={!msg.isUser && idx > 0}
              />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <img 
                  src="/sarah.png" 
                  alt="Sarah"
                  className="w-10 h-10 rounded-full object-cover mr-3 border-2 border-[#D4DAD0] flex-shrink-0"
                />
                <div className="bg-white rounded-2xl rounded-bl-sm px-5 py-3 border border-[#D4DAD0]">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-[#96A888] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-[#96A888] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-[#96A888] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="bg-white rounded-2xl border border-[#D4DAD0] shadow-lg p-2 flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me for a recommendation..."
              className="flex-1 px-3 sm:px-4 py-2 sm:py-3 outline-none text-[#4A5940] placeholder-[#96A888] font-light text-sm sm:text-base"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="px-4 sm:px-5 py-2 sm:py-3 bg-[#5F7252] text-white rounded-xl hover:bg-[#4A5940] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
            {suggestionChips.map(suggestion => (
              <button
                key={suggestion}
                onClick={() => setInputValue(suggestion)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-[#D4DAD0] rounded-full text-xs text-[#5F7252] hover:border-[#96A888] hover:text-[#4A5940] transition-all font-medium"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </main>
      )}

      {selectedBook && (
        <BookDetail book={selectedBook} onClose={() => setSelectedBook(null)} />
      )}
    </div>
  );
}
