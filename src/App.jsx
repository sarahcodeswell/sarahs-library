import React, { useState, useRef, useEffect, lazy, Suspense, useMemo, useCallback } from 'react';
import { Book, Star, MessageCircle, X, Send, ExternalLink, Library, ShoppingBag, Heart, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, ChevronRight, Share2, Upload, Plus, User as UserIcon, Menu, Home, BookOpen, Mail, ArrowLeft, Bookmark, BookHeart, Users, Sparkles, Scale, RotateCcw, MessageSquare, BookMarked, Headphones, BookCheck, BarChart3 } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { track } from '@vercel/analytics';
import bookCatalog from './books.json';
import { db } from './lib/supabase';
import { extractThemes } from './lib/themeExtractor';
import { getRecommendations, parseRecommendations } from './lib/recommendationService';
import { useBookEnrichment } from './components/BookCard';
import { validateMessage, validateBook } from './lib/validation';
import { cacheUtils } from './lib/cache';
import { normalizeTitle, normalizeAuthor, safeNumber, bumpLocalMetric } from './lib/textUtils';
import { parseGoodreadsCsv } from './lib/csvParser';
import { buildLibraryContext } from './lib/libraryContext';
import { stripAccoladesFromDescription } from './lib/descriptionUtils';
import { ExpandableDescription } from './components/ExpandableDescription';
import RecommendationCard from './components/RecommendationCard';
import BookDetail from './components/BookDetail';
import ChatMessage from './components/ChatMessage';
import FormattedText from './components/FormattedText';
import FormattedRecommendations from './components/FormattedRecommendations';
import { getBookshopSearchUrl, getAmazonKindleUrl, getLibbyUrl, getLibroFmUrl, getAudibleUrl, getGoodreadsSearchUrl } from './lib/affiliateLinks';
import { themeInfo, themeDescriptions } from './lib/constants';
import { CATALOG_TITLE_INDEX, findCatalogBook } from './lib/catalogIndex';
import AuthModal from './components/AuthModal';
import LoadingFallback from './components/LoadingFallback';
import ErrorBoundary from './components/ErrorBoundary';
import Footer from './components/Footer';
import { useUser, useReadingQueue, useRecommendations } from './contexts';

// Lazy load heavy components
const UserProfile = lazy(() => import('./components/UserProfile'));
const AboutPage = lazy(() => import('./components/AboutPage'));
const MeetSarahPage = lazy(() => import('./components/MeetSarahPage'));
const BecomeCuratorPage = lazy(() => import('./components/BecomeCuratorPage'));
const CuratorThemesPage = lazy(() => import('./components/CuratorThemesPage'));
const ShopPage = lazy(() => import('./components/ShopPage'));
const MyCollectionPage = lazy(() => import('./components/MyCollectionPage'));
const MyBooksPage = lazy(() => import('./components/MyBooksPage'));
const MyReadingQueuePage = lazy(() => import('./components/MyReadingQueuePage'));
const MyRecommendationsPage = lazy(() => import('./components/MyRecommendationsPage'));
const OurPracticesPage = lazy(() => import('./components/OurPracticesPage'));
const OurMissionPage = lazy(() => import('./components/OurMissionPage'));
const SharedRecommendationPage = lazy(() => import('./components/SharedRecommendationPage'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

const BOOKSHOP_AFFILIATE_ID = '119544';
const AMAZON_AFFILIATE_TAG = 'sarahsbooks01-20';
const LIBRO_FM_AFFILIATE_ID = 'sarahsbooks'; // TODO: Replace with actual affiliate ID when available
const AUDIBLE_AFFILIATE_TAG = 'sarahsbooks01-20'; // Uses Amazon Associates
const CURRENT_YEAR = new Date().getFullYear();

// Text utilities imported from ./lib/textUtils
// CATALOG_TITLE_INDEX imported from ./lib/catalogIndex.js

// CSV parsing imported from ./lib/csvParser
// Library context builder imported from ./lib/libraryContext


// FormattedText extracted to ./components/FormattedText.jsx
// themeInfo and themeDescriptions imported from ./lib/constants.js

// parseRecommendations moved to recommendationService.js



// Components extracted to ./components/
// - RecommendationCard.jsx
// - FormattedRecommendations.jsx (includes RecommendationActionPanel)

// Affiliate links extracted to ./lib/affiliateLinks.js
// ChatMessage, BookDetail, FormattedText, FormattedRecommendations extracted to ./components/

function AboutSection({ onShare }) {
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
              I've always been the friend people call when they need a book recommendation. "Something that'll make me feel deeply," they say. Or "I need to escape but not too far." I get it—finding the right book at the right moment is a small kind of magic ✨.
            </p>
            <p>
              So I built this: a digital version of my bookshelves, searchable and powered by AI that knows my taste. It's a living library that grows as I read, with a discovery engine to help us both find what's next. And when you're ready to buy, I hope you'll support a local bookstore—they're the heartbeat of our communities.
            </p>
            <p className="text-[#7A8F6C] italic">
              Happy reading, friend. 📚
            </p>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="text-xs text-[#7A8F6C] font-light">
              Love this library? Share it with a friend.
            </div>
            <button
              onClick={onShare}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#5F7252] text-white text-sm font-medium hover:bg-[#4A5940] transition-colors w-full sm:w-auto"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { user, authLoading, showAuthModal, setShowAuthModal, signOut, isAdmin } = useUser();
  const { readingQueue, addToQueue, removeFromQueue, updateQueueStatus, refreshQueue } = useReadingQueue();
  const { recommendations } = useRecommendations();
  
  const [selectedBook, setSelectedBook] = useState(null);
  const [chatMode, setChatMode] = useState('library');
  const [hasEngaged, setHasEngaged] = useState(false);
  const [likedBooks, setLikedBooks] = useState([]);
  const [tasteProfile, setTasteProfile] = useState({
    likedBooks: [],
    likedThemes: [],
    likedAuthors: [],
    profile_photo_url: null
  });
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [importedLibrary, setImportedLibrary] = useState(null);
  const [importError, setImportError] = useState('');
  const [messages, setMessages] = useState([
    { text: "Browse collections below or tell me what you're looking for.", isUser: false }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ step: '', progress: 0 });
  const chatEndRef = useRef(null);
  const inFlightRequestRef = useRef(null);
  const importFileInputRef = useRef(null);
  const [shareFeedback, setShareFeedback] = useState('');
  const shareFeedbackTimeoutRef = useRef(null);
  const [feedbackStatus, setFeedbackStatus] = useState({
    isSendingThanks: false,
  });
  const [thanksCount, setThanksCount] = useState(null);
  const thanksCooldownRef = useRef(false);
  const [selectedThemes, setSelectedThemes] = useState([]);
  const [expandedTheme, setExpandedTheme] = useState(null);

  // Navigation helper to reduce duplication
  const navigateTo = useCallback((page, path) => {
    setCurrentPage(page);
    setShowNavMenu(false);
    window.scrollTo(0, 0);
    window.history.pushState({}, '', path);
  }, []);

  // Memoized queue counts for performance
  const queueCount = useMemo(() => 
    readingQueue.filter(item => item.status === 'want_to_read').length, 
    [readingQueue]
  );
  const collectionCount = useMemo(() => 
    readingQueue.filter(item => item.status === 'already_read').length, 
    [readingQueue]
  );

  // Shared className constants
  const MENU_BUTTON_CLASS = "w-full px-4 py-2.5 text-left text-sm text-[#4A5940] hover:bg-[#F8F6EE] transition-colors flex items-center gap-3";
  
  // Quick Access design - Option B selected
  const QUICK_ACCESS_STYLE = 'option-b';
  const [shownBooksInSession, setShownBooksInSession] = useState([]); // Track books shown to avoid repeats
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showSignInNudge, setShowSignInNudge] = useState(false);
  const [showThemeLists, setShowThemeLists] = useState(false);
  const [signInNudgeDismissed, setSignInNudgeDismissed] = useState(false);
  const attachmentMenuRef = useRef(null);
  const chatStorageKey = 'sarah_books_chat_history_v1';
  const lastActivityRef = useRef(Date.now());
  const sessionIdRef = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  // Navigation state
  const [currentPage, setCurrentPage] = useState('home');
  const [showNavMenu, setShowNavMenu] = useState(false);
  const navMenuRef = useRef(null);
  const [shareToken, setShareToken] = useState(null);

  // Listen for profile close event
  useEffect(() => {
    const handleCloseProfile = () => {
      setShowAuthModal(false);
    };
    window.addEventListener('closeProfile', handleCloseProfile);
    return () => window.removeEventListener('closeProfile', handleCloseProfile);
  }, []);

  // Handle browser back/forward navigation and referral tracking
  useEffect(() => {
    // Set initial page based on URL
    const getPageFromPath = (pathname) => {
      const pathParts = pathname.replace(/^\//, '').split('/');
      const path = pathParts[0] || 'home';
      
      // Handle shared recommendation URLs (/r/TOKEN)
      if (path === 'r' && pathParts[1]) {
        return { page: 'shared-recommendation', token: pathParts[1] };
      }
      
      const validPages = ['home', 'reading-queue', 'collection', 'my-books', 'add-books', 'recommendations', 'how-it-works', 'about', 'meet-sarah', 'shop', 'our-practices', 'become-curator', 'curator-themes', 'admin'];
      if (path === 'add-books') return { page: 'my-books', token: null };
      if (path === 'how-it-works') return { page: 'about', token: null };
      return { page: validPages.includes(path) ? path : 'home', token: null };
    };

    // Check for referral code in URL and store it
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      // Store referral code in localStorage for later use when user signs up
      localStorage.setItem('referral_code', refCode);
      // Clean up URL without losing the page
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }

    // Set initial page from URL on mount
    const { page: initialPage, token } = getPageFromPath(window.location.pathname);
    if (initialPage === 'shared-recommendation' && token) {
      setCurrentPage('shared-recommendation');
      setShareToken(token);
    } else if (initialPage !== 'home') {
      setCurrentPage(initialPage);
    }

    // Handle popstate (back/forward button)
    const handlePopState = () => {
      const { page, token } = getPageFromPath(window.location.pathname);
      if (page === 'shared-recommendation' && token) {
        setCurrentPage('shared-recommendation');
        setShareToken(token);
      } else {
        setCurrentPage(page);
        setShareToken(null);
      }
      window.scrollTo(0, 0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // systemPrompt no longer needed - handled in recommendationService

  // Memoize imported library overlap calculation
  const importedOverlap = useMemo(() => {
    if (!importedLibrary?.items?.length) return null;

    const libByTitle = new Map();
    const libByTitleAuthor = new Map();

    for (const b of bookCatalog) {
      const t = normalizeTitle(b?.title);
      const a = normalizeAuthor(b?.author);
      if (!t) continue;
      if (!libByTitle.has(t)) libByTitle.set(t, b);
      if (a) {
        const key = `${t}__${a}`;
        if (!libByTitleAuthor.has(key)) libByTitleAuthor.set(key, b);
      }
    }

    const shared = [];
    const seen = new Set();
    for (const it of importedLibrary.items) {
      const t = normalizeTitle(it?.title);
      const a = normalizeAuthor(it?.author);
      if (!t) continue;
      const key = a ? `${t}__${a}` : t;
      if (seen.has(key)) continue;
      seen.add(key);
      const match = (a && libByTitleAuthor.has(`${t}__${a}`)) ? libByTitleAuthor.get(`${t}__${a}`) : libByTitle.get(t);
      if (match) shared.push(match);
    }

    return { shared, total: importedLibrary.items.length };
  }, [importedLibrary]);

  // Performance measurement and session tracking
  useEffect(() => {
    const sessionStart = Date.now();
    
    // Measure initial load performance
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
      const firstPaint = timing.responseEnd - timing.navigationStart;
      
      // Track performance metrics
      track('performance_metrics', {
        load_time_ms: loadTime,
        dom_ready_ms: domReady,
        first_paint_ms: firstPaint,
        page: 'home'
      });
      
      // Log to console for debugging (dev only)
      if (import.meta.env.DEV) console.log('📊 Performance Metrics:', {
        'Total Load Time': `${loadTime}ms`,
        'DOM Ready': `${domReady}ms`,
        'First Paint': `${firstPaint}ms`
      });
    }
    
    // Track session start
    track('session_start', {
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      screen_width: window.innerWidth,
      screen_height: window.innerHeight
    });
    
    // Track session end on page unload
    const handleUnload = () => {
      const sessionDuration = Math.round((Date.now() - sessionStart) / 1000);
      track('session_end', {
        duration_seconds: sessionDuration,
        timestamp: new Date().toISOString()
      });
    };
    
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // Load taste profile when user changes
  useEffect(() => {
    const loadTasteProfile = async () => {
      if (!user) {
        setTasteProfile({ likedBooks: [], likedThemes: [], likedAuthors: [], profile_photo_url: null });
        return;
      }
      
      try {
        const { data: profile } = await db.getTasteProfile(user.id);
        if (profile) {
          setTasteProfile({
            likedBooks: profile.liked_books || [],
            likedThemes: profile.liked_themes || [],
            likedAuthors: profile.liked_authors || [],
            profile_photo_url: profile.profile_photo_url || null
          });
        }
      } catch (err) {
        console.error('Error loading taste profile:', err);
      }
    };
    
    loadTasteProfile();
  }, [user]);

  // Save taste profile to database when it changes (if user is logged in)
  useEffect(() => {
    if (user && tasteProfile.likedBooks.length > 0) {
      db.upsertTasteProfile(user.id, tasteProfile);
    }
  }, [user, tasteProfile]);

  const handleAuthSuccess = async () => {
    setShowAuthModal(false);
    // User and queue are now handled by contexts
    // Stay on current page after auth
  };

  const handleSignOut = async () => {
    await signOut();
    setTasteProfile({
      likedBooks: [],
      likedThemes: [],
      likedAuthors: []
    });
    setShowAuthModal(false);
  };

  const getInitialMessages = () => {
    return [{
      text: "Browse collections below or tell me what you're looking for.",
      isUser: false
    }];
  };

  const handleShowMoreLibrary = () => {
    // Stay in library mode, iterate with liked books as context
    const likedTitles = tasteProfile.likedBooks.map(b => b.title).join(', ');
    const message = `Show me more books like: ${likedTitles}`;
    
    setInputValue(message);
    setShowDiscoverModal(false);
    
    setTimeout(() => {
      const sendButton = document.querySelector('button[aria-label="Send message"]');
      if (sendButton) sendButton.click();
    }, 50);
  };

  const handleShowMoreWorld = () => {
    // Switch to discover mode with taste profile intelligence
    setChatMode('discover');
    setShowDiscoverModal(false);
    
    const context = `
Based on books I've liked:
${tasteProfile.likedBooks.map(b => `- ${b.title} by ${b.author}`).join('\n')}

Find similar books from beyond my library that match this taste profile.
    `.trim();
    
    setInputValue(context);
    
    setTimeout(() => {
      const sendButton = document.querySelector('button[aria-label="Send message"]');
      if (sendButton) sendButton.click();
    }, 50);
  };

  const handleAddToReadingQueue = useCallback(async (book) => {
    if (!user) {
      console.warn('handleAddToReadingQueue: No user logged in');
      setShowAuthModal(true);
      return false;
    }
    
    const title = String(book.title || book.book_title || '').trim();
    const author = String(book.author || book.book_author || '').trim();
    const description = String(book.description || '').trim();
    const why = String(book.why || '').trim();
    const status = book.status || 'want_to_read';
    
    if (import.meta.env.DEV) console.log('[handleAddToReadingQueue] Book data:', {
      title,
      author,
      description: description.substring(0, 50) + '...',
      why: why.substring(0, 50) + '...',
      status
    });
    
    if (!title) {
      console.error('Cannot add book without title:', book);
      return false;
    }
    
    const isDuplicate = readingQueue?.some(
      queueBook => normalizeTitle(queueBook.book_title) === normalizeTitle(title)
    );
    
    if (isDuplicate) {
      return true;
    }
    
    // Pass all available book data to the queue
    const result = await addToQueue({ 
      title, 
      author, 
      description, 
      why,
      status
    });
    
    if (!result.success) {
      alert('Failed to save book. Please try again.');
      return false;
    }
    
    return true;
  }, [user, readingQueue, addToQueue, setShowAuthModal]);

  const handleRemoveFromReadingQueue = useCallback(async (queueItemId) => {
    if (!user || !queueItemId) return false;
    
    const result = await removeFromQueue(queueItemId);
    return result.success;
  }, [user, removeFromQueue]);

  const handleNewConversation = () => {
    setMessages(getInitialMessages());
    setSelectedThemes([]);
    setShownBooksInSession([]); // Reset shown books on new conversation
    setInputValue('');
    setHasEngaged(false);
    setLikedBooks([]);
    
    // Generate new session ID for new conversation
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleNewSearch = () => {
    setMessages(getInitialMessages());
    setSelectedThemes([]);
    setShownBooksInSession([]); // Reset shown books on new search
    setInputValue('');
    lastActivityRef.current = Date.now();
    
    // Track new search event
    track('new_search_started', {
      chat_mode: chatMode,
      previous_message_count: messages.length
    });
  };

  // Improved chat scroll with mobile keyboard handling
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      });
    }
  }, [messages]);

  // Handle mobile keyboard resize
  useEffect(() => {
    const handleResize = () => {
      if (document.activeElement.tagName === 'INPUT' || 
          document.activeElement.tagName === 'TEXTAREA') {
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-clear chat after 30 minutes of inactivity
  useEffect(() => {
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    
    const checkInactivity = () => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT && messages.length > 2) {
        handleNewSearch();
      }
    };
    
    const intervalId = setInterval(checkInactivity, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, [messages.length]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target)) {
        setShowAttachmentMenu(false);
      }
      if (navMenuRef.current && !navMenuRef.current.contains(event.target)) {
        setShowNavMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('imported_goodreads_library_v1');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items)) {
        setImportedLibrary(parsed);
      }
    } catch (e) {
      void e;
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(chatStorageKey);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      const mode = parsed?.mode === 'discover' ? 'discover' : 'library';
      const byMode = parsed?.byMode && typeof parsed.byMode === 'object' ? parsed.byMode : {};

      const restored = Array.isArray(byMode?.[mode]) ? byMode[mode] : null;
      if (restored && restored.length) {
        setChatMode(mode);
        setMessages(restored);
      } else {
        setMessages(getInitialMessages());
      }
    } catch (e) {
      void e;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetch('/api/thanks')
      .then(r => r.json())
      .then(data => {
        if (!alive) return;
        const n = Number(data?.count);
        if (Number.isFinite(n)) setThanksCount(n);
      })
      .catch((e) => {
        void e;
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(chatStorageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      const byMode = parsed?.byMode && typeof parsed.byMode === 'object' ? parsed.byMode : {};

      const capped = Array.isArray(messages) ? messages.slice(-50) : [];
      const next = {
        mode: chatMode,
        byMode: {
          ...byMode,
          [chatMode]: capped,
        },
      };
      window.localStorage.setItem(chatStorageKey, JSON.stringify(next));
    } catch (e) {
      void e;
    }
  }, [messages, chatMode]);

  const handleImportGoodreadsCsv = async (file) => {
    setImportError('');
    if (!file) return;
    try {
      const text = await file.text();
      const items = parseGoodreadsCsv(text);
      if (!items.length) {
        setImportError('Could not find any books in that CSV. Make sure it is a Goodreads library export.');
        return;
      }

      const localTotal = bumpLocalMetric('goodreads_books_uploaded_total_v1', items.length);
      track('goodreads_csv_upload', {
        books_uploaded: items.length,
        total_books_uploaded_local: localTotal
      });

      const payload = {
        source: 'goodreads_csv',
        importedAt: Date.now(),
        items
      };
      setImportedLibrary(payload);
      window.localStorage.setItem('imported_goodreads_library_v1', JSON.stringify(payload));
    } catch (e) {
      void e;
      setImportError('Could not read that file. Please try exporting your Goodreads library again.');
    }
  };

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    
    // Validate input
    try {
      validateMessage({ message: userMessage });
    } catch (error) {
      setMessages(prev => [...prev, {
        text: "Please enter a valid message (max 1000 characters).",
        isUser: false
      }]);
      return;
    }

    // Smart theme clearing: If user typed a custom query (not the auto-generated theme text),
    // clear the theme filter so routing works correctly
    // Generate theme texts dynamically from themeInfo to stay in sync
    const themeTexts = Object.values(themeInfo).map(info => 
      `Show me options in ${info.label.toLowerCase()}.`
    );
    const isThemeQuery = themeTexts.some(t => userMessage.toLowerCase() === t.toLowerCase());
    
    // Determine effective themes for this request
    const effectiveThemes = isThemeQuery ? selectedThemes : [];
    
    // Clear theme selection if user typed a different query
    if (!isThemeQuery && selectedThemes.length > 0) {
      setSelectedThemes([]);
      console.log('[App] Cleared theme filter - user typed custom query');
    }

    setInputValue('');
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setIsLoading(true);
    
    // Determine loading mode based on query type
    const isCuratedList = effectiveThemes && effectiveThemes.length > 0;
    const loadingMode = isCuratedList ? 'catalog' : 'full';
    setLoadingProgress({ step: 'library', progress: 0, mode: loadingMode });
    lastActivityRef.current = Date.now();

    track('chat_message', {
      mode: chatMode,
      message_length: userMessage.length
    });

    try {
      // Update progress based on routing mode
      if (isCuratedList) {
        // Catalog-only: library → preparing (no world search)
        setTimeout(() => setLoadingProgress({ step: 'preparing', progress: 50, mode: 'catalog' }), 400);
      } else {
        // Full search: library → world → matching → preparing
        setTimeout(() => setLoadingProgress({ step: 'world', progress: 50, mode: 'full' }), 500);
        setTimeout(() => setLoadingProgress({ step: 'matching', progress: 0, mode: 'full' }), 1000);
      }

      // NEW CLEAN RECOMMENDATION SERVICE
      const result = await getRecommendations(user?.id, userMessage, readingQueue, effectiveThemes, shownBooksInSession);
      
      if (!result.success) {
        setMessages(prev => [...prev, {
          text: result.error || "I'm having trouble thinking right now. Could you try again?",
          isUser: false
        }]);
        return;
      }

      // Update progress: preparing recommendations
      setLoadingProgress(prev => ({ ...prev, step: 'preparing', progress: 100 }));
      
      // FAST PATH: Skip post-processing for:
      // - Curated lists (fastPath)
      // - World fallback (worldFallback)  
      // - World path using Claude knowledge (skipPostProcessing)
      if (result.fastPath || result.worldFallback || result.skipPostProcessing) {
        console.log('[App] Skipping post-processing for:', result.fastPath ? 'fastPath' : result.worldFallback ? 'worldFallback' : 'worldPath');
        // Track shown books for pagination (avoid repeats on "Show me more")
        if (result.shownBooks && result.shownBooks.length > 0) {
          setShownBooksInSession(prev => [...prev, ...result.shownBooks]);
        }
        setMessages(prev => [...prev, { text: result.text, isUser: false }]);
        return;
      }
      
      // POST-AI FILTERING: Remove duplicates and excluded books
      let cleanedText = result.text;
      const exclusionList = result.exclusionList || [];
      const verifiedBookData = result.verifiedBookData || null;
      let recs = parseRecommendations(result.text);
      
      // If we have verified book data, merge it into the first recommendation
      // This ensures the correct title, author, and description are used
      if (verifiedBookData && recs.length > 0) {
        const firstRec = recs[0];
        // Only merge if the titles are similar (Claude may have used the verified data)
        const verifiedNorm = normalizeTitle(verifiedBookData.title);
        const firstNorm = normalizeTitle(firstRec.title);
        if (verifiedNorm === firstNorm || firstNorm.includes(verifiedNorm) || verifiedNorm.includes(firstNorm)) {
          recs[0] = {
            ...firstRec,
            title: verifiedBookData.title, // Use exact verified title
            author: verifiedBookData.author, // Use exact verified author
            description: verifiedBookData.description || firstRec.description, // Use verified description
            isbn: verifiedBookData.isbn,
            coverUrl: verifiedBookData.coverUrl,
            verified: true // Flag to skip enrichment
          };
          if (import.meta.env.DEV) console.log('[Verified] Merged verified book data:', verifiedBookData.title);
        }
      }
      
      // Remove duplicates (case-insensitive title matching)
      const seenTitles = new Set();
      const uniqueRecs = recs.filter(rec => {
        const normalizedTitle = normalizeTitle(rec.title);
        if (seenTitles.has(normalizedTitle)) {
          if (import.meta.env.DEV) console.log('[Filter] Removed duplicate:', rec.title);
          return false;
        }
        seenTitles.add(normalizedTitle);
        return true;
      });
      
      // Filter out books in exclusion list
      const validRecs = uniqueRecs.filter(rec => {
        const isExcluded = exclusionList.some(excludedTitle => 
          normalizeTitle(excludedTitle) === normalizeTitle(rec.title)
        );
        
        if (isExcluded) {
          if (import.meta.env.DEV) console.log('[Filter] Removed excluded book:', rec.title);
          return false;
        }
        return true;
      });
      
      // Rebuild response if we filtered anything out
      if (validRecs.length < recs.length) {
        if (validRecs.length === 0) {
          cleanedText = "I'm having trouble finding books that aren't already in your collection. Try asking for something more specific or from a different genre!";
        } else {
          // Dynamic header based on count
          const header = validRecs.length === 1 
            ? 'My Top Pick for You' 
            : validRecs.length === 2 
              ? 'My Top 2 Picks for You'
              : 'My Top 3 Picks for You';
          
          // Rebuild with valid recommendations only
          const parts = [header + '\n'];
          validRecs.forEach((rec, i) => {
            parts.push(`\n[RECOMMENDATION ${i + 1}]`);
            parts.push(`Title: ${rec.title}`);
            if (rec.author) parts.push(`Author: ${rec.author}`);
            if (rec.why) parts.push(`Why This Fits: ${rec.why}`);
            if (rec.description) parts.push(`Description: ${rec.description}`);
            if (rec.reputation) parts.push(`Reputation: ${rec.reputation}`);
          });
          cleanedText = parts.join('\n');
        }
      }
      
      // Strip verbose intro text, keep only header and recommendations
      // Also make header dynamic based on actual recommendation count
      const lines = cleanedText.split('\n');
      const startIndex = lines.findIndex(line => 
        line.includes('My Top') && line.includes('Pick')
      );
      if (startIndex > 0) {
        cleanedText = lines.slice(startIndex).join('\n');
      }
      
      // Final pass: ensure header matches actual count
      const finalRecs = parseRecommendations(cleanedText);
      if (finalRecs.length === 1 && cleanedText.includes('My Top 3 Picks')) {
        cleanedText = cleanedText.replace('My Top 3 Picks for You', 'My Top Pick for You');
      } else if (finalRecs.length === 2 && cleanedText.includes('My Top 3 Picks')) {
        cleanedText = cleanedText.replace('My Top 3 Picks for You', 'My Top 2 Picks for You');
      }
      
      setMessages(prev => [...prev, { text: cleanedText, isUser: false }]);
      
      // Show sign-in nudge for non-signed-in users after first recommendation
      if (!user && !signInNudgeDismissed && messages.length >= 1) {
        setShowSignInNudge(true);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        text: "Oops, I'm having a moment. Let me catch my breath and try again!",
        isUser: false
      }]);
    } finally {
      setIsLoading(false);
      setLoadingProgress({ step: '', progress: 0 });
    }
  }, [inputValue, isLoading, chatMode, messages, user, signInNudgeDismissed]);

  const handleShare = async () => {
    const url = (typeof window !== 'undefined' && window.location?.href) ? window.location.href : '';
    const title = "Sarah's Books";
    const text = "I thought you’d like Sarah’s Library — ask for book recommendations from her shelves.";

    track('share_click', { source: 'chat' });

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title, text, url });
        track('share_success', { method: 'web_share', source: 'chat' });
        setShareFeedback('Shared!');
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        track('share_success', { method: 'clipboard', source: 'chat' });
        setShareFeedback('Link copied!');
      } else {
        // Last-resort fallback: prompt copy.
        window.prompt('Copy this link to share:', url);
        track('share_success', { method: 'prompt', source: 'chat' });
        setShareFeedback('Link ready to copy.');
      }
    } catch (e) {
      void e;
      track('share_error', { source: 'chat' });
      setShareFeedback('Couldn’t share—try copying the URL.');
    } finally {
      if (shareFeedbackTimeoutRef.current) clearTimeout(shareFeedbackTimeoutRef.current);
      shareFeedbackTimeoutRef.current = setTimeout(() => setShareFeedback(''), 2500);
    }
  };

  const handleSendHeart = () => {
    const url = (typeof window !== 'undefined' && window.location?.href) ? window.location.href : '';
    if (feedbackStatus.isSendingThanks) return;
    if (thanksCooldownRef.current) return;
    thanksCooldownRef.current = true;
    setTimeout(() => { thanksCooldownRef.current = false; }, 1200);

    track('thanks_heart_click', { source: 'chat' });
    track('thanks_heart_send', { method: 'backend', source: 'chat' });

    setThanksCount(prev => (typeof prev === 'number' ? prev + 1 : prev));
    fetch('/api/thanks', { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        const n = Number(data?.count);
        if (Number.isFinite(n)) setThanksCount(n);
      })
      .catch((e) => {
        void e;
      });

    void url;
    setFeedbackStatus(s => ({ ...s, isSendingThanks: true }));
    setTimeout(() => setFeedbackStatus(s => ({ ...s, isSendingThanks: false })), 700);
  };

  return (
    <div className="min-h-screen font-sans" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)', fontFamily: "'Poppins', sans-serif" }}>
      <Analytics />
      <header className="bg-[#FDFBF4]/90 backdrop-blur-md border-b border-[#D4DAD0] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Hamburger Menu - for all users */}
              {
                <div className="relative" ref={navMenuRef}>
                  <button
                    onClick={() => setShowNavMenu(!showNavMenu)}
                    className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg border border-[#D4DAD0] bg-white hover:bg-[#F8F6EE] transition-colors"
                    aria-label="Navigation menu"
                    aria-expanded={showNavMenu}
                  >
                    <Menu className="w-5 h-5 text-[#5F7252]" />
                  </button>
                  
                  {showNavMenu && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-lg border border-[#E8EBE4] shadow-lg py-1 min-w-[220px] z-50">
                      {/* Home */}
                      <button onClick={() => navigateTo('home', '/')} className={MENU_BUTTON_CLASS}>
                        <Home className="w-4 h-4" />
                        Home
                      </button>
                      
                      {/* How It Works */}
                      <button onClick={() => navigateTo('about', '/how-it-works')} className={MENU_BUTTON_CLASS}>
                        <BookOpen className="w-4 h-4" />
                        How It Works
                      </button>
                      
                      {/* Meet Sarah */}
                      <button onClick={() => navigateTo('meet-sarah', '/meet-sarah')} className={MENU_BUTTON_CLASS}>
                        <Heart className="w-4 h-4" />
                        Meet Sarah
                      </button>
                      
                      {user && (
                        <>
                          {/* MY BOOKS Section */}
                          <div className="border-t border-[#E8EBE4] my-1"></div>
                          <div className="px-4 py-2 text-xs font-medium text-[#96A888] uppercase tracking-wide">
                            My Books
                          </div>
                          <button onClick={() => navigateTo('reading-queue', '/reading-queue')} className={MENU_BUTTON_CLASS}>
                            <BookMarked className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1">My Queue</span>
                            {queueCount > 0 && (
                              <span className="flex-shrink-0 min-w-[20px] h-5 text-[10px] font-medium bg-[#5F7252] text-white rounded-full flex items-center justify-center">
                                {queueCount}
                              </span>
                            )}
                          </button>
                          <button onClick={() => navigateTo('collection', '/collection')} className={MENU_BUTTON_CLASS}>
                            <Library className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1">My Collection</span>
                            {collectionCount > 0 && (
                              <span className="flex-shrink-0 min-w-[20px] h-5 text-[10px] font-medium bg-[#5F7252] text-white rounded-full flex items-center justify-center">
                                {collectionCount}
                              </span>
                            )}
                          </button>
                        </>
                      )}
                      
                      {/* Add Books - available to all */}
                      <button onClick={() => navigateTo('my-books', '/add-books')} className={MENU_BUTTON_CLASS}>
                        <Upload className="w-4 h-4" />
                        Add Books
                      </button>
                      
                      {user && (
                        <>
                          {/* MY RECOMMENDATIONS Section */}
                          <div className="border-t border-[#E8EBE4] my-1"></div>
                          <div className="px-4 py-2 text-xs font-medium text-[#96A888] uppercase tracking-wide">
                            My Recommendations
                          </div>
                          <button onClick={() => navigateTo('recommendations', '/recommendations')} className={MENU_BUTTON_CLASS}>
                            <Share2 className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1">Books I've Shared</span>
                            {recommendations.length > 0 && (
                              <span className="flex-shrink-0 min-w-[20px] h-5 text-[10px] font-medium bg-[#5F7252] text-white rounded-full flex items-center justify-center">
                                {recommendations.length}
                              </span>
                            )}
                          </button>
                          
                          {/* Profile & Sign Out */}
                          <div className="border-t border-[#E8EBE4] my-1"></div>
                          <button
                            onClick={() => {
                              setShowAuthModal(true);
                              setShowNavMenu(false);
                            }}
                            className={MENU_BUTTON_CLASS}
                          >
                            <UserIcon className="w-4 h-4" />
                            Profile
                          </button>
                          
                          {/* Admin Dashboard - only for master admin */}
                          {(isAdmin || user?.email === 'sarah@darkridge.com') && (
                            <>
                              <div className="border-t border-[#E8EBE4] my-1"></div>
                              <button onClick={() => navigateTo('admin', '/admin')} className={MENU_BUTTON_CLASS}>
                                <BarChart3 className="w-4 h-4" />
                                Admin Dashboard
                              </button>
                            </>
                          )}
                        </>
                      )}
                      </div>
                  )}
                </div>
              }
              
              {/* Logo + Title */}
              <button 
                onClick={() => navigateTo('home', '/')}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div>
                  <h1 className="font-serif text-lg sm:text-2xl text-[#4A5940]">Sarah's Books</h1>
                  <p className="text-xs text-[#7A8F6C] font-light tracking-wide flex items-center gap-1">For the <Heart className="w-3 h-3 fill-[#c96b6b] text-[#c96b6b] inline" /> of reading</p>
                </div>
              </button>
            </div>
            
            {/* Right: Profile/Sign In */}
            <div className="flex items-center gap-2 sm:gap-4">
              {user ? (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-full bg-white/50 backdrop-blur-sm border-2 border-[#E8EBE4] hover:border-[#5F7252] text-[#4A5940] transition-all shadow-sm max-w-[140px] sm:max-w-none"
                  title="View profile"
                >
                  {tasteProfile.profile_photo_url ? (
                    <img 
                      src={tasteProfile.profile_photo_url} 
                      alt="Profile"
                      className="w-6 h-6 rounded-full object-cover border-2 border-[#E8EBE4] flex-shrink-0"
                    />
                  ) : (
                    <UserIcon className="w-4 h-4 flex-shrink-0 text-[#5F7252]" />
                  )}
                  <span className="text-xs sm:text-sm font-medium truncate">
                    {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Profile'}
                  </span>
                </button>
              ) : authLoading ? (
                <div className="inline-flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-full bg-[#96A888] text-white">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="hidden sm:inline ml-2 text-sm font-medium">Loading...</span>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="inline-flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-full bg-[#5F7252] text-white hover:bg-[#4A5940] transition-all"
                  title="Sign in"
                >
                  <UserIcon className="w-4 h-4" />
                  <span className="hidden sm:inline ml-2 text-sm font-medium">Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Page Routing */}
      {currentPage === 'about' && (
        <Suspense fallback={<LoadingFallback message="Loading How It Works..." />}>
          <AboutPage onNavigate={setCurrentPage} user={user} />
        </Suspense>
      )}

      {currentPage === 'meet-sarah' && (
        <Suspense fallback={<LoadingFallback message="Loading Meet Sarah..." />}>
          <MeetSarahPage onNavigate={setCurrentPage} />
        </Suspense>
      )}

      {currentPage === 'become-curator' && (
        <Suspense fallback={<LoadingFallback message="Loading..." />}>
          <BecomeCuratorPage onNavigate={setCurrentPage} />
        </Suspense>
      )}

      {currentPage === 'curator-themes' && (
        <Suspense fallback={<LoadingFallback message="Loading..." />}>
          <CuratorThemesPage onNavigate={setCurrentPage} />
        </Suspense>
      )}
      
      {currentPage === 'shop' && (
        <Suspense fallback={<LoadingFallback message="Loading Shop..." />}>
          <ShopPage onNavigate={setCurrentPage} />
        </Suspense>
      )}

      {currentPage === 'our-practices' && (
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback message="Loading..." />}>
            <OurPracticesPage onNavigate={setCurrentPage} />
          </Suspense>
        </ErrorBoundary>
      )}

      {currentPage === 'our-mission' && (
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback message="Loading..." />}>
            <OurMissionPage onNavigate={setCurrentPage} />
          </Suspense>
        </ErrorBoundary>
      )}

      {currentPage === 'admin' && (isAdmin || user?.email === 'sarah@darkridge.com') && (
        <Suspense fallback={<LoadingFallback message="Loading Admin Dashboard..." />}>
          <AdminDashboard onNavigate={setCurrentPage} />
        </Suspense>
      )}

      {currentPage === 'shared-recommendation' && shareToken && (
        <Suspense fallback={<LoadingFallback message="Loading recommendation..." />}>
          <SharedRecommendationPage 
            shareToken={shareToken}
            onNavigate={setCurrentPage}
            onShowAuthModal={() => setShowAuthModal(true)}
          />
        </Suspense>
      )}
      
      {currentPage === 'collection' && (
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback message="Loading My Collection..." />}>
            <MyCollectionPage 
              onNavigate={setCurrentPage}
              user={user}
              onShowAuthModal={() => setShowAuthModal(true)}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {currentPage === 'my-books' && (
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback message="Loading Add Books..." />}>
            <MyBooksPage 
              onNavigate={setCurrentPage}
              user={user}
              onShowAuthModal={() => setShowAuthModal(true)}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {currentPage === 'reading-queue' && (
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback message="Loading Reading Queue..." />}>
            <MyReadingQueuePage 
              onNavigate={setCurrentPage}
              user={user}
              onShowAuthModal={() => setShowAuthModal(true)}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {currentPage === 'recommendations' && (
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback message="Loading My Recommendations..." />}>
            <MyRecommendationsPage 
              onNavigate={setCurrentPage}
              user={user}
              onShowAuthModal={() => setShowAuthModal(true)}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {currentPage === 'home' && (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-y-auto">
          {/* Hero Image - only show when no conversation yet */}
          {messages.length <= 1 && (
            <div className="mb-6 rounded-2xl overflow-hidden shadow-lg">
              <img
                src="/books.jpg"
                alt="Cozy reading atmosphere"
                loading="lazy"
                className="block w-full h-[clamp(100px,14vh,180px)] object-cover object-center"
              />
            </div>
          )}

          {/* Header - only show when no conversation yet */}
          {messages.length <= 1 && (
            <div className="mb-6 text-center">
              <h1 className="font-serif text-2xl sm:text-3xl text-[#4A5940] mb-2">
                {user ? `Welcome back${user.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}!` : 'What should I read next?'}
              </h1>
              <p className="text-sm text-[#7A8F6C]">
                {user ? 'Ready to find your next great read?' : 'Curated by a real reader, intelligently matched to you'}
              </p>
            </div>
          )}

          {/* My Books Section - logged in users only */}
          {messages.length <= 1 && user && (queueCount > 0 || collectionCount > 0) && (
            <div className="mb-6 bg-[#F8F6EE] rounded-2xl border border-[#D4DAD0] p-4">
              <h2 className="text-xs font-semibold text-[#4A5940] mb-3 text-center uppercase tracking-wide">My Books</h2>
              {/* OPTION A: Compact Inline Pills */}
              {QUICK_ACCESS_STYLE === 'option-a' && (
                <div className="mb-6 flex items-center justify-center gap-3 flex-wrap">
                  {queueCount > 0 && (
                    <button 
                      onClick={() => navigateTo('queue', '/reading-queue')}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F8F6EE] hover:bg-[#E8EBE4] border border-[#D4DAD0] rounded-full text-xs font-medium text-[#4A5940] transition-colors"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>My Queue</span>
                      <span className="ml-0.5 px-1.5 py-0.5 bg-[#5F7252] text-white rounded-full text-[10px] font-semibold">{queueCount}</span>
                    </button>
                  )}
                  <button 
                    onClick={() => navigateTo('collection', '/collection')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F8F6EE] hover:bg-[#E8EBE4] border border-[#D4DAD0] rounded-full text-xs font-medium text-[#4A5940] transition-colors"
                  >
                    <Library className="w-3.5 h-3.5" />
                    <span>My Collection</span>
                    <span className="ml-0.5 px-1.5 py-0.5 bg-[#5F7252] text-white rounded-full text-[10px] font-semibold">{collectionCount}</span>
                  </button>
                </div>
              )}

              {/* OPTION B: Compact Pills with Clickable Selected State */}
              {QUICK_ACCESS_STYLE === 'option-b' && (
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {queueCount > 0 && (
                    <button 
                      onClick={() => navigateTo('reading-queue', '/reading-queue')}
                      className={`inline-flex items-center gap-2 px-4 py-2 border-2 rounded-full text-sm font-medium transition-all ${
                        currentPage === 'reading-queue'
                          ? 'bg-[#b08080] border-[#8B6F6F] text-white shadow-lg'
                          : 'bg-[#F8F6EE]/50 border-[#E8EBE4] text-[#4A5940] hover:border-[#b08080] hover:shadow-md'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${currentPage === 'reading-queue' ? 'text-white' : 'text-[#b08080]'}`} />
                      <span>Queue</span>
                      <span className={`ml-1 min-w-[20px] h-5 px-2 rounded-full text-xs font-semibold flex items-center justify-center ${
                        currentPage === 'reading-queue' ? 'bg-white/20 text-white' : 'bg-[#b08080] text-white'
                      }`}>{queueCount}</span>
                    </button>
                  )}
                  <button 
                    onClick={() => navigateTo('collection', '/collection')}
                    className={`inline-flex items-center gap-2 px-4 py-2 border-2 rounded-full text-sm font-medium transition-all ${
                      currentPage === 'collection'
                        ? 'bg-[#b08080] border-[#8B6F6F] text-white shadow-lg'
                        : 'bg-[#F8F6EE]/50 border-[#E8EBE4] text-[#4A5940] hover:border-[#b08080] hover:shadow-md'
                    }`}
                  >
                    <Library className={`w-4 h-4 ${currentPage === 'collection' ? 'text-white' : 'text-[#b08080]'}`} />
                    <span>Collection</span>
                    <span className={`ml-1 min-w-[20px] h-5 px-2 rounded-full text-xs font-semibold flex items-center justify-center ${
                      currentPage === 'collection' ? 'bg-white/20 text-white' : 'bg-[#b08080] text-white'
                    }`}>{collectionCount}</span>
                  </button>
                </div>
              )}

              {/* OPTION C: Text Links with Badges - Improved Clickability */}
              {QUICK_ACCESS_STYLE === 'option-c' && (
                <div className="mb-6 flex items-center justify-center gap-6 text-sm">
                  {queueCount > 0 && (
                    <button 
                      onClick={() => navigateTo('reading-queue', '/reading-queue')}
                      className="inline-flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] font-medium transition-all hover:underline underline-offset-4 decoration-2 cursor-pointer"
                    >
                      <Bookmark className="w-4 h-4" />
                      <span>My Queue</span>
                      <span className="ml-1 min-w-[20px] h-5 px-1.5 bg-[#5F7252] text-white rounded-full text-xs font-semibold flex items-center justify-center">{queueCount}</span>
                    </button>
                  )}
                  <button 
                    onClick={() => navigateTo('collection', '/collection')}
                    className="inline-flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] font-medium transition-all hover:underline underline-offset-4 decoration-2 cursor-pointer"
                  >
                    <Library className="w-4 h-4" />
                    <span>My Collection</span>
                    <span className="ml-1 min-w-[20px] h-5 px-1.5 bg-[#5F7252] text-white rounded-full text-xs font-semibold flex items-center justify-center">{collectionCount}</span>
                  </button>
                </div>
              )}

              {/* OPTION D: Single Row Compact Cards */}
              {QUICK_ACCESS_STYLE === 'option-d' && (
                <div className="mb-6 flex items-center justify-center gap-3">
                  {queueCount > 0 && (
                    <button 
                      onClick={() => navigateTo('reading-queue', '/reading-queue')}
                      className="flex flex-col items-center gap-1.5 px-4 py-3 bg-white hover:bg-[#F8F6EE] border border-[#E8EBE4] hover:border-[#5F7252] rounded-xl text-sm transition-all shadow-sm hover:shadow-md"
                    >
                      <Bookmark className="w-4 h-4 text-[#5F7252]" />
                      <div className="text-[10px] text-[#7A8F6C] font-medium">My Queue</div>
                      <div className="text-lg font-bold text-[#4A5940]">{queueCount}</div>
                    </button>
                  )}
                  <button 
                    onClick={() => navigateTo('collection', '/collection')}
                    className="flex flex-col items-center gap-1.5 px-4 py-3 bg-white hover:bg-[#F8F6EE] border border-[#E8EBE4] hover:border-[#5F7252] rounded-xl text-sm transition-all shadow-sm hover:shadow-md"
                  >
                    <Library className="w-4 h-4 text-[#5F7252]" />
                    <div className="text-[10px] text-[#7A8F6C] font-medium">My Collection</div>
                    <div className="text-lg font-bold text-[#4A5940]">{collectionCount}</div>
                  </button>
                </div>
              )}

              {/* OPTION E: Dusty Rose Accent - Text Links */}
              {QUICK_ACCESS_STYLE === 'option-e' && (
                <div className="mb-6 flex items-center justify-center gap-6 text-sm">
                  {queueCount > 0 && (
                    <button 
                      onClick={() => navigateTo('reading-queue', '/reading-queue')}
                      className="inline-flex items-center gap-2 text-[#8B6F6F] hover:text-[#6B4F4F] font-medium transition-all hover:underline underline-offset-4 decoration-2 cursor-pointer"
                    >
                      <Bookmark className="w-4 h-4" />
                      <span>My Queue</span>
                      <span className="ml-1 min-w-[20px] h-5 px-1.5 bg-[#c96b6b] text-white rounded-full text-xs font-semibold flex items-center justify-center">{queueCount}</span>
                    </button>
                  )}
                  <button 
                    onClick={() => navigateTo('collection', '/collection')}
                    className="inline-flex items-center gap-2 text-[#8B6F6F] hover:text-[#6B4F4F] font-medium transition-all hover:underline underline-offset-4 decoration-2 cursor-pointer"
                  >
                    <Library className="w-4 h-4" />
                    <span>My Collection</span>
                    <span className="ml-1 min-w-[20px] h-5 px-1.5 bg-[#c96b6b] text-white rounded-full text-xs font-semibold flex items-center justify-center">{collectionCount}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Curator Theme Cards - Grid Layout */}
          {messages.length <= 1 && (
            <>
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-[#4A5940] mb-3 text-center">Browse by Theme</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(themeInfo).map(([key, info]) => {
                    const isSelected = selectedThemes.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedThemes([]);
                            setInputValue('');
                            track('theme_filter_removed', { theme: key, theme_label: info.label });
                          } else {
                            setSelectedThemes([key]);
                            const themeText = `Show me options in ${info.label.toLowerCase()}.`;
                            setInputValue(themeText);
                            track('theme_filter_selected', { theme: key, theme_label: info.label, chat_mode: chatMode });
                          }
                        }}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          isSelected 
                            ? 'bg-[#5F7252] border-[#4A5940] shadow-lg scale-[1.02]' 
                            : 'bg-[#F8F6EE]/50 border-[#E8EBE4] hover:border-[#5F7252] hover:shadow-md'
                        }`}
                        aria-label={`${info.label} collection`}
                        aria-pressed={isSelected}
                      >
                        {info.icon && <info.icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-[#5F7252]'}`} />}
                        <span className={`text-xs font-medium text-center leading-tight ${
                          isSelected ? 'text-white' : 'text-[#4A5940]'
                        }`}>
                          {info.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Genre Search Section */}
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-[#4A5940] mb-3 text-center">Search by Genre</h2>
                <div className="flex flex-wrap justify-center gap-2">
                  {['Literary Fiction', 'Historical Fiction', 'Memoir', 'Mystery', 'Thriller', 'Romance'].map((genre) => (
                    <button
                      key={genre}
                      onClick={() => {
                        const genreText = `Show me ${genre.toLowerCase()} books.`;
                        setInputValue(genreText);
                        track('genre_search', { genre });
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-[#F8F6EE]/50 text-[#5F7252] border border-[#E8EBE4] rounded-full hover:bg-[#5F7252] hover:text-white hover:border-[#5F7252] transition-all"
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-[#E8EBE4]"></div>
                <span className="text-xs text-[#96A888]">or tell me what you're looking for</span>
                <div className="flex-1 h-px bg-[#E8EBE4]"></div>
              </div>
            </>
          )}

          {/* Chat messages - only show after user engages */}
          {messages.length > 1 && (
          <div className="mb-3 min-h-[100px] overflow-y-auto rounded-xl bg-[#F8F6EE]/50 border border-[#E8EBE4] p-3" role="log" aria-live="polite" aria-label="Chat conversation">
            {messages.map((msg, idx) => (
              <ChatMessage 
                key={idx} 
                message={msg.text} 
                isUser={msg.isUser} 
                messageIndex={idx}
                chatMode={chatMode}
                onActionPanelInteraction={(action, data, recommendations) => {
                  if (action === 'feedback') {
                    track('recommendation_feedback_panel', {
                      feedback_type: data,
                      chat_mode: chatMode,
                      recommendation_count: recommendations.length
                    });
                    if (data === 'like' && chatMode === 'library') {
                      setHasEngaged(true);
                      setLikedBooks(recommendations.map(r => ({ title: r.title, author: r.author })));
                      // Build taste profile
                      const newThemes = extractThemes(recommendations);
                      setTasteProfile(prev => ({
                        likedBooks: [...prev.likedBooks, ...recommendations.map(r => ({ title: r.title, author: r.author }))],
                        likedThemes: [...new Set([...prev.likedThemes, ...newThemes])],
                        likedAuthors: [...new Set([...prev.likedAuthors, ...recommendations.map(r => r.author).filter(Boolean)])]
                      }));
                    }
                  } else if (action === 'find_book') {
                    // Open all recommended books in tabs
                    recommendations.forEach(rec => {
                      const url = data === 'goodreads' 
                        ? getGoodreadsSearchUrl(rec.title, rec.author)
                        : getBookshopSearchUrl(rec.title, rec.author);
                      window.open(url, '_blank');
                    });
                    track('find_books_action', {
                      destination: data,
                      book_count: recommendations.length,
                      chat_mode: chatMode
                    });
                  } else if (action === 'show_more') {
                    // Direct "show more" - use the recommended books as context
                    const titles = recommendations.map(r => r.title).join(', ');
                    setInputValue(`Show me more books like: ${titles}`);
                    setTimeout(() => {
                      const sendButton = document.querySelector('button[aria-label="Send message"]');
                      if (sendButton) sendButton.click();
                    }, 50);
                    track('show_more_clicked', {
                      recommendation_count: recommendations.length
                    });
                  } else if (action === 'upload_library') {
                    // Trigger the file input click
                    setImportError('');
                    importFileInputRef.current?.click();
                    track('upload_library_prompt', {
                      source: 'negative_feedback',
                      chat_mode: chatMode
                    });
                  }
                }}
                user={user}
                readingQueue={readingQueue}
                userRecommendations={recommendations}
                onAddToQueue={handleAddToReadingQueue}
                onRemoveFromQueue={handleRemoveFromReadingQueue}
                onShowAuthModal={() => setShowAuthModal(true)}
              />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <img 
                  src="/sarah.png" 
                  alt="Sarah"
                  className="w-10 h-10 rounded-full object-cover mr-3 border-2 border-[#D4DAD0] flex-shrink-0"
                />
                <div className="bg-[#F8F6EE] rounded-2xl rounded-bl-sm px-5 py-4 border border-[#E8EBE4] min-w-[280px]">
                  <div className="space-y-2.5">
                    {/* Catalog-only mode: simpler steps */}
                    {loadingProgress.mode === 'catalog' ? (
                      <>
                        {/* Searching my collection */}
                        <div className="flex items-center gap-2">
                          {loadingProgress.step === 'library' ? (
                            <div className="w-4 h-4 border-2 border-[#96A888] border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-[#5F7252] flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                          <span className={`text-xs ${loadingProgress.step === 'library' ? 'text-[#5F7252] font-medium' : 'text-[#96A888]'}`}>
                            Searching my collection
                          </span>
                        </div>
                        {/* Preparing picks */}
                        {loadingProgress.step === 'preparing' && (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-[#96A888] border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-[#5F7252] font-medium">
                              Preparing your picks
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Full mode: Library Check */}
                        <div className="flex items-center gap-2">
                          {loadingProgress.step === 'library' && loadingProgress.progress < 100 ? (
                            <div className="w-4 h-4 border-2 border-[#96A888] border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-[#5F7252] flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                          <span className={`text-xs ${loadingProgress.step === 'library' && loadingProgress.progress < 100 ? 'text-[#5F7252] font-medium' : 'text-[#96A888]'}`}>
                            Checking curator's picks
                          </span>
                        </div>

                        {/* World Search */}
                        {(loadingProgress.step === 'world' || loadingProgress.step === 'matching' || loadingProgress.step === 'preparing') && (
                          <div className="flex items-center gap-2">
                            {loadingProgress.step === 'world' ? (
                              <div className="w-4 h-4 border-2 border-[#96A888] border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-[#5F7252] flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                            <span className={`text-xs ${loadingProgress.step === 'world' ? 'text-[#5F7252] font-medium' : 'text-[#96A888]'}`}>
                              Searching the world's library
                            </span>
                          </div>
                        )}

                        {/* Finding Best Matches */}
                        {(loadingProgress.step === 'matching' || loadingProgress.step === 'preparing') && (
                          <div className="flex items-center gap-2">
                            {loadingProgress.step === 'matching' ? (
                              <div className="w-4 h-4 border-2 border-[#96A888] border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-[#5F7252] flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                            <span className={`text-xs ${loadingProgress.step === 'matching' ? 'text-[#5F7252] font-medium' : 'text-[#96A888]'}`}>
                              Finding your best matches
                            </span>
                          </div>
                        )}

                        {/* Preparing */}
                        {loadingProgress.step === 'preparing' && (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-[#96A888] border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-[#5F7252] font-medium">
                              Preparing your picks
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          )}

          {/* Sign-In Nudge Banner - Shows after recommendations for non-signed-in users */}
          {showSignInNudge && !user && (
            <div className="mb-3 p-3 bg-[#5F7252]/10 rounded-xl border border-[#5F7252]/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-[#4A5940]">
                <Library className="w-4 h-4 text-[#5F7252] flex-shrink-0" />
                <span>
                  <strong>Already own some of these?</strong> Sign in to add your collection—I'll personalize future recommendations.
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setShowAuthModal(true);
                    track('sign_in_nudge_clicked');
                  }}
                  className="px-3 py-1.5 bg-[#5F7252] text-white text-xs font-medium rounded-lg hover:bg-[#4A5940] transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setShowSignInNudge(false);
                    setSignInNudgeDismissed(true);
                    track('sign_in_nudge_dismissed');
                  }}
                  className="p-1 text-[#96A888] hover:text-[#5F7252] transition-colors"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="bg-[#F8F6EE] rounded-2xl border border-[#E8EBE4] shadow-sm p-3 sm:p-4 flex items-center gap-3">
              <textarea
                value={inputValue}
                onChange={e => {
                  setInputValue(e.target.value);
                  e.target.style.height = '24px';
                  const newHeight = Math.min(e.target.scrollHeight, 200);
                  e.target.style.height = newHeight + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' || e.shiftKey) return;
                  e.preventDefault();
                  handleSendMessage();
                }}
                placeholder="I'm looking for..."
                className="flex-1 px-0 py-0 outline-none text-[#4A5940] placeholder-[#96A888] font-light text-sm sm:text-base resize-none overflow-hidden bg-transparent leading-relaxed"
                disabled={isLoading}
                style={{ minHeight: '24px', maxHeight: '200px', height: '24px' }}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="w-8 h-8 sm:w-9 sm:h-9 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 flex items-center justify-center"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

          {chatMode === 'discover' && (
            <div className="mb-3 flex items-center justify-center gap-2">
              <button
                onClick={() => setChatMode('library')}
                className="text-xs font-medium text-[#96A888] hover:text-[#5F7252] transition-colors"
                aria-label="Back to curator's picks"
              >
                ← Back to Curator's Picks
              </button>
            </div>
          )}

          {messages.length > 1 && chatMode === 'library' && (
            <div className="mb-3 px-4 py-2.5 bg-[#F8F6EE] rounded-xl border border-[#E8EBE4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#7A8F6C]" />
                <span className="text-xs text-[#5F7252] font-medium">
                  Continuing conversation ({messages.length - 1} {messages.length === 2 ? 'message' : 'messages'})
                </span>
              </div>
              <button
                onClick={handleNewSearch}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#D4DAD0] hover:bg-[#F8F6EE] text-[#5F7252] text-xs font-medium transition-colors"
                aria-label="Start new search"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                New Search
              </button>
            </div>
          )}


          {chatMode === 'discover' && likedBooks.length > 0 && (
            <div className="mb-3 px-4 py-3 bg-[#F8F6EE] rounded-xl border border-[#E8EBE4]">
              <p className="text-xs text-[#7A8F6C] mb-2">∞ Finding books similar to:</p>
              <div className="flex flex-wrap gap-1.5">
                {likedBooks.map((book, idx) => (
                  <span key={idx} className="text-xs px-2 py-1 bg-white text-[#5F7252] rounded-full border border-[#E8EBE4]">
                    {book.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          <input
            ref={importFileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              handleImportGoodreadsCsv(f);
            }}
          />

          {/* Create Profile CTA for logged-out users */}
          {!user && (
            <div className="mt-6 bg-[#F8F6EE] rounded-2xl border border-[#D4DAD0] p-5 text-center">
              <h3 className="font-serif text-lg text-[#4A5940] mb-2">Get Better Recommendations</h3>
              <p className="text-sm text-[#7A8F6C] mb-4 leading-relaxed">
                Create a free profile to add your books, share favorite authors, and get personalized recommendations based on your reading preferences.
              </p>
              <button
                onClick={() => {
                  setShowAuthModal(true);
                  track('create_profile_cta_clicked');
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5F7252] text-white text-sm font-medium rounded-lg hover:bg-[#4A5940] transition-colors"
              >
                <UserIcon className="w-4 h-4" />
                Create Your Profile
              </button>
            </div>
          )}

          
        </main>
      )}

      {selectedBook && (
        <BookDetail book={selectedBook} onClose={() => setSelectedBook(null)} />
      )}

      {/* Discover Modal - Choose Library or World */}
      {showDiscoverModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-[#E8EBE4]">
            <h3 className="text-lg font-serif text-[#4A5940] mb-3 text-center">
              Where should I look?
            </h3>
            <p className="text-sm text-[#7A8F6C] mb-6 text-center">
              {tasteProfile.likedBooks.length >= 3 
                ? "I've learned what you like. Let's find more!"
                : "Let me learn more about your taste first."}
            </p>
            
            <div className="space-y-3">
              <button
                onClick={handleShowMoreLibrary}
                className="w-full p-4 rounded-xl border-2 border-[#E8EBE4] hover:border-[#5F7252] hover:bg-[#F8F6EE] transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  <Library className="w-6 h-6 text-[#5F7252]" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#4A5940] mb-1">More from Curator's Picks</p>
                    <p className="text-xs text-[#7A8F6C]">Stay in curator's collection of ~200 books</p>
                  </div>
                </div>
              </button>
              
              <button
                onClick={tasteProfile.likedBooks.length >= 3 ? handleShowMoreWorld : undefined}
                disabled={tasteProfile.likedBooks.length < 3}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  tasteProfile.likedBooks.length >= 3
                    ? 'border-[#5F7252] bg-gradient-to-r from-[#F8F6EE] to-[#F5EFDC] hover:border-[#4A5940] cursor-pointer'
                    : 'border-[#E8EBE4] bg-gray-50 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{tasteProfile.likedBooks.length >= 3 ? '∞' : '🔒'}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium mb-1 ${
                      tasteProfile.likedBooks.length >= 3 ? 'text-[#4A5940]' : 'text-[#96A888]'
                    }`}>
                      Search Everywhere {tasteProfile.likedBooks.length < 3 && '(Locked)'}
                    </p>
                    {tasteProfile.likedBooks.length >= 3 ? (
                      <>
                        <p className="text-xs text-[#7A8F6C]">Use your taste profile to search millions of books</p>
                        <p className="text-xs text-[#96A888] mt-1 italic">
                          Based on {tasteProfile.likedBooks.length} book{tasteProfile.likedBooks.length !== 1 ? 's' : ''} you liked
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-[#96A888]">Like {3 - tasteProfile.likedBooks.length} more book{3 - tasteProfile.likedBooks.length !== 1 ? 's' : ''} to unlock</p>
                        <div className="flex gap-1 mt-2">
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full ${
                                i < tasteProfile.likedBooks.length ? 'bg-[#5F7252]' : 'bg-[#E8EBE4]'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </button>
            </div>
            
            <button
              onClick={() => setShowDiscoverModal(false)}
              className="w-full mt-4 px-4 py-2 text-sm text-[#96A888] hover:text-[#5F7252] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && !user && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {/* User Profile Modal */}
      {showAuthModal && user && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-8 border border-[#E8EBE4] relative max-h-[calc(100vh-4rem)]">
            <div className="sticky top-0 bg-white rounded-t-2xl z-10 px-6 pt-6 pb-3 border-b border-[#E8EBE4]">
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 p-1 hover:bg-[#E8EBE4] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#96A888]" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-8rem)] px-6 pb-6">
              <Suspense fallback={<LoadingFallback message="Loading Profile..." />}>
                <UserProfile
                  tasteProfile={tasteProfile}
                />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer onNavigate={setCurrentPage} currentPage={currentPage} />

    </div>
  );
}
