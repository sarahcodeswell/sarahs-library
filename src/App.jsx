import React, { useState, useRef, useEffect } from 'react';
import { Search, Book, Star, MessageCircle, X, Send, ExternalLink, Globe, Library, ShoppingBag, Heart, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { track } from '@vercel/analytics';
import bookCatalog from './books.json';

const BOOKSHOP_AFFILIATE_ID = '119544';

const STOP_WORDS = new Set([
  'a','an','and','are','as','at','be','but','by','for','from','has','have','i','if','in','into','is','it','its','me','my','of','on','or','our','s','so','that','the','their','them','then','there','these','they','this','to','was','we','were','what','when','where','which','who','why','with','you','your'
]);

function tokenizeForSearch(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(Boolean)
    .filter(t => !STOP_WORDS.has(t));
}

function buildLibraryContext(userMessage, catalog) {
  const q = String(userMessage || '').toLowerCase();
  const tokens = tokenizeForSearch(userMessage);

  // Score books by simple lexical overlap. This is intentionally cheap and deterministic.
  const scored = (catalog || []).map((b, idx) => {
    const title = String(b.title || '');
    const author = String(b.author || '');
    const genre = String(b.genre || '');
    const themes = Array.isArray(b.themes) ? b.themes : [];
    const description = String(b.description || '');

    const titleLc = title.toLowerCase();
    const authorLc = author.toLowerCase();
    const genreLc = genre.toLowerCase();
    const descLc = description.toLowerCase();
    const themesLc = themes.map(t => String(t || '').toLowerCase());

    let score = 0;
    if (q && titleLc.includes(q)) score += 18;
    if (q && authorLc.includes(q)) score += 10;
    if (q && descLc.includes(q)) score += 6;

    for (const t of tokens) {
      if (titleLc.includes(t)) score += 6;
      if (authorLc.includes(t)) score += 4;
      if (genreLc.includes(t)) score += 3;
      if (themesLc.includes(t)) score += 3;
      if (descLc.includes(t)) score += 1;
    }

    if (b.favorite) score += 0.75;

    return { book: b, score, idx };
  });

  scored.sort((a, b) => (b.score - a.score) || (a.idx - b.idx));

  // Keep this shortlist small: it is sent to the model per request.
  // Always include some favorites for breadth, plus top matches for relevance.
  const favorites = scored.filter(s => s.book?.favorite).slice(0, 12).map(s => s.book);
  const topMatches = scored.slice(0, 24).map(s => s.book);

  const picked = [];
  const seen = new Set();
  const add = (b) => {
    const key = `${String(b?.title || '').toLowerCase()}|${String(b?.author || '').toLowerCase()}`;
    if (!key || seen.has(key)) return;
    seen.add(key);
    picked.push(b);
  };
  favorites.forEach(add);
  topMatches.forEach(add);
  // Ensure we provide enough options even for vague queries.
  for (const s of scored) {
    if (picked.length >= 28) break;
    add(s.book);
  }

  const formatBookLine = (b, includeDescription) => {
    const title = String(b.title || '').trim();
    const author = String(b.author || '').trim();
    const genre = String(b.genre || '').trim();
    const themes = Array.isArray(b.themes) && b.themes.length ? ` themes: ${b.themes.join(', ')}` : '';
    const fav = b.favorite ? ' ⭐' : '';

    if (!includeDescription) {
      return `- "${title}" by ${author} [${genre}]${themes}${fav}`;
    }

    const desc = String(b.description || '').trim();
    const short = desc.length > 120 ? `${desc.slice(0, 117)}…` : desc;
    return `- "${title}" by ${author} [${genre}]${themes}${fav} — ${short}`;
  };

  const header = `Shortlisted books from Sarah's library (shown: ${picked.length} / total: ${(catalog || []).length}).`;
  const lines = picked.map((b, i) => formatBookLine(b, i < 10));
  return [header, ...lines].join('\n');
}

 function FormattedText({ text }) {
   const lines = String(text || '').split('\n');
 
   const renderInlineBold = (line) => {
     const parts = String(line).split('**');
     return parts.map((part, idx) =>
       idx % 2 === 1 ? <strong key={idx}>{part}</strong> : <React.Fragment key={idx}>{part}</React.Fragment>
     );
   };
 
   return (
     <>
       {lines.map((line, idx) => (
         <React.Fragment key={idx}>
           {renderInlineBold(line)}
           {idx < lines.length - 1 && <br />}
         </React.Fragment>
       ))}
     </>
   );
 }

const themeInfo = {
  women: { emoji: "📚", label: "Women's Untold Stories", color: "bg-rose-50 text-rose-700 border-rose-200" },
  emotional: { emoji: "💔", label: "Emotional Truth", color: "bg-amber-50 text-amber-700 border-amber-200" },
  identity: { emoji: "🎭", label: "Identity & Belonging", color: "bg-violet-50 text-violet-700 border-violet-200" },
  spiritual: { emoji: "🕯", label: "Spiritual Seeking", color: "bg-teal-50 text-teal-700 border-teal-200" },
  justice: { emoji: "⚖️", label: "Invisible Injustices", color: "bg-emerald-50 text-emerald-700 border-emerald-200" }
};

// Parse structured recommendations from AI response
function parseRecommendations(text) {
  const recommendations = [];
  const lines = text.split('\n');
  let current = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('Title:')) {
      if (current) recommendations.push(current);
      current = { title: trimmed.replace('Title:', '').trim() };
    } else if (current) {
      if (trimmed.startsWith('Author:')) {
        current.author = trimmed.replace('Author:', '').trim();
      } else if (trimmed.startsWith('Why This Fits:')) {
        current.why = trimmed.replace('Why This Fits:', '').trim();
      } else if (trimmed.startsWith('Why:')) {
        current.why = trimmed.replace('Why:', '').trim();
      } else if (trimmed.startsWith('Description:')) {
        current.description = trimmed.replace('Description:', '').trim();
      } else if (trimmed.startsWith('Reputation:')) {
        current.reputation = trimmed.replace('Reputation:', '').trim();
      }
    }
  }
  
  if (current && current.title) recommendations.push(current);
  return recommendations;
}

// Check if message contains structured recommendations
function hasStructuredRecommendations(text) {
  const t = String(text || '');
  return t.includes('Title:') && (t.includes('Why This Fits:') || t.includes('Why:') || t.includes('Description:'));
}

function RecommendationCard({ rec, index }) {
  const [expanded, setExpanded] = useState(false);
  
  // Look up full book details from local catalog
  const catalogBook = bookCatalog.find(b => 
    b.title.toLowerCase() === rec.title.toLowerCase() ||
    b.title.toLowerCase().includes(rec.title.toLowerCase()) ||
    rec.title.toLowerCase().includes(b.title.toLowerCase())
  );
  
  const handleLinkClick = (destination) => {
    track('book_link_click', {
      book_title: rec.title,
      book_author: rec.author || '',
      destination: destination,
      source: 'recommendation_card'
    });
  };

  const goodreadsUrl = `https://www.goodreads.com/search?q=${encodeURIComponent(`${rec.title} ${rec.author || ''}`)}`;
  const bookshopUrl = `https://bookshop.org/search?keywords=${encodeURIComponent(`${rec.title} ${rec.author || ''}`)}&a_aid=${BOOKSHOP_AFFILIATE_ID}`;

  // Use catalog description if available, otherwise use AI-provided description
  const fullDescription = catalogBook?.description || rec.description;

  return (
    <div className="bg-[#FDFBF4] rounded-xl border border-[#D4DAD0] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-[#F5F7F2] transition-colors"
      >
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#5F7252] text-white text-xs font-medium flex items-center justify-center">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-[#4A5940] text-sm">{rec.title}</h4>
            {catalogBook?.favorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
          </div>
          {rec.author && <p className="text-xs text-[#7A8F6C]">{rec.author}</p>}
          <p className="text-xs text-[#5F7252] mt-1">{rec.why}</p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[#96A888] flex-shrink-0 mt-1" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#96A888] flex-shrink-0 mt-1" />
        )}
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-[#E8EBE4]">
          <div className="pt-3 space-y-2">
            {fullDescription && (
              <p className="text-xs text-[#5F7252] leading-relaxed">{fullDescription}</p>
            )}
            {catalogBook && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {catalogBook.themes?.slice(0, 3).map(theme => (
                  <span key={theme} className="text-xs px-2 py-0.5 bg-[#E8EBE4] text-[#5F7252] rounded-full">
                    {themeInfo[theme]?.emoji} {themeInfo[theme]?.label}
                  </span>
                ))}
              </div>
            )}
            {rec.reputation && (
              <p className="text-xs text-[#7A8F6C]">
                <span className="font-medium">Reputation:</span> {rec.reputation}
              </p>
            )}
            {catalogBook && (
              <p className="text-xs text-[#96A888] italic">📚 From Sarah's Library</p>
            )}
          </div>
          
          <div className="flex gap-2 mt-3">
            <a
              href={goodreadsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleLinkClick('goodreads')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#5F7252] text-white rounded-lg text-xs hover:bg-[#4A5940] transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Goodreads
            </a>
            <a
              href={bookshopUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleLinkClick('bookshop')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#4A7C59] text-white rounded-lg text-xs hover:bg-[#3d6649] transition-colors"
            >
              <ShoppingBag className="w-3 h-3" />
              Buy Local
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function FormattedRecommendations({ text }) {
  const recommendations = parseRecommendations(text);
  
  // Extract the header (everything before the first recommendation)
  const headerMatch = text.match(/^(.*?)(?=\[RECOMMENDATION|\nTitle:)/s);
  const header = headerMatch ? headerMatch[1].trim() : '';
  
  return (
    <div className="space-y-3">
      {header && (
        <p className="text-sm font-medium text-[#4A5940]">{header}</p>
      )}
      {recommendations.map((rec, idx) => (
        <RecommendationCard key={idx} rec={rec} index={idx} />
      ))}
    </div>
  );
}

const genres = ["All", "Literary Fiction", "Historical Fiction", "Memoir", "Self-Help & Spirituality", "Thriller & Mystery", "Romance & Contemporary", "Nonfiction"];

const genreDescriptions = {
  "Literary Fiction": "Character-driven, beautifully written novels.",
  "Historical Fiction": "Immersive stories rooted in real eras and events.",
  "Memoir": "True personal stories and lived experience.",
  "Self-Help & Spirituality": "Practical tools, inner work, and meaning-making.",
  "Thriller & Mystery": "High-stakes suspense, twists, and page-turners.",
  "Romance & Contemporary": "Modern relationships, heart, and real-life stakes.",
  "Nonfiction": "Ideas, history, culture, and learning—true and researched."
};

const getGoodreadsSearchUrl = (title, author) => {
  const searchQuery = encodeURIComponent(`${title} ${author || ''}`);
  return `https://www.goodreads.com/search?q=${searchQuery}`;
};

const getBookshopSearchUrl = (title, author) => {
  const searchQuery = encodeURIComponent(`${title} ${author || ''}`);
  return `https://bookshop.org/search?keywords=${searchQuery}&a_aid=${BOOKSHOP_AFFILIATE_ID}`;
};

const getSystemPrompt = (mode) => {
  const responseFormat = `
RESPONSE FORMAT:
When recommending books, always respond with exactly this structure:

📚 My Top 3 Picks for You

[RECOMMENDATION 1]
Title: [Book Title]
Author: [Author Name]
Why This Fits: [1-2 sentences explaining why this matches their request]
Description: [2-3 sentence description of the book]
Reputation: [Mention Goodreads rating, awards, or Indie Next List recognition if notable]

[RECOMMENDATION 2]
...same format...

[RECOMMENDATION 3]
...same format...

Keep responses concise. Be direct and helpful.`;

  const qualityGuidelines = `
Be specific about WHY each book matches their request. If vague, ask one clarifying question first.`;

  if (mode === 'library') {
    return `You are Sarah, a book curator sharing recommendations from your personal library.
${responseFormat}
${qualityGuidelines}

IMPORTANT: Only recommend books from the provided LIBRARY SHORTLIST (included in the user's message). If asked about books not listed, offer to switch to "Discover New" mode.`;
  } else {
    return `You are Sarah, a book curator helping discover new reads.

Your taste: women's stories, emotional truth, identity, spirituality, justice.
${responseFormat}
${qualityGuidelines}

Prioritize: Goodreads 4.0+, award winners, Indie Next picks, staff favorites.`;
  }
};

function BookDetail({ book, onClose }) {
  const handleLinkClick = (destination) => {
    track('book_link_click', {
      book_title: book.title,
      book_author: book.author,
      book_genre: book.genre,
      is_favorite: book.favorite || false,
      destination: destination,
      source: 'book_detail'
    });
  };

  const goodreadsUrl = getGoodreadsSearchUrl(book.title, book.author);
  const bookshopUrl = getBookshopSearchUrl(book.title, book.author);

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

          <div className="flex flex-col sm:flex-row gap-3">
            <a 
              href={goodreadsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => handleLinkClick('goodreads')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#5F7252] text-white rounded-xl hover:bg-[#4A5940] transition-colors font-medium text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Find on Goodreads
            </a>
            <a 
              href={bookshopUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => handleLinkClick('bookshop')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#4A7C59] text-white rounded-xl hover:bg-[#3d6649] transition-colors font-medium text-sm"
            >
              <ShoppingBag className="w-4 h-4" />
              Buy Local 🌱
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatSearchBox({ onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = (destination) => {
    if (!searchTerm.trim()) return;
    
    track('book_link_click', {
      book_title: searchTerm,
      book_author: '',
      book_genre: 'unknown',
      is_favorite: false,
      destination: destination,
      source: 'chat_search'
    });

    const url = destination === 'goodreads' 
      ? getGoodreadsSearchUrl(searchTerm, '')
      : getBookshopSearchUrl(searchTerm, '');
    window.open(url, '_blank');
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Enter book title..."
          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#D4DAD0] focus:border-[#96A888] outline-none text-[#4A5940] placeholder-[#96A888]"
        />
        <button
          onClick={onClose}
          className="px-2 py-1.5 text-[#96A888] hover:text-[#4A5940] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleSearch('goodreads')}
          disabled={!searchTerm.trim()}
          className="flex-1 px-3 py-1.5 bg-[#5F7252] text-white rounded-lg text-xs hover:bg-[#4A5940] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          Goodreads
        </button>
        <button
          onClick={() => handleSearch('bookshop')}
          disabled={!searchTerm.trim()}
          className="flex-1 px-3 py-1.5 bg-[#4A7C59] text-white rounded-lg text-xs hover:bg-[#3d6649] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
        >
          <ShoppingBag className="w-3 h-3" />
          Buy Local
        </button>
      </div>
    </div>
  );
}

function ChatMessage({ message, isUser, showSearchOption, messageIndex }) {
  const [showSearch, setShowSearch] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const isStructured = !isUser && hasStructuredRecommendations(message);

  const handleFeedback = (type) => {
    setFeedback(type);
    track('recommendation_feedback', {
      feedback_type: type,
      message_index: messageIndex,
      message_preview: message.substring(0, 100)
    });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <img 
          src="/sarah.png" 
          alt="Sarah"
          className="w-10 h-10 rounded-full object-cover mr-3 border-2 border-[#D4DAD0] flex-shrink-0"
        />
      )}
      <div className="flex flex-col max-w-[85%]">
        <div className={`rounded-2xl px-5 py-3 ${
          isUser 
            ? 'bg-[#5F7252] text-white rounded-br-sm' 
            : 'bg-white text-[#4A5940] rounded-bl-sm border border-[#D4DAD0]'
        }`}>
          {isStructured ? (
            <FormattedRecommendations text={message} />
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {!isUser ? <FormattedText text={message} /> : message}
            </p>
          )}
        </div>
        
        {!isUser && showSearchOption && (
          <div className="mt-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleFeedback('up')}
                  disabled={feedback !== null}
                  className={`p-1.5 rounded-lg transition-colors ${
                    feedback === 'up'
                      ? 'text-[#5F7252] bg-[#E8EBE4]'
                      : feedback === 'down'
                      ? 'text-[#D4DAD0] cursor-not-allowed'
                      : 'text-[#96A888] hover:text-[#5F7252] hover:bg-[#E8EBE4]'
                  }`}
                  title="Helpful"
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${feedback === 'up' ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={() => handleFeedback('down')}
                  disabled={feedback !== null}
                  className={`p-1.5 rounded-lg transition-colors ${
                    feedback === 'down'
                      ? 'text-[#5F7252] bg-[#E8EBE4]'
                      : feedback === 'up'
                      ? 'text-[#D4DAD0] cursor-not-allowed'
                      : 'text-[#96A888] hover:text-[#5F7252] hover:bg-[#E8EBE4]'
                  }`}
                  title="Not helpful"
                >
                  <ThumbsDown className={`w-3.5 h-3.5 ${feedback === 'down' ? 'fill-current' : ''}`} />
                </button>
                {feedback && (
                  <span className="text-xs text-[#96A888] ml-1">Thanks!</span>
                )}
              </div>
              
              {!isStructured && (
                <>
                  <div className="w-px h-4 bg-[#D4DAD0]" />
                  
                  {!showSearch && (
                    <button
                      onClick={() => setShowSearch(true)}
                      className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-[#7A8F6C] hover:text-[#5F7252] transition-colors"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Find this book...
                    </button>
                  )}
                </>
              )}
            </div>
            
            {showSearch && !isStructured && (
              <ChatSearchBox onClose={() => setShowSearch(false)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="mb-6 sm:mb-8 bg-white rounded-2xl p-6 sm:p-8 border border-[#D4DAD0] shadow-sm">
      <div className="flex items-start gap-4 sm:gap-6">
        <div className="hidden sm:block flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-[#E8EBE4] flex items-center justify-center">
            <Heart className="w-8 h-8 text-[#5F7252]" />
          </div>
        </div>
        <div>
          <h3 className="font-serif text-lg sm:text-xl text-[#4A5940] mb-3">Why I Built This</h3>
          <div className="space-y-2.5 text-xs sm:text-sm text-[#5F7252] leading-relaxed">
            <p>
              I've always been the friend people call when they need a book recommendation. "Something that'll make me feel something," they say. Or "I need to escape but not too far." I get it—finding the right book at the right moment is a small kind of magic.
            </p>
            <p>
              So I built this: a digital version of my bookshelves, searchable and powered by AI that knows my taste. It's a living library that grows as I read, with a discovery engine to help us both find what's next. And when you're ready to buy, I hope you'll support a local bookstore—they're the heartbeat of our communities.
            </p>
            <p className="text-[#7A8F6C] italic">
              Happy reading, friend. 📚
            </p>
          </div>
        </div>
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
  const [expandedGenres, setExpandedGenres] = useState({});
  const [messages, setMessages] = useState([
    { text: "Hi! I'm Sarah, and this is my personal library. 📚 I'd love to help you find your next read. Tell me what you're in the mood for, or ask me anything about these books—I've read them all!", isUser: false }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);
  const inFlightRequestRef = useRef(null);

  const systemPrompt = React.useMemo(() => getSystemPrompt(chatMode), [chatMode]);

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

  const booksByGenre = filteredBooks.reduce((acc, book) => {
    const g = book.genre || 'Other';
    if (!acc[g]) acc[g] = [];
    acc[g].push(book);
    return acc;
  }, {});

  const genreOrder = (selectedGenre !== 'All')
    ? [selectedGenre]
    : genres.filter(g => g !== 'All');

  const visibleGenres = genreOrder.filter(g => (booksByGenre[g] || []).length > 0);

  const toggleGenreExpanded = (genre) => {
    setExpandedGenres(prev => ({
      ...prev,
      [genre]: !prev?.[genre]
    }));
  };

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

    let timeoutId;
    try {
      // Abort any in-flight request (e.g., rapid successive sends).
      if (inFlightRequestRef.current) {
        try { inFlightRequestRef.current.abort(); } catch (e) { void e; }
      }
      const controller = new AbortController();
      inFlightRequestRef.current = controller;
      timeoutId = setTimeout(() => {
        try { controller.abort(); } catch (e) { void e; }
      }, 25000);

      const chatHistory = messages
        .filter(m => m.isUser !== undefined)
        .slice(-6)
        .map(m => ({
          role: m.isUser ? 'user' : 'assistant',
          content: m.text
        }));

      const userContent = chatMode === 'library'
        ? `LIBRARY SHORTLIST:\n${buildLibraryContext(userMessage, bookCatalog)}\n\nUSER REQUEST:\n${userMessage}`
        : userMessage;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          system: systemPrompt,
          messages: [
            ...chatHistory,
            { role: 'user', content: userContent }
          ]
        })
      });

      const data = await response.json();
      const assistantMessage = data.content?.[0]?.text || "I'm having trouble thinking right now. Could you try again?";
      setMessages(prev => [...prev, { text: assistantMessage, isUser: false }]);
    } catch (error) {
      const isAbort = error?.name === 'AbortError';
      if (!isAbort) {
        setMessages(prev => [...prev, { 
          text: "Oops, I'm having a moment. Let me catch my breath and try again!", 
          isUser: false 
        }]);
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      inFlightRequestRef.current = null;
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
                <p className="text-xs text-[#7A8F6C] font-light tracking-wide hidden sm:block">190+ books with infinite possibilities · Curated with love</p>
                <p className="text-xs text-[#7A8F6C] font-light tracking-wide sm:hidden">190+ books · Curated with love</p>
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
            <div className="bg-[#FDFBF4]">
              <img
                src="/books.jpg"
                alt="Stack of books"
                className="block w-full h-[clamp(200px,32vh,460px)] object-cover object-center"
              />
            </div>
            <div className="bg-white/80 backdrop-blur-sm border-t border-[#E8EBE4]">
              <div className="px-5 sm:px-8 py-4">
                <h2 className="text-[#4A5940] font-serif text-xl sm:text-3xl mb-1 sm:mb-2">Welcome to My Personal Library</h2>
                <p className="text-[#7A8F6C] text-xs sm:text-sm font-light">Find your next great read.</p>
              </div>
            </div>
          </div>

          <AboutSection />

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
                <label className="text-xs text-[#7A8F6C] font-medium uppercase tracking-wider">Curator Themes</label>
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

          <div className="space-y-5 sm:space-y-6">
            {visibleGenres.map((genre) => {
              const list = booksByGenre[genre] || [];
              const isCollapsed = !!expandedGenres?.[genre];
              const shown = isCollapsed ? [] : list;

              return (
                <div key={genre} className="bg-white rounded-2xl border border-[#D4DAD0] shadow-sm overflow-hidden">
                  <div className="px-5 sm:px-6 py-4 flex items-center justify-between border-b border-[#E8EBE4] bg-[#FDFBF4]">
                    <div>
                      <h3 className="font-serif text-lg text-[#4A5940]">
                        {genre}{' '}
                        <span className="text-sm text-[#7A8F6C] font-light">({list.length})</span>
                      </h3>
                      {genreDescriptions[genre] && (
                        <p className="text-xs text-[#7A8F6C] font-light">{genreDescriptions[genre]}</p>
                      )}
                    </div>
                    {list.length > 0 && (
                      <button
                        onClick={() => toggleGenreExpanded(genre)}
                        className="text-xs font-medium text-[#5F7252] hover:text-[#4A5940] transition-colors"
                      >
                        {isCollapsed ? `Expand (${list.length})` : 'Collapse'}
                      </button>
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="divide-y divide-[#E8EBE4]">
                      {shown.map((book) => (
                        <button
                          key={`${book.title}__${book.author}`}
                          onClick={() => setSelectedBook(book)}
                          className="w-full px-5 sm:px-6 py-3 text-left hover:bg-[#F5F7F2] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-[#4A5940] truncate">{book.title}</span>
                                {book.favorite && (
                                  <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                                )}
                              </div>
                              <span className="block text-xs text-[#7A8F6C] font-light truncate">{book.author}</span>
                              {!!book.themes?.length && (
                                <span className="block text-xs text-[#96A888] mt-1">
                                  {book.themes.slice(0, 3).map(t => themeInfo[t]?.emoji).filter(Boolean).join(' ')}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-[#96A888] flex-shrink-0">View</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
              <div className="bg-[#FDFBF4]">
                <img
                  src="/books.jpg"
                  alt="Open book on desk"
                  className="block w-full h-[clamp(160px,24vh,320px)] object-cover object-center"
                />
              </div>
              <div className="bg-white/80 backdrop-blur-sm border-t border-[#E8EBE4]">
                <div className="px-5 sm:px-6 py-3">
                  <h2 className="text-[#4A5940] font-serif text-lg sm:text-xl">
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
                showSearchOption={!msg.isUser && idx > 0}
                messageIndex={idx}
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
