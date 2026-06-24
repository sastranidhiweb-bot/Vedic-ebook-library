'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, ArrowLeft, Settings, SkipForward, SkipBack, AlertCircle, Bookmark, BookmarkCheck, User, Upload, Bug, ChevronDown, Plus, FileText, Search, Highlighter, Trash2, X } from 'lucide-react';
import { updateBookProgress, fetchBookContent, fetchBooks, Book } from '../lib/bookStorage';
import { BACKEND_API_URL } from '../lib/config';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import CategoryPanel from './CategoryPanel';

// Returns true when a book belongs to the given language selection. Uses the
// book's `language` field when present, falling back to its tags.
const bookMatchesLanguage = (book: Book, language: string): boolean => {
  if (language === 'all') return true;
  const lang = (book.language || '').toString().toLowerCase();
  const tags: string[] = Array.isArray(book.tags) ? book.tags.map(t => String(t).toLowerCase()) : [];
  if (language === 'telugu') return lang ? lang === 'telugu' : tags.some(t => t.includes('telugu'));
  if (language === 'sanskrit') return lang ? lang === 'sanskrit' : tags.some(t => t.includes('sanskrit'));
  // english (default): explicitly english, or no telugu/sanskrit marker
  if (lang) return lang === 'english';
  return !tags.some(t => t.includes('telugu') || t.includes('sanskrit'));
};

interface EBookReaderProps {
  bookId?: string;
  title?: string;
  user?: { role: string; username: string; name?: string } | null;
  onLogout?: () => void;
  onBookSelect?: (book: Book) => void;
  onViewChange?: (view: 'reading' | 'upload' | 'debug') => void;
  categoryPanelRefreshKey?: number;
  highlightCategory?: string;
}

const EBookReader: React.FC<EBookReaderProps> = ({ bookId, title, user, onLogout, onBookSelect, onViewChange, categoryPanelRefreshKey, highlightCategory }) => {
  // Books and categories state
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<{name: string; books: Book[]; expanded: boolean}[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [adminStats, setAdminStats] = useState<{ totalUsers: number; loggedInUsers: number; totalBooks: number } | null>(null);
  const [adminStatsLoading, setAdminStatsLoading] = useState(false);
  const [adminStatsError, setAdminStatsError] = useState('');
  const [adminStatsReloadKey, setAdminStatsReloadKey] = useState(0);
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<{
    pageIndex: number;
    context: string;
    match: string;
    beforeContext: string;
    afterContext: string;
    fullContext: string;
    paragraphIndex?: number;
    paragraphText?: string;
  }[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isNavigatingToSearch, setIsNavigatingToSearch] = useState(false);
  const [pendingSearchScroll, setPendingSearchScroll] = useState<{pageIndex: number; matchIndex: number} | null>(null);
  const [currentTextIndex, setCurrentTextIndex] = useState(0); // For loading text animation
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [expandedCategories, setExpandedCategories] = useState<{[key: string]: boolean}>({});
  const [isCategoryPanelVisible, setIsCategoryPanelVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // IAST normalization function
  const normalizeIAST = (text: string) => {
    const iASTMap: { [key: string]: string } = {
      'Ā': 'A', 'ā': 'a',
      'Ī': 'I', 'ī': 'i',
      'Ū': 'U', 'ū': 'u',
      'Ṛ': 'R', 'ṛ': 'r',
      'Ṝ': 'R', 'ṝ': 'r',
      'Ḷ': 'L', 'ḷ': 'l',
      'Ḹ': 'L', 'ḹ': 'l',
      'Ṃ': 'M', 'ṃ': 'm',
      'Ḥ': 'H', 'ḥ': 'h',
      'Ṅ': 'N', 'ṅ': 'n',
      'Ñ': 'N', 'ñ': 'n',
      'Ṭ': 'T', 'ṭ': 't',
      'Ḍ': 'D', 'ḍ': 'd',
      'Ṇ': 'N', 'ṇ': 'n',
      'Ś': 'S', 'ś': 's',
      'Ṣ': 'S', 'ṣ': 's',
      'Ṁ': 'M', 'ṁ': 'm'
    };

    return text.replace(/[ĀāĪīŪūṚṛṜṝḶḷḸḹṂṃḤḥṄṅÑñṬṭḌḍṆṇŚśṢṣṀṁ]/g, (char) => {
      return iASTMap[char] || char;
    });
  };
  
  // Initialize responsive font size based on screen width
  const getDefaultFontSize = () => {
    if (typeof window !== 'undefined') {
      return 18; // 18px default for both mobile and desktop
    }
    return 18; // Default for SSR
  };
  
  const [fontSize, setFontSize] = useState(getDefaultFontSize());
  const [pageZoom, setPageZoom] = useState(0.8);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [showSettings, setShowSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInputValue, setPageInputValue] = useState('1');
  const [wordsPerPage, setWordsPerPage] = useState(500);
  const [content, setContent] = useState<string>('');
  const [bookTitle, setBookTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [highlightedContent, setHighlightedContent] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarks, setBookmarks] = useState<{[key: string]: number}>({});

  // Per-user text highlights for the current book
  type Highlight = { id: string; text: string; color: string; page: number; createdAt: number };
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [hlPopup, setHlPopup] = useState<{ x: number; y: number; text: string; mode: 'create' | 'remove'; id?: string } | null>(null);
  const [showHighlights, setShowHighlights] = useState(false);
  
  // Backend pagination state
  const [paginationInfo, setPaginationInfo] = useState<any>(null);
  const [isContentHtml, setIsContentHtml] = useState(false);
  const lastLoadedPageRef = useRef<number>(1);
  const bookmarkLoadedRef = useRef<boolean>(false);
  // Refs used to safely reconcile DB-backed bookmark/highlights inside async callbacks
  const bookIdRef = useRef<string | undefined>(bookId);
  const currentPageRef = useRef<number>(1);
  const bookmarkAppliedRef = useRef<boolean>(false);
  // Continuous (infinite) scroll reading state — pages are appended as the
  // user scrolls instead of replacing the view on every navigation.
  const [loadedPages, setLoadedPages] = useState<{ page: number; html: string }[]>([]);
  const isAppendingRef = useRef(false);
  const scrollThrottleRef = useRef(0);
  const pendingScrollTopRef = useRef(false);
  // Chapters state
  const [bookChapters, setBookChapters] = useState<{ text: string; wordIndex: number }[]>([]);

  const [lastSearchWord, setLastSearchWord] = useState<string>('');

    // Utility to highlight search word in context (HTML safe)
  // Enhanced: Optionally add unique IDs to matches for main reading area
  function highlightSearchWord(context: string, search: string, opts?: { addIds?: boolean, page?: number }) {
    if (!search) return context;
    // Escape regex special chars in search
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    let matchIndex = 0;
    return context.replace(regex, (match) => {
      if (opts && opts.addIds && typeof opts.page === 'number') {
        const id = `search-match-${opts.page}-${matchIndex++}`;
        return `<span id="${id}" style="background: var(--search-highlight-bg); color: var(--search-highlight-text); font-weight: bold; border-radius: 0.25em; padding: 0 3px;">${match}</span>`;
      } else {
        return `<span style="background: var(--search-highlight-bg); color: var(--search-highlight-text); font-weight: bold; border-radius: 0.25em; padding: 0 3px;">${match}</span>`;
      }
    });
  }

  // Get user context for bookmark functionality
  const { user: authUser } = useAuth();

  // Content loading function
  const loadContent = useCallback(async () => {
    if (!bookId) return;
    
    // Prevent race conditions - if we're already loading this page, don't reload
    if (lastLoadedPageRef.current === currentPage && !isLoading) {
      console.log(`Content for page ${currentPage} is already loaded, skipping...`);
      return;
    }
    
    console.log('Loading content for book ID:', bookId, 'page:', currentPage);
    setIsLoading(true);
    setError('');
    try {
      // Request HTML format to preserve formatting with pagination
      const result = await fetchBookContent(
        bookId, 
        currentPage, 
        'html'
      );
      console.log('fetchBookContent result@:', result);
      if (result) {
        setContent(result.content);
        // Reset the continuous-scroll buffer to start at this page. Further
        // pages get appended as the user scrolls (see loadNextPage).
        setLoadedPages([{ page: currentPage, html: result.content }]);
        pendingScrollTopRef.current = true;
        if (result.pagination) {
          setPaginationInfo(result.pagination);
          setIsContentHtml(result.pagination.format === 'html');
        }
        if (result.metadata) {
          setBookTitle(result.metadata.title || `Book ${bookId}`);
        }
        // Prefer chapterswithPageNo if present
        if ('chapterswithPageNo' in result && Array.isArray(result.chapterswithPageNo)) {
          console.log('DEBUG: chapterswithPageNo from backend:', result.chapterswithPageNo);
          // Map backend chapters to expected format
          setBookChapters(result.chapterswithPageNo.map((ch: any) => ({
            text: ch.chapterName || ch.chapter || ch.text || '',
            wordIndex: (ch.pageNumber || ch.wordIndex || 1) - 1
          })));
        } else if ('chapters' in result && Array.isArray(result.chapters)) {
          setBookChapters(result.chapters);
        } else if (result.pagination && Array.isArray(result.pagination.chapters)) {
          setBookChapters(result.pagination.chapters);
        } else {
          setBookChapters([]);
        }
        lastLoadedPageRef.current = currentPage;
      } else {
        setError('Failed to load book content');
      }
    } catch (err) {
      console.error('Error loading book:', err);
      setError('Error loading book content');
    } finally {
      setIsLoading(false);
    }
  }, [bookId, currentPage, isLoading]);

  // Append the next page to the continuous-scroll buffer (Word-document style
  // reading). Triggered when the reader scrolls near the bottom.
  const loadNextPage = useCallback(async () => {
    if (!bookId || isAppendingRef.current || isLoading) return;
    const lastPage = loadedPages.length
      ? loadedPages[loadedPages.length - 1].page
      : currentPage;
    const maxPages = paginationInfo?.totalPages;
    if (maxPages && lastPage >= maxPages) return;

    isAppendingRef.current = true;
    try {
      const nextPage = lastPage + 1;
      const result = await fetchBookContent(bookId, nextPage, 'html');
      if (result && result.content) {
        setLoadedPages(prev => {
          if (prev.some(p => p.page === nextPage)) return prev;
          return [...prev, { page: nextPage, html: result.content }];
        });
      }
    } catch (err) {
      console.error('Error appending next page:', err);
    } finally {
      isAppendingRef.current = false;
    }
  }, [bookId, loadedPages, currentPage, paginationInfo, isLoading]);
  // Scroll handler for the reading area: appends the next page near the bottom
  // and keeps the page indicator/progress in sync with the visible page.
  const handleContentScroll = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;

    // Append the next page as we approach the bottom of the loaded content.
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 800) {
      loadNextPage();
    }

    // Throttle the visible-page tracking to avoid excessive state updates.
    const now = Date.now();
    if (now - scrollThrottleRef.current < 150) return;
    scrollThrottleRef.current = now;

    const containerTop = el.getBoundingClientRect().top;
    const anchors = el.querySelectorAll<HTMLElement>('.vb-page-anchor');
    let visiblePage = currentPage;
    anchors.forEach(anchor => {
      if (anchor.getBoundingClientRect().top - containerTop <= 120) {
        const p = parseInt(anchor.dataset.page || '0', 10);
        if (p) visiblePage = p;
      }
    });
    if (visiblePage !== currentPage) {
      setCurrentPage(visiblePage);
    }
  }, [loadNextPage, currentPage]);

  // Smoothly scroll to a page that is already present in the loaded buffer.
  // Returns true if the page was found (and scrolled to), false otherwise.
  const scrollToPageAnchor = useCallback((page: number) => {
    const el = contentRef.current;
    if (!el) return false;
    const anchor = el.querySelector<HTMLElement>(`.vb-page-anchor[data-page="${page}"]`);
    if (!anchor) return false;
    const containerTop = el.getBoundingClientRect().top;
    const top = el.scrollTop + (anchor.getBoundingClientRect().top - containerTop);
    el.scrollTo({ top, behavior: 'smooth' });
    return true;
  }, []);

  // After navigation from search result card, scroll to and highlight the first match
  useEffect(() => {
    if (lastSearchWord && highlightedContent && !isSearchMode) {
      console.log('[Highlight Scroll useEffect] Triggered:', { lastSearchWord, currentPage });
      setTimeout(() => {
        const matchId = `search-match-${currentPage}-0`;
        const matchElement = document.getElementById(matchId);
        console.log('[Highlight Scroll useEffect] Looking for:', matchId, 'Found:', !!matchElement);
        if (matchElement && contentRef.current) {
          matchElement.style.backgroundColor = '#f59e0b';
          matchElement.style.boxShadow = '0 0 0 3px #f59e0b, 0 0 10px rgba(245, 158, 11, 0.5)';
          matchElement.style.transform = 'scale(1.05)';
          matchElement.style.transition = 'all 0.3s ease';
          matchElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          console.log('[Highlight Scroll useEffect] Successfully scrolled and styled:', matchId);
        } else {
          console.warn('[Highlight Scroll useEffect] Match element not found:', matchId);
        }
      }, 200);
    }
  }, [lastSearchWord, highlightedContent, currentPage, isSearchMode]);


  // Load books on component mount
  useEffect(() => {
    const loadBooks = async () => {
      setLoadingBooks(true);
      try {
        const fetchedBooks = await fetchBooks();
        setBooks(fetchedBooks);
        organizeBooks(fetchedBooks);
      } catch (error) {
        console.error('Error loading books:', error);
      } finally {
        setLoadingBooks(false);
      }
    };
    loadBooks();
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin') {
      setAdminStats(null);
      setAdminStatsError('');
      return;
    }

    const token = localStorage.getItem('vedic_auth_token') || sessionStorage.getItem('vedic_auth_token') || '';
    if (!token) return;

    let isCancelled = false;
    const fetchAdminStats = async () => {
      setAdminStatsLoading(true);
      setAdminStatsError('');
      try {
        const [usersResponse, booksResponse] = await Promise.all([
          fetch(`${BACKEND_API_URL}/admin/users`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${BACKEND_API_URL}/books?page=1&limit=1`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const usersJson = await usersResponse.json();
        const booksJson = await booksResponse.json();

        if (!usersResponse.ok || !usersJson.success) {
          throw new Error(usersJson.message || 'Failed to load users count');
        }
        if (!booksResponse.ok || !booksJson.success) {
          throw new Error(booksJson.message || 'Failed to load books count');
        }

        const users = Array.isArray(usersJson.data) ? usersJson.data : [];
        const loggedInUsers = users.filter((entry: any) => Array.isArray(entry.refreshTokens) && entry.refreshTokens.length > 0).length;
        const totalBooks = booksJson?.data?.pagination?.totalBooks ?? 0;

        if (!isCancelled) {
          setAdminStats({
            totalUsers: users.length,
            loggedInUsers,
            totalBooks,
          });
        }
      } catch (error: any) {
        if (!isCancelled) {
          setAdminStatsError(error.message || 'Failed to load admin stats');
        }
      } finally {
        if (!isCancelled) {
          setAdminStatsLoading(false);
        }
      }
    };

    fetchAdminStats();
    return () => {
      isCancelled = true;
    };
  }, [user?.role, adminStatsReloadKey]);

  const openAdminModalFromWelcome = (target: 'books' | 'users') => {
    const params = new URLSearchParams(location.search);
    params.set('adminOpen', target);
    navigate({ pathname: '/homePage', search: `?${params.toString()}` }, { replace: true });
  };

  // Organize books into categories
  const organizeBooks = (booksList: Book[]) => {
    // Filter books by selected language first
    const filteredBooks = booksList.filter(book => bookMatchesLanguage(book, selectedLanguage));


    // Since category is removed, group all books under 'Other' or by another property if needed
    const categoryMap = new Map<string, Book[]>();
    categoryMap.set('Other', filteredBooks);

    // Create organized categories in sorted order
    const orderedCategoryNames = Array.from(categoryMap.keys()).sort((a, b) => a.localeCompare(b));
    const organizedCategories = orderedCategoryNames.map(name => ({
      name,
      books: categoryMap.get(name) || [],
      expanded: false
    }));

    setCategories(organizedCategories);
  };

  // Auto-expand category containing the selected book (from tree/direct link)
  useEffect(() => {
    if (!bookId || books.length === 0) return;

    const selected = books.find(book => book._id === bookId);
    // Since category is removed, always expand 'Other' if a book is selected
    if (selected) {
      setExpandedCategories(prev => ({
        ...prev,
        ['Other']: true,
      }));
    }
  }, [bookId, books]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  const handleBookSelection = (book: Book) => {
    console.log('DEBUG: handleBookSelection called for book:', book);
    // Reset chapters when a new book is selected
    setBookChapters([]);
    setCurrentPage(1);
    setPageInputValue('1');
    // Auto-close panel on mobile after book selection
    if (isMobile) setIsCategoryPanelVisible(false);

    // Fetch book content to get chapterswithPageNo and merge into categories
    fetchBookContent(book._id, 1, 'html')
      .then(result => {
        console.log('DEBUG: fetchBookContent result in handleBookSelection:', result);
        if (result && 'chapterswithPageNo' in result && Array.isArray(result.chapterswithPageNo)) {
          setCategories(prev =>
            prev.map(cat => ({
              ...cat,
              books: cat.books.map(b =>
                b._id === book._id
                  ? { ...b, chapterswithPageNo: (result as any).chapterswithPageNo }
                  : b
              )
            }))
          );
        } else {
          console.log('DEBUG: No chapterswithPageNo found in result for book', book._id, result);
        }
        if (onBookSelect) {
          onBookSelect(book);
        }
      })
      .catch(err => {
        console.error('DEBUG: fetchBookContent error:', err);
      });
  };

  // Search functionality - Search entire book via backend
  const performFullBookSearch = async (query: string) => {
    console.log('🔍 performFullBookSearch called with:', { query, bookId });
    
    if (!query.trim() || !bookId) {
      console.log('❌ Missing query or bookId:', { query: query.trim(), bookId });
      setSearchResults([]);
      setShowSearchResults(false);
      setCurrentSearchIndex(0);
      setIsSearchMode(false);
      return;
    }

    try {
      console.log('🔍 Performing full book search for:', query);
      console.log('📖 Book ID:', bookId);
      setIsLoading(true);
      const token = localStorage.getItem('vedic_auth_token') || sessionStorage.getItem('vedic_auth_token');
      
      const apiUrl = `${BACKEND_API_URL}/books/${bookId}/search?q=${encodeURIComponent(query)}&limit=200`;
      console.log('📡 Calling search API:', apiUrl);
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      
      console.log('📥 API Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API call failed:', { status: response.status, statusText: response.statusText, errorText });
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }
      
      const rawBody = await response.text();
      let searchData: any;
      try {
        searchData = JSON.parse(rawBody);
      } catch (parseError) {
        console.error('❌ Search API did not return JSON:', {
          apiUrl,
          bodyPreview: rawBody.slice(0, 300),
          parseError,
        });
        throw new Error('Search API returned non-JSON response');
      }
      console.log('📊 Search data received:', searchData);
      
      if (searchData.success && searchData.data.results) {
        const results = searchData.data.results.map((result: any) => ({
          pageIndex: result.pageNumber - 1, // Convert to 0-based index
          context: result.context,
          match: result.match,
          beforeContext: result.beforeContext || '',
          afterContext: result.afterContext || '',
          fullContext: result.fullContext || result.context,
          paragraphIndex: result.paragraphIndex,
          paragraphText: result.paragraphText,
        }));
        console.log(`✅ Found ${results.length} matches returned (${searchData.data.totalMatches} total matches)`);
        if (searchData.data.hasMore) {
          console.log(`📄 Note: Showing first ${results.length} of ${searchData.data.totalMatches} total matches`);
        }
        setSearchResults(results);
        setShowSearchResults(results.length > 0);
        setIsSearchMode(results.length > 0);
        setCurrentSearchIndex(0);
        // Navigate to first result if found
        if (results.length > 0) {
          setCurrentPage(results[0].pageIndex + 1);
        }
      } else {
        console.log('No search results found');
        setSearchResults([]);
        setShowSearchResults(false);
        setIsSearchMode(false);
      }
    } catch (error) {
      console.error('❌ Backend search error:', error);
      console.log('🔄 Falling back to local search');
      // Fallback to local search if backend search fails
      performLocalSearch(query);
    } finally {
      setIsLoading(false);
    }
  };

  // Local search functionality (fallback)
  const performLocalSearch = (query: string) => {
    console.log('🏠 Performing LOCAL search for:', query);
    if (!query.trim() || !content) {
      setSearchResults([]);
      setShowSearchResults(false);
      setCurrentSearchIndex(0);
      setIsSearchMode(false);
      return;
    }

    console.log('📄 Searching in pages array, length:', pages.length);

    const results: {pageIndex: number; context: string; match: string; beforeContext: string; afterContext: string; fullContext: string}[] = [];
    const normalizedSearchTerm = normalizeIAST(query.toLowerCase());

    pages.forEach((page, pageIndex) => {
      const cleanText = page.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const normalizedText = normalizeIAST(cleanText.toLowerCase());
      
      let searchIndex = 0;
      while (true) {
        const foundIndex = normalizedText.indexOf(normalizedSearchTerm, searchIndex);
        if (foundIndex === -1) break;
        
        // Extract extended context around the match
        const contextStart = Math.max(0, foundIndex - 100);
        const contextEnd = Math.min(cleanText.length, foundIndex + normalizedSearchTerm.length + 100);
        const beforeContext = cleanText.substring(contextStart, foundIndex);
        const matchText = cleanText.substring(foundIndex, foundIndex + normalizedSearchTerm.length);
        const afterContext = cleanText.substring(foundIndex + normalizedSearchTerm.length, contextEnd);
        
        // Full context for display
        const fullContext = cleanText.substring(contextStart, contextEnd);
        const shortContext = `${contextStart > 0 ? '...' : ''}${beforeContext}${matchText}${afterContext}${contextEnd < cleanText.length ? '...' : ''}`;
        
        results.push({
          pageIndex,
          context: shortContext,
          match: matchText,
          beforeContext,
          afterContext,
          fullContext: `${contextStart > 0 ? '...' : ''}${fullContext}${contextEnd < cleanText.length ? '...' : ''}`
        });
        
        searchIndex = foundIndex + 1;
      }
    });

    setSearchResults(results);
    setShowSearchResults(results.length > 0);
    setIsSearchMode(results.length > 0);
    setCurrentSearchIndex(0);
    
    console.log(`🏠 Local search completed: ${results.length} matches found`);
    console.log('📍 Results by page:', results.map(r => `Page ${r.pageIndex + 1}`));
    
    // Navigate to first result if found
    if (results.length > 0) {
      setCurrentPage(results[0].pageIndex + 1);
    }
  };

  // Main search function (renamed from performSearch)
  const performSearch = (query: string) => {
    console.log('🎯 performSearch called with query:', query);
    // Try full book search first, fallback to local search if needed
    performFullBookSearch(query);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    
    console.log('🔤 Search input changed to:', value);
    
    if (!value.trim()) {
      console.log('🧹 Clearing search results');
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearchMode(false);
    }
  };

  const handleSearchSubmit = () => {
    const trimmedQuery = searchInput.trim();

    if (!trimmedQuery || !bookId) {
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearchMode(false);
      return;
    }

    setSearchQuery(trimmedQuery);
    performSearch(trimmedQuery);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
  };

  // Function to scroll to a specific search match
  const scrollToSearchMatch = useCallback((pageIndex: number, matchIndex: number = 0) => {
    console.log('🎯 scrollToSearchMatch called:', { pageIndex, matchIndex, currentPage });
    
    // If we're on the wrong page, navigate to the correct page first
    if (pageIndex + 1 !== currentPage) {
      console.log('📄 Setting page from', currentPage, 'to', pageIndex + 1);
      
      // When navigating to search result, we need to calculate the match index properly
      // Find the current search result and calculate its index within the target page
      const currentResult = searchResults[currentSearchIndex];
      const matchesOnTargetPage = searchResults.filter(r => r.pageIndex === pageIndex);
      const correctMatchIndex = matchesOnTargetPage.findIndex(r => r === currentResult);
      
      console.log('🎯 Calculated match index for target page:', {
        currentSearchIndex,
        pageIndex,
        correctMatchIndex,
        totalMatchesOnPage: matchesOnTargetPage.length
      });
      
      setIsNavigatingToSearch(true);
      setPendingSearchScroll({ pageIndex, matchIndex: correctMatchIndex >= 0 ? correctMatchIndex : matchIndex });
      setCurrentPage(pageIndex + 1);
      return;
    }
    
    // Clear navigation flag since we're on the right page
    setIsNavigatingToSearch(false);
    setPendingSearchScroll(null);
    
    const scrollToMatch = () => {
      const matchElement = document.getElementById(`search-match-${pageIndex + 1}-${matchIndex}`);
      if (matchElement && contentRef.current) {
        console.log('Found search match element, scrolling to it:', matchElement.id);
        
        // Remove previous active highlighting from all matches
        document.querySelectorAll('span[id^="search-match-"]').forEach(span => {
          const element = span as HTMLElement;
          element.style.backgroundColor = '#fbbf24';
          element.style.boxShadow = 'none';
          element.style.transform = 'none';
        });
        
        // Highlight current match with different color and animation
        matchElement.style.backgroundColor = '#f59e0b';
        matchElement.style.boxShadow = '0 0 0 3px #f59e0b, 0 0 10px rgba(245, 158, 11, 0.5)';
        matchElement.style.transform = 'scale(1.05)';
        matchElement.style.transition = 'all 0.3s ease';
        
        // Scroll to the match with proper offset
        const rect = matchElement.getBoundingClientRect();
        const containerRect = contentRef.current.getBoundingClientRect();
        const scrollTop = matchElement.offsetTop - containerRect.height / 2;
        
        contentRef.current.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
        
        // Also use scrollIntoView as backup
        setTimeout(() => {
          matchElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          });
        }, 100);
        
        console.log('✅ Successfully scrolled to search match');
        return true;
      } else {
        console.log('🔍 Search match element not found:', `search-match-${pageIndex + 1}-${matchIndex}`);
        return false;
      }
    };
    
    // Try multiple times with increasing delays
    const maxAttempts = 10;
    let attempts = 0;
    
    const tryScroll = () => {
      attempts++;
      if (scrollToMatch()) {
        console.log(`✅ Successfully scrolled to search match on attempt ${attempts}`);
        return;
      }
      
      if (attempts < maxAttempts) {
        setTimeout(tryScroll, attempts * 100); // Increasing delay: 100ms, 200ms, 300ms...
      } else {
        console.warn('❌ Failed to find search match element after', maxAttempts, 'attempts');
      }
    };
    
    tryScroll();
  }, [currentPage, searchResults, currentSearchIndex]);

  const goToNextSearchResult = () => {
    if (searchResults.length > 0) {
      const nextIndex = (currentSearchIndex + 1) % searchResults.length;
      setCurrentSearchIndex(nextIndex);
      // Use goToSearchResult to handle proper navigation and match indexing
      goToSearchResult(nextIndex);
    }
  };

  const goToPreviousSearchResult = () => {
    if (searchResults.length > 0) {
      const prevIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
      setCurrentSearchIndex(prevIndex);
      // Use goToSearchResult to handle proper navigation and match indexing
      goToSearchResult(prevIndex);
    }
  };

  // Function to jump to a specific search result
  const goToSearchResult = useCallback((index: number) => {
    if (index >= 0 && index < searchResults.length) {
      const result = searchResults[index];
      const targetPage = result.pageIndex + 1;
      
      console.log('🎯 goToSearchResult called:', {
        index,
        targetPage,
        currentPage,
        result: result.match,
        resultPageIndex: result.pageIndex,
        context: result.context.substring(0, 100) + '...',
        pageMatch: `Search shows page ${result.pageIndex + 1}, navigating to page ${targetPage}`
      });
      
      // Calculate match index within the target page
      const matchesOnTargetPage = searchResults.filter(r => r.pageIndex === result.pageIndex);
      const matchIndexInPage = matchesOnTargetPage.findIndex(r => r === result);
      
      console.log('🧮 Match calculation:', {
        targetPageIndex: result.pageIndex,
        matchesOnPage: matchesOnTargetPage.length,
        matchIndexInPage,
        totalSearchResults: searchResults.length,
        systemMessage: 'Using updated pagination - backend and frontend should now match!'
      });
      
      setCurrentSearchIndex(index);
      
      // If we need to change pages, do that first
      if (currentPage !== targetPage) {
        console.log('📄 Page change needed from', currentPage, 'to', targetPage, '- pagination systems should now match!');
        setCurrentPage(targetPage);
        // Scrolling will happen automatically via useEffect when content updates
      } else {
        // If we're on the same page, scroll immediately
        console.log('📍 Same page, scrolling immediately to match', matchIndexInPage);
        scrollToSearchMatch(result.pageIndex, matchIndexInPage);
      }
    }
  }, [searchResults, currentPage, scrollToSearchMatch]);

  // Language and category management
  const toggleLanguage = (language: string) => {
    setSelectedLanguage(language);
  };

  const toggleCategoryPanel = () => {
    setIsCategoryPanelVisible(prev => !prev);
  };

  const toggleCategoryExpanded = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Filter books by selected language
  const getBooksByLanguage = (language: string) => {
    // This is a placeholder - you would implement actual language filtering
    // based on your book metadata
    return organizeBooks(books);
  };

  const languageConfig = useMemo(() => ({
    all: { label: 'All books', code: 'All', icon: 'All', count: books.length },
    english: { label: 'English books', code: 'EN', icon: 'EN', count: books.filter(b => bookMatchesLanguage(b, 'english')).length },
    telugu: { label: 'Telugu books', code: 'TE', icon: 'తె', count: books.filter(b => bookMatchesLanguage(b, 'telugu')).length },
    sanskrit: { label: 'Sanskrit books', code: 'संस्कृत', icon: 'सं', count: books.filter(b => bookMatchesLanguage(b, 'sanskrit')).length }
  }), [books]);

  // Books visible on the landing page, filtered by the currently selected language.
  const visibleBooks = useMemo(
    () => books.filter(book => bookMatchesLanguage(book, selectedLanguage)),
    [books, selectedLanguage]
  );

  // Re-organize books when language changes
  useEffect(() => {
    if (books.length > 0) {
      organizeBooks(books);
    }
  }, [selectedLanguage, books]);

  // Fold/Unfold all categories
  const foldAllCategories = () => {
    setExpandedCategories({});
  };

  const unfoldAllCategories = () => {
    const allExpanded: {[key: string]: boolean} = {};
    categories.forEach(category => {
      allExpanded[category.name] = true;
    });
    setExpandedCategories(allExpanded);
  };

  // Loading text animation effect
  useEffect(() => {
    const loadingTexts = [
      'Loading ancient wisdom...',
      'Preparing sacred texts...',
      'Unveiling timeless knowledge...',
      'Opening spiritual gateway...',
      'Accessing divine literature...',
      'Illuminating sacred pages...',
      'Discovering eternal truths...',
      'Connecting to higher wisdom...'
    ];

    const interval = setInterval(() => {
      setCurrentTextIndex(prev => (prev + 1) % loadingTexts.length);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadingTexts = [
    'Loading ancient wisdom...',
    'Preparing sacred texts...',
    'Unveiling timeless knowledge...',
    'Opening spiritual gateway...',
    'Accessing divine literature...',
    'Illuminating sacred pages...',
    'Discovering eternal truths...',
    'Connecting to higher wisdom...'
  ];

  // Load book content when component mounts or book changes
  useEffect(() => {
    if (!bookId) {
      setIsLoading(false);
      setContent('');
      setError('');
      return;
    }

    console.log('Book changed to:', bookId, 'Resetting bookmark flag');
    
    // Reset states for new book
    bookmarkLoadedRef.current = false;
    lastLoadedPageRef.current = 0; // Reset last loaded page to force content reload
    setContent(''); // Clear content immediately
    setLoadedPages([]); // Clear continuous-scroll buffer so returning to the same
                        // book at a previously-loaded page still forces a fresh fetch
    setError(''); // Clear any errors
    setBookTitle(''); // Reset book title
    setIsLoading(true); // Show loading state
    setPaginationInfo(null); // Reset pagination info
    
    // Reset page to 1 first
    let finalPage = 1;
    setCurrentPage(1);
    setPageInputValue('1');
    
    // Load bookmark immediately for new book (before content loads)
    if ((user || authUser) && !bookmarkLoadedRef.current) {
      const bookmarkedPage = loadBookmark();
      console.log('Initial bookmark loading for user:', (user || authUser)?.username, 'book:', bookId, 'page:', bookmarkedPage);
      if (bookmarkedPage > 1) {
        console.log('Setting initial page to bookmarked page:', bookmarkedPage);
        finalPage = bookmarkedPage;
        setCurrentPage(bookmarkedPage);
        setPageInputValue(bookmarkedPage.toString());
      }
      setIsBookmarked(!!localStorage.getItem(getBookmarkKey()!));
      bookmarkLoadedRef.current = true;
      console.log('Bookmark loading completed, flag set to true');
    }
    
    // Force content reload for the new book
    setTimeout(() => {
      console.log('Forcing content reload for new book:', bookId, 'page:', finalPage);
      if (bookId) {
        lastLoadedPageRef.current = 0; // Ensure reload
      }
    }, 0);
    
    // Content will be loaded by the loadContent effect when currentPage is properly set
  }, [bookId]); // Removed loadContent dependency to prevent loops

  // Remove the problematic bookmark loading useEffect that depends on content
  // This was causing the page to reset back to bookmark on every navigation

  // Split content into pages based on word count
  const pages = useMemo(() => {
    if (!content) {
      console.log('No content available for pagination');
      return [];
    }
    const words = content.split(/\s+/);
    console.log('Total words in content:', words.length);
    const pageArray = [];
    
    for (let i = 0; i < words.length; i += wordsPerPage) {
      const pageWords = words.slice(i, i + wordsPerPage);
      let pageContent = pageWords.join(' ');
      
      // Try to end pages at natural breaks (sentences, paragraphs)
      if (i + wordsPerPage < words.length) {
        const lastSentenceIndex = pageContent.lastIndexOf('. ');
        const lastParagraphIndex = pageContent.lastIndexOf('</p>');
        const breakPoint = Math.max(lastSentenceIndex, lastParagraphIndex);
        
        if (breakPoint > pageContent.length * 0.7) {
          const adjustedWords = pageContent.substring(0, breakPoint + 1).split(/\s+/);
          pageContent = adjustedWords.join(' ');
          i = i - wordsPerPage + adjustedWords.length;
        }
      }
      
      pageArray.push(pageContent);
    }
    
    console.log('Created pages:', pageArray.length);
    return pageArray;
  }, [content, wordsPerPage]);

  const totalPages = paginationInfo?.totalPages || pages.length;
  // Continuous-scroll content: concatenate every loaded page, prefixing each
  // with an invisible anchor so the scroll handler can track the visible page.
  const currentPageContent = useMemo(() => {
    if (!paginationInfo) return pages[currentPage - 1] || '';
    if (loadedPages.length === 0) return content;
    return loadedPages
      .map(p => `<span class="vb-page-anchor" data-page="${p.page}" style="display:block;height:0;overflow:hidden;"></span>${p.html}`)
      .join('\n');
  }, [paginationInfo, pages, currentPage, loadedPages, content]);
  const displayTitle = bookTitle || title || 'this book';

  // Update highlighted content when page content changes or search query changes
  useEffect(() => {
    let highlighted = currentPageContent;
    // Apply user's saved highlights first
    if (highlights.length > 0 && highlighted) {
      highlighted = applyHighlights(highlighted, highlights);
    }
    // Apply search highlighting if there's a search query
    if (searchQuery && searchQuery.trim() && highlighted) {
      // Only add IDs in main reading area (not in search results panel)
      highlighted = highlightSearchWord(highlighted, searchQuery, { addIds: true, page: currentPage });
    }
    setHighlightedContent(highlighted);
  }, [currentPageContent, searchQuery, currentPage, highlights]);

  // Reload content when page changes (for backend pagination)
  useEffect(() => {
    console.log('Page reload useEffect triggered:', {
      bookId,
      currentPage, 
      lastLoaded: lastLoadedPageRef.current,
      shouldReload: bookId && currentPage !== lastLoadedPageRef.current
    });
    
    if (bookId && currentPage !== lastLoadedPageRef.current) {
      // If the page is already present in the continuous-scroll buffer (e.g. the
      // user simply scrolled into it), don't reload/reset — just sync the ref.
      if (loadedPages.some(p => p.page === currentPage)) {
        lastLoadedPageRef.current = currentPage;
        return;
      }
      console.log(`=== PAGE RELOAD: ${lastLoadedPageRef.current} → ${currentPage} ===`);
      console.log('Current states:', { 
        bookId, 
        currentPage, 
        lastLoaded: lastLoadedPageRef.current,
        bookmarkLoaded: bookmarkLoadedRef.current,
        hasPaginationInfo: !!paginationInfo 
      });
      
      // Call loadContent directly instead of through dependency
      loadContent();
    }
  }, [currentPage, bookId, loadedPages]);

  // After a fresh (reset) load, scroll the reading area back to the top so the
  // newly selected page/chapter starts from the beginning. Skipped when a search
  // navigation is in progress (search handles its own scroll-to-match).
  useEffect(() => {
    if (pendingScrollTopRef.current && loadedPages.length > 0) {
      pendingScrollTopRef.current = false;
      const searchActive = isSearchMode || !!lastSearchWord || !!pendingSearchScroll;
      if (contentRef.current && !searchActive) {
        contentRef.current.scrollTop = 0;
      }
    }
  }, [loadedPages]);

  // If the loaded content doesn't fill the viewport (so there's nothing to
  // scroll), eagerly append the next page so continuous reading still works
  // on tall screens / short pages.
  useEffect(() => {
    const el = contentRef.current;
    if (!el || loadedPages.length === 0 || isLoading) return;
    const timer = setTimeout(() => {
      if (el.scrollHeight <= el.clientHeight + 40) {
        loadNextPage();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [loadedPages, isLoading, loadNextPage]);

  // Auto-scroll to current search result when page content updates
  useEffect(() => {
    // The reading pane is not rendered while search-results mode is open, so
    // skip DOM scrolling attempts until normal reading mode is active.
    if (!isSearchMode && searchResults.length > 0 && highlightedContent && currentSearchIndex < searchResults.length) {
      const currentPageIndex = currentPage - 1;
      const currentResult = searchResults[currentSearchIndex];
      const currentResultPage = currentResult?.pageIndex;
      
      console.log('Auto-scroll effect triggered:', {
        isSearchMode,
        currentPage,
        currentPageIndex,
        currentResultPage,
        currentSearchIndex,
        hasHighlightedContent: !!highlightedContent,
        shouldScroll: currentResultPage === currentPageIndex
      });
      
      if (currentResultPage === currentPageIndex) {
        // Calculate match index within current page
        const matchesOnCurrentPage = searchResults.filter(r => r.pageIndex === currentPageIndex);
        const currentResult = searchResults[currentSearchIndex];
        const matchIndexInPage = matchesOnCurrentPage.findIndex(r => r === currentResult);
        
        console.log('Auto-scrolling to search match on current page:', {
          matchIndexInPage,
          totalMatchesOnPage: matchesOnCurrentPage.length,
          currentSearchIndex
        });
        
        scrollToSearchMatch(currentPageIndex, matchIndexInPage >= 0 ? matchIndexInPage : 0);
      }
    }
  }, [highlightedContent, isSearchMode, currentSearchIndex, searchResults, currentPage, scrollToSearchMatch]);

  // Handle pending search scroll after page navigation
  useEffect(() => {
    if (pendingSearchScroll && !isNavigatingToSearch && highlightedContent) {
      console.log('🔄 Executing pending search scroll:', pendingSearchScroll);
      const { pageIndex, matchIndex } = pendingSearchScroll;
      
      // Small delay to ensure content is rendered
      setTimeout(() => {
        scrollToSearchMatch(pageIndex, matchIndex);
      }, 200);
    }
  }, [pendingSearchScroll, isNavigatingToSearch, highlightedContent, scrollToSearchMatch]);

  // Auto-save bookmark when page changes (but not on initial load)
  useEffect(() => {
    if ((user || authUser) && content && currentPage > 1 && bookId) {
      console.log('Auto-saving bookmark for user:', (user || authUser)?.username, 'book:', bookId, 'page:', currentPage);
      saveBookmark(currentPage);
    }
  }, [currentPage, user, authUser, content, bookId]);

  // Keyboard navigation for pages
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle arrow keys when not typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          goToPreviousPage();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNextPage();
          break;
        case 'Home':
          event.preventDefault();
          goToFirstPage();
          break;
        case 'End':
          event.preventDefault();
          goToLastPage();
          break;
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentPage, totalPages]);

  // Sync page input value with current page
  useEffect(() => {
    setPageInputValue(currentPage.toString());
  }, [currentPage]);

  // Mobile detection — auto-show/hide panel when crossing the 768px breakpoint
  useEffect(() => {
    let wasMobile = window.innerWidth < 768;
    if (wasMobile) {
      setIsMobile(true);
      setIsCategoryPanelVisible(false);
    }

    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (wasMobile && !mobile) {
        // Crossed mobile → desktop: restore the sidebar
        setIsCategoryPanelVisible(true);
      } else if (!wasMobile && mobile) {
        // Crossed desktop → mobile: hide the sidebar
        setIsCategoryPanelVisible(false);
      }
      wasMobile = mobile;
    };

    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Handle responsive font size on window resize
  useEffect(() => {
    const handleResize = () => {
      const newDefaultSize = 18;
      if (Math.abs(fontSize - getDefaultFontSize()) <= 2) {
        setFontSize(newDefaultSize);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fontSize]);

  // Update progress when page changes
  useEffect(() => {
    if (bookId && totalPages > 0) {
      const progress = Math.round((currentPage / totalPages) * 100);
      updateBookProgress(bookId, currentPage, totalPages);
    }
  }, [currentPage, totalPages, bookId]);

  const scrollToChapter = (chapterText: string) => {
    // Find which page contains this chapter
    const chapterIndex = pages.findIndex(page => page.includes(chapterText));
    if (chapterIndex !== -1) {
      setCurrentPage(chapterIndex + 1);
    }
  };

  const goToNextPage = () => {
    console.log('goToNextPage called. Current page:', currentPage, 'Total pages:', totalPages, 'bookmarkLoaded:', bookmarkLoadedRef.current);
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      console.log('Setting next page from', currentPage, 'to', newPage);
      setCurrentPage(newPage);
      // If the page is already in the continuous-scroll buffer, just glide to it.
      if (loadedPages.some(p => p.page === newPage)) {
        requestAnimationFrame(() => scrollToPageAnchor(newPage));
      }
      // Ensure bookmark doesn't override this navigation
      if (!bookmarkLoadedRef.current) {
        bookmarkLoadedRef.current = true;
      }
    }
    setLastSearchWord('');
  };

  const goToPreviousPage = () => {
    console.log('=== goToPreviousPage START ===');
    console.log('Current state:', { 
      currentPage, 
      bookmarkLoaded: bookmarkLoadedRef.current,
      lastLoaded: lastLoadedPageRef.current 
    });
    
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      console.log('Navigating from page', currentPage, 'to page', newPage);
      
      // Ensure bookmark loading is marked as complete to prevent interference
      bookmarkLoadedRef.current = true;
      
      setCurrentPage(newPage);
      // If the page is already in the continuous-scroll buffer, just glide to it.
      if (loadedPages.some(p => p.page === newPage)) {
        requestAnimationFrame(() => scrollToPageAnchor(newPage));
      }
      console.log('setCurrentPage called with:', newPage);
    } else {
      console.log('Cannot go to previous page, already at page 1');
    }
    console.log('=== goToPreviousPage END ===');
    setLastSearchWord('');
  };

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };

  const increaseFontSize = () => {
    setFontSize(prev => prev + 2); // No maximum limit
  };

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 2, 14)); // Minimum 14px
  };

  const increasePageZoom = () => {
    setPageZoom(prev => Math.min(Number((prev + 0.1).toFixed(2)), 2));
  };

  const decreasePageZoom = () => {
    setPageZoom(prev => Math.max(Number((prev - 0.1).toFixed(2)), 0.7));
  };

  const resetPageZoom = () => {
    setPageZoom(1);
  };

  useEffect(() => {
    const handleKeyboardZoom = (event: KeyboardEvent) => {
      if (!event.ctrlKey) return;

      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        increaseFontSize();
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        decreaseFontSize();
      } else if (event.key === '0') {
        event.preventDefault();
        setFontSize(18); // Reset to default
      }
    };

    window.addEventListener('keydown', handleKeyboardZoom);
    return () => {
      window.removeEventListener('keydown', handleKeyboardZoom);
    };
  }, []);

  // Bookmark functions
  const getBookmarkKey = () => {
    const currentUser = user || authUser;
    if (!currentUser || !bookId) return null;
    return `vedic_bookmark_${currentUser.username}_${bookId}`;
  };

  const saveBookmark = (pageNumber: number) => {
    const key = getBookmarkKey();
    if (key && bookId) {
      const bookmarkData = {
        page: pageNumber,
        timestamp: Date.now(),
        bookTitle: bookTitle || `Book ${bookId}`
      };
      localStorage.setItem(key, JSON.stringify(bookmarkData));
      console.log('Bookmark saved:', key, bookmarkData);
      setIsBookmarked(true);
      
      setBookmarks(prev => ({
        ...prev,
        [bookId]: pageNumber
      }));

      // Persist to DB
      const token = getAuthToken();
      if (token) {
        fetch(`${BACKEND_API_URL}/users/progress/${bookId}/bookmark`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ page: pageNumber }),
        }).catch(() => { /* keep local bookmark when offline */ });
      }
    }
  };

  const loadBookmark = () => {
    const key = getBookmarkKey();
    if (key) {
      const saved = localStorage.getItem(key);
      console.log('Loading bookmark with key:', key, 'data:', saved);
      if (saved) {
        try {
          const bookmarkData = JSON.parse(saved);
          return bookmarkData.page || 1;
        } catch (e) {
          console.error('Error parsing bookmark data:', e);
        }
      }
    }
    return 1; // Default to first page
  };

  const removeBookmark = () => {
    const key = getBookmarkKey();
    if (key && bookId) {
      localStorage.removeItem(key);
      setIsBookmarked(false);
      setBookmarks(prev => {
        const updated = { ...prev };
        delete updated[bookId];
        return updated;
      });

      // Persist to DB
      const token = getAuthToken();
      if (token) {
        fetch(`${BACKEND_API_URL}/users/progress/${bookId}/bookmark`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => { /* keep local removal when offline */ });
      }
    }
  };

  const toggleBookmark = () => {
    if (isBookmarked) {
      removeBookmark();
    } else {
      saveBookmark(currentPage);
    }
  };

  // ---- Per-user highlights ----
  const HIGHLIGHT_COLORS = [
    { label: 'Yellow', value: 'rgba(250, 204, 21, 0.45)' },
    { label: 'Green', value: 'rgba(74, 222, 128, 0.40)' },
    { label: 'Pink', value: 'rgba(244, 114, 182, 0.40)' },
    { label: 'Blue', value: 'rgba(96, 165, 250, 0.40)' },
  ];

  const getHighlightsKey = () => {
    const currentUser = user || authUser;
    if (!currentUser || !bookId) return null;
    return `vedic_highlights_${currentUser.username}_${bookId}`;
  };

  const getAuthToken = () =>
    localStorage.getItem('vedic_auth_token') || sessionStorage.getItem('vedic_auth_token') || '';

  const persistHighlights = (list: Highlight[]) => {
    const key = getHighlightsKey();
    if (key) {
      try {
        localStorage.setItem(key, JSON.stringify(list));
      } catch (e) {
        console.error('Error saving highlights:', e);
      }
    }
  };

  const addHighlight = (color: string) => {
    if (!hlPopup || hlPopup.mode !== 'create') return;
    const text = hlPopup.text.trim();
    if (!text) return;
    const newHighlight: Highlight = {
      id: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text,
      color,
      page: currentPage,
      createdAt: Date.now(),
    };
    // Optimistic local update (instant UI + offline cache)
    setHighlights(prev => {
      const next = [...prev, newHighlight];
      persistHighlights(next);
      return next;
    });
    window.getSelection()?.removeAllRanges();
    setHlPopup(null);
    // Persist to DB
    const token = getAuthToken();
    const bId = bookId;
    if (token && bId) {
      fetch(`${BACKEND_API_URL}/users/progress/${bId}/highlights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text, color, page: currentPage }),
      })
        .then(r => r.json())
        .then(data => {
          if (data && data.success && Array.isArray(data.highlights) && bookIdRef.current === bId) {
            setHighlights(data.highlights);
            persistHighlights(data.highlights);
          }
        })
        .catch(() => { /* keep optimistic local copy when offline */ });
    }
  };

  const removeHighlight = (id: string) => {
    // Optimistic local removal
    setHighlights(prev => {
      const next = prev.filter(h => h.id !== id);
      persistHighlights(next);
      return next;
    });
    setHlPopup(null);
    // Persist to DB (skip ids that were never synced)
    const token = getAuthToken();
    const bId = bookId;
    if (token && bId && !id.startsWith('tmp_')) {
      fetch(`${BACKEND_API_URL}/users/progress/${bId}/highlights/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(data => {
          if (data && data.success && Array.isArray(data.highlights) && bookIdRef.current === bId) {
            setHighlights(data.highlights);
            persistHighlights(data.highlights);
          }
        })
        .catch(() => { /* keep local removal when offline */ });
    }
  };

  // Tag-aware wrapping of saved highlight texts in <mark>, leaving HTML tags intact
  const applyHighlights = (html: string, list: Highlight[]): string => {
    if (!html || !list.length) return html;
    const parts = html.split(/(<[^>]+>)/g);
    return parts
      .map(part => {
        if (!part || part.startsWith('<')) return part;
        let text = part;
        for (const h of list) {
          if (!h.text) continue;
          const escaped = h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const re = new RegExp(`(${escaped})`, 'g');
          text = text.replace(
            re,
            `<mark class="vb-highlight" data-hl-id="${h.id}" style="background:${h.color};color:inherit;border-radius:2px;padding:0 1px;cursor:pointer;">$1</mark>`
          );
        }
        return text;
      })
      .join('');
  };

  // Show the create-highlight toolbar when the user selects text in the reading area
  const handleContentMouseUp = () => {
    if (!getHighlightsKey()) return; // requires a logged-in user
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const text = sel.toString().trim();
    if (!text || text.length < 2) return;
    const range = sel.getRangeAt(0);
    if (!contentRef.current || !contentRef.current.contains(range.commonAncestorContainer)) return;
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) return;
    setHlPopup({ x: rect.left + rect.width / 2, y: rect.top, text, mode: 'create' });
  };

  // Click an existing highlight to offer removal
  const handleContentClick = (e: React.MouseEvent) => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return; // an active selection is being made
    const mark = (e.target as HTMLElement).closest('mark.vb-highlight') as HTMLElement | null;
    if (mark) {
      const id = mark.getAttribute('data-hl-id') || undefined;
      const rect = mark.getBoundingClientRect();
      setHlPopup({ x: rect.left + rect.width / 2, y: rect.top, text: '', mode: 'remove', id });
    } else if (hlPopup) {
      setHlPopup(null);
    }
  };

  const jumpToHighlight = (h: Highlight) => {
    setShowHighlights(false);
    setHlPopup(null);
    setCurrentPage(h.page);
    setPageInputValue(h.page.toString());
    if (loadedPages.some(p => p.page === h.page)) {
      requestAnimationFrame(() => scrollToPageAnchor(h.page));
    }
  };

  // Keep refs in sync for use inside async DB-reconcile callbacks
  useEffect(() => { bookIdRef.current = bookId; }, [bookId]);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  // Load this user's bookmark + highlights whenever the book or user changes.
  // localStorage is read first for instant display, then reconciled from the DB.
  useEffect(() => {
    const key = getHighlightsKey();
    bookmarkAppliedRef.current = false;
    if (!key) {
      setHighlights([]);
      return;
    }
    // Instant cache
    try {
      const saved = localStorage.getItem(key);
      setHighlights(saved ? JSON.parse(saved) : []);
    } catch (e) {
      console.error('Error loading highlights:', e);
      setHighlights([]);
    }
    // Reconcile from DB (source of truth, enables cross-device sync)
    const token = getAuthToken();
    const bId = bookId;
    if (!token || !bId) return;
    let cancelled = false;
    fetch(`${BACKEND_API_URL}/users/progress/${bId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled || bookIdRef.current !== bId || !data || !data.success) return;
        // Highlights
        if (Array.isArray(data.highlights)) {
          setHighlights(data.highlights);
          try { localStorage.setItem(key, JSON.stringify(data.highlights)); } catch { /* ignore */ }
        }
        // Bookmark
        const bkKey = getBookmarkKey();
        if (data.bookmark && typeof data.bookmark.page === 'number') {
          if (bkKey) {
            try {
              localStorage.setItem(bkKey, JSON.stringify({ page: data.bookmark.page, timestamp: Date.now(), bookTitle: bookTitle || `Book ${bId}` }));
            } catch { /* ignore */ }
          }
          setIsBookmarked(true);
          // Apply the saved page only if the reader is still at the start (e.g. first
          // open on a new device where there was no local bookmark).
          if (data.bookmark.page > 1 && currentPageRef.current === 1 && !bookmarkAppliedRef.current) {
            bookmarkAppliedRef.current = true;
            setCurrentPage(data.bookmark.page);
            setPageInputValue(String(data.bookmark.page));
          }
        } else {
          if (bkKey) localStorage.removeItem(bkKey);
          setIsBookmarked(false);
        }
      })
      .catch(() => { /* keep local cache when offline */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, authUser, user]);

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPageInputValue(value);
  };

  const handlePageInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const page = parseInt(pageInputValue);
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
        if (loadedPages.some(p => p.page === page)) {
          requestAnimationFrame(() => scrollToPageAnchor(page));
        }
        e.currentTarget.blur();
      } else {
        // Reset to current page if invalid
        setPageInputValue(currentPage.toString());
      }
    }
  };

  const handlePageInputBlur = () => {
    const page = parseInt(pageInputValue);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      if (loadedPages.some(p => p.page === page)) {
        requestAnimationFrame(() => scrollToPageAnchor(page));
      }
    } else {
      // Reset to current page if invalid
      setPageInputValue(currentPage.toString());
    }
  };

  // Extract chapters/sections from content
  const chapters = content.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi) || [];

  // Create loading component for main content area
  const LoadingContent = () => (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100">
      <div className="text-center">
        <div className="relative mx-auto mb-8" style={{ width: '200px', height: '150px' }}>
          {/* Animated book pages */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-white border border-amber-300 rounded-r-lg shadow-lg"
              style={{
                width: '180px',
                height: '120px',
                left: `${i * 2}px`,
                top: `${i * 2}px`,
                transformOrigin: 'left center',
                animation: `pageFlipToLeft 4s ease-in-out infinite ${i * 0.5}s`,
                zIndex: 8 - i
              }}
            >
              <div className="p-3 h-full flex flex-col">
                <div className="h-2 bg-amber-200 rounded mb-1"></div>
                <div className="h-1 bg-amber-100 rounded mb-1"></div>
                <div className="h-1 bg-amber-100 rounded mb-2"></div>
                <div className="h-1 bg-amber-100 rounded mb-1"></div>
                <div className="h-1 bg-amber-100 rounded"></div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-lg font-medium text-amber-800 mb-6 h-8">
          <span
            key={currentTextIndex}
            style={{
              animation: 'showTwoWords 1s ease-in-out'
            }}
          >
            {loadingTexts[currentTextIndex]}
          </span>
        </div>

        <div className="w-64 mx-auto">
          <div 
            className="h-2 bg-amber-300 rounded-full overflow-hidden"
            style={{
              animation: 'progressFlow 3s ease-in-out infinite'
            }}
          >
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pageFlipToLeft {
          0% { 
            transform: rotateY(0deg);
            z-index: 10;
          }
          25% { 
            transform: rotateY(-45deg);
            z-index: 10;
          }
          50% { 
            transform: rotateY(-90deg);
            z-index: 10;
          }
          75% { 
            transform: rotateY(-135deg);
            z-index: 5;
          }
          100% { 
            transform: rotateY(-180deg);
            z-index: 5;
          }
        }
        
        @keyframes showTwoWords {
          0%, 10% { 
            opacity: 1;
            transform: scale(1.05);
          }
          12.5%, 100% { 
            opacity: 0;
            transform: scale(1);
          }
        }
        
        @keyframes progressFlow {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );

  return (
    <>
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {/* Header Bar */}
        <Header
          user={user}
          onLogout={onLogout}
          onViewChange={onViewChange}
          selectedLanguage={selectedLanguage}
          languageConfig={languageConfig}
          onLanguageToggle={toggleLanguage}
          onZoomIn={increaseFontSize}
          onZoomOut={decreaseFontSize}
        />

        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>

          {/* Mobile overlay backdrop */}
          {isMobile && isCategoryPanelVisible && (
            <div
              onClick={() => setIsCategoryPanelVisible(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 40,
              }}
            />
          )}

          {/* Categories Panel — drawer on mobile, inline on desktop */}
          {isCategoryPanelVisible && (
            <div
              style={isMobile ? {
                position: 'fixed',
                left: 0,
                top: 0,
                bottom: 0,
                zIndex: 50,
                width: '85vw',
                maxWidth: '320px',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                boxShadow: '4px 0 24px rgba(0,0,0,0.25)',
              } : {
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                flex: '0 0 18rem',
                width: '18rem',
                maxHeight: '100%',
                overflow: 'hidden',
              }}
            >
              <CategoryPanel
                selectedLanguage={selectedLanguage}
                languageConfig={languageConfig}
                loadingBooks={loadingBooks}
                expandedCategories={expandedCategories}
                bookId={bookId}
                highlightCategory={highlightCategory}
                onCategoryToggle={toggleCategoryExpanded}
                onBookSelection={handleBookSelection}
                onFoldAll={foldAllCategories}
                onUnfoldAll={unfoldAllCategories}
                bookChapters={bookChapters}
                currentPage={currentPage}
                onChapterSelect={(pageNumber) => {
                  console.log('EBookReader: Navigating to chapter page', pageNumber);
                  setCurrentPage(pageNumber);
                  setPageInputValue(pageNumber.toString());
                  if (loadedPages.some(p => p.page === pageNumber)) {
                    requestAnimationFrame(() => scrollToPageAnchor(pageNumber));
                  }
                  if (isMobile) setIsCategoryPanelVisible(false);
                }}
                refreshKey={categoryPanelRefreshKey}
                onClose={() => setIsCategoryPanelVisible(false)}
              />
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col ebook-reader-content" style={{ background: 'var(--bg)', flex: 1, minHeight: 0, overflowY: 'auto' }}>

            {/* Compact "Show sidebar" control — only when the sidebar is collapsed.
                When the sidebar is open it's hidden inside the sidebar header, so
                this row disappears and the reading content moves up. */}
            {!isCategoryPanelVisible && (
              <div
                className="hidden md:flex items-center gap-2 px-3 py-1.5 flex-shrink-0 border-b"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              >
                <button
                  onClick={toggleCategoryPanel}
                  title="Expand sidebar"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 10px 3px 6px',
                    borderRadius: 6,
                    background: 'var(--card-hover)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    color: 'var(--text-light)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                  }}
                >
                  <ChevronRight size={15} />
                  Show sidebar
                </button>
              </div>
            )}

            {/* Search Bar */}
            {bookId && content && (
              <div className="px-3 py-2 border-b ebook-reader-searchbar" style={{ background: 'var(--search-bar-bg)', borderColor: 'var(--border)' }}>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={16} style={{ color: 'var(--icon)' }} />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={handleSearchChange}
                      onKeyDown={handleSearchKeyDown}
                      placeholder={`Search in "${displayTitle}"...`}
                      className="w-full pl-9 pr-4 py-2 rounded-lg search-input text-sm"
                      style={{
                        background: 'var(--search-input-bg, var(--search-bar-bg))',
                        color: 'var(--search-input-text, var(--input-text))',
                        border: '1px solid var(--search-input-border, var(--input-border))',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                    <button
                      onClick={handleSearchSubmit}
                      className="reader-search-submit px-3 py-2 rounded-lg font-semibold transition-colors text-sm w-full sm:w-auto"
                      style={{ background: 'var(--btn-dark-bg)', color: 'var(--btn-dark-text)', border: '1px solid var(--border-strong)' }}
                      title="Search this book"
                    >
                      Search
                    </button>

                    {/* Search Results Navigation */}
                    {showSearchResults && searchResults.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-light)' }}>
                          {currentSearchIndex + 1}/{searchResults.length}
                        </span>
                        <button
                          onClick={goToPreviousSearchResult}
                          className="p-1 rounded"
                          style={{ color: 'var(--accent)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--card)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          disabled={searchResults.length <= 1}
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          onClick={goToNextSearchResult}
                          className="p-1 rounded"
                          style={{ color: 'var(--accent)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--card)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          disabled={searchResults.length <= 1}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Search Results Summary */}
                {showSearchResults && (
                  <div className="mt-1 text-xs" style={{ color: 'var(--text-light)' }}>
                    {searchResults.length > 0 ? `Found ${searchResults.length} matches` : searchQuery && 'No matches found'}
                  </div>
                )}
              </div>
            )}
            
            {bookId && error ? (
              <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--book-content-bg)' }}>
                <div className="text-center px-6">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: 'red' }} />
                  <p className="text-lg mb-4" style={{ color: 'var(--text)' }}>{error}</p>
                  <button
                    onClick={() => { setError(''); loadContent(); }}
                    className="px-4 py-2 rounded-lg font-semibold"
                    style={{ background: 'var(--accent)', color: 'var(--btn-primary-text)', border: 'none', cursor: 'pointer' }}
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : bookId && isLoading ? (
              <LoadingContent />
            ) : bookId && content ? (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Search Results Display */}
                {isSearchMode && searchResults.length > 0 && (
                  <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--reader-bg)', minHeight: 0 }}>
                    {/* Results Header */}
                    <div
                      className="flex items-center justify-between px-6 py-4 flex-shrink-0 sticky top-0 z-40"
                      style={{
                        background: 'var(--header-bg)',
                        borderBottom: '2px solid var(--header-border)',
                      }}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-bold text-base tracking-wide" style={{ color: 'var(--header-text)' }}>
                            Search Results
                          </span>
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--accent)', color: 'var(--btn-primary-text)' }}
                          >
                            {searchResults.length} matches
                          </span>
                        </div>
                        <p className="text-xs mt-1 truncate" style={{ color: 'var(--accent-deep)', opacity: 0.9 }}>
                          for{' '}
                          <span className="font-semibold italic" style={{ color: 'var(--accent)' }}>
                            &ldquo;{searchQuery}&rdquo;
                          </span>
                          {searchResults.length > 0 && (
                            <span className="ml-2 opacity-70">
                              · Pages:{' '}
                              {[...new Set(searchResults.map(r => r.pageIndex + 1))]
                                .sort((a, b) => a - b)
                                .slice(0, 15)
                                .join(', ')}
                              {[...new Set(searchResults.map(r => r.pageIndex + 1))].length > 15 ? '…' : ''}
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setIsSearchMode(false);
                          setSearchQuery('');
                          setSearchInput('');
                          setSearchResults([]);
                          setShowSearchResults(false);
                        }}
                        className="flex-shrink-0 ml-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                        style={{
                          color: 'var(--header-text)',
                          border: '1px solid var(--header-border)',
                          background: 'rgba(255,255,255,0.08)',
                        }}
                        title="Close search"
                      >
                        ✕ Close
                      </button>
                    </div>

                    {/* Results List */}
                    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--reader-bg)' }}>
                      {Object.entries(
                        searchResults.reduce((acc, result) => {
                          const key = result.paragraphIndex ?? `no-paragraph-${result.pageIndex}`;
                          if (!acc[key]) acc[key] = [];
                          acc[key].push(result);
                          return acc;
                        }, {} as Record<string, typeof searchResults>)
                      ).map(([paragraphKey, group], groupIdx, arr) => (
                        <div key={paragraphKey}>
                          {/* Result Row */}
                          <div
                            className="px-6 py-4 cursor-pointer transition-colors"
                            style={{ background: 'transparent' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--content-item-hover)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                            onClick={() => {
                              setCurrentPage(group[0].pageIndex + 1);
                              setPageInputValue((group[0].pageIndex + 1).toString());
                              setLastSearchWord(group[0].match || searchQuery);
                              setSearchQuery(group[0].match || searchQuery);
                              setIsSearchMode(false);
                              setSearchResults([]);
                            }}
                          >
                            {/* Metadata row */}
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span
                                className="text-xs font-bold px-2 py-0.5 rounded"
                                style={{
                                  background: 'var(--accent)',
                                  color: 'var(--btn-primary-text)',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                Page {group[0].pageIndex + 1}
                              </span>
                              <span className="text-xs font-medium" style={{ color: 'var(--book-content-text-light)' }}>
                                {bookTitle || title}
                              </span>
                              <span className="text-xs" style={{ color: 'var(--book-content-text-light)', opacity: 0.7 }}>
                                · §{group[0].paragraphIndex !== undefined ? group[0].paragraphIndex + 1 : '?'}
                              </span>
                              <span className="text-xs ml-auto" style={{ color: 'var(--book-content-text-light)', opacity: 0.7 }}>
                                {group.length > 1
                                  ? `${group.length} matches in paragraph`
                                  : `Match ${searchResults.indexOf(group[0]) + 1}`}
                              </span>
                            </div>

                            {/* Match texts */}
                            {group.map((result, idx) => (
                              <div
                                key={idx}
                                className={idx > 0 ? 'mt-3 pt-3' : ''}
                                style={idx > 0 ? { borderTop: '1px dashed var(--reader-border)' } : {}}
                                onClick={group.length > 1 ? (e) => {
                                  e.stopPropagation();
                                  setCurrentPage(result.pageIndex + 1);
                                  setPageInputValue((result.pageIndex + 1).toString());
                                  setLastSearchWord(result.match || searchQuery);
                                  setSearchQuery(result.match || searchQuery);
                                  setIsSearchMode(false);
                                  setSearchResults([]);
                                } : undefined}
                              >
                                {group.length > 1 && (
                                  <span className="text-xs mb-1 block" style={{ color: 'var(--book-content-text-light)', opacity: 0.7 }}>
                                    Match {searchResults.indexOf(result) + 1}
                                  </span>
                                )}
                                <p
                                  className="leading-relaxed"
                                  style={{ fontSize: '0.97rem', color: 'var(--book-content-text)', fontWeight: 400, lineHeight: 1.75 }}
                                  dangerouslySetInnerHTML={{ __html: highlightSearchWord(result.context, result.match || searchQuery) }}
                                />
                              </div>
                            ))}
                          </div>

                          {/* Divider */}
                          {groupIdx < arr.length - 1 && (
                            <div
                              style={{
                                height: '1px',
                                background: 'var(--border)',
                                margin: '0 1.5rem',
                                opacity: 0.6,
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Normal Reading Mode */}
                {!isSearchMode && (
                  <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Reading Controls */}
                    <div className="border-b px-3 py-2 flex-shrink-0" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Mobile: toggle category panel */}
                          <button
                            className="md:hidden flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0 text-xs font-semibold"
                            onClick={toggleCategoryPanel}
                            title="Browse Library"
                            style={{
                              color: isCategoryPanelVisible ? 'var(--btn-dark-text)' : 'var(--text)',
                              background: isCategoryPanelVisible ? 'var(--btn-dark-bg)' : 'var(--card-hover)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            Library
                          </button>
                          {/* Desktop: toggle category panel */}
                          <button
                            className="hidden md:flex items-center justify-center flex-shrink-0"
                            onClick={toggleCategoryPanel}
                            title={isCategoryPanelVisible ? 'Collapse sidebar' : 'Expand sidebar'}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              background: 'var(--card-hover)',
                              border: '1px solid var(--border)',
                              cursor: 'pointer',
                              color: 'var(--text-light)',
                            }}
                          >
                            {isCategoryPanelVisible ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                          </button>
                          <BookOpen
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: 'var(--text-light)', marginTop: '1px' }}
                          />
                          <span className="font-bold text-sm sm:text-base truncate" style={{ color: 'var(--text-light)' }}>{title}</span>
                        </div>

                        <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-2 flex-shrink-0">
                          <div className="flex items-center justify-between sm:justify-start gap-2">
                            <div className="flex items-center gap-0.5 rounded-lg px-1 py-0.5" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                              <button
                                onClick={decreaseFontSize}
                                className="px-2 py-1 rounded-md transition-colors text-xs font-semibold"
                                style={{ color: 'var(--text-muted)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--card-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                                title="Decrease font size"
                              >
                                A-
                              </button>

                              <span className="text-xs sm:text-sm px-1.5 sm:px-2 font-semibold whitespace-nowrap" style={{ color: 'var(--text-light)' }}>{fontSize}px</span>

                              <button
                                onClick={increaseFontSize}
                                className="px-2 py-1 rounded-md transition-colors text-xs font-semibold"
                                style={{ color: 'var(--text-muted)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--card-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                                title="Increase font size"
                              >
                                A+
                              </button>
                            </div>

                            <button
                              onClick={toggleBookmark}
                              className="p-2 rounded-lg transition-colors"
                              style={isBookmarked
                                ? { color: 'var(--accent)', background: 'var(--card-hover)' }
                                : { color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)' }
                              }
                              title={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
                            >
                              {isBookmarked ? (
                                <BookmarkCheck className="w-4 h-4" />
                              ) : (
                                <Bookmark className="w-4 h-4" />
                              )}
                            </button>

                            {(user || authUser) && (
                              <button
                                onClick={() => setShowHighlights(true)}
                                className="relative p-2 rounded-lg transition-colors"
                                style={highlights.length > 0
                                  ? { color: 'var(--accent)', background: 'var(--card-hover)' }
                                  : { color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)' }
                                }
                                title="Select text in the book to highlight. Click here to view your highlights."
                              >
                                <Highlighter className="w-4 h-4" />
                                {highlights.length > 0 && (
                                  <span
                                    className="absolute -top-1 -right-1 text-[10px] font-bold rounded-full px-1 min-w-[16px] text-center"
                                    style={{ background: 'var(--accent)', color: 'var(--btn-primary-text)', lineHeight: '16px' }}
                                  >
                                    {highlights.length}
                                  </span>
                                )}
                              </button>
                            )}
                          </div>

                          {/* Page Navigation */}
                          <div className="flex items-center justify-center gap-0.5 rounded-lg px-1 py-0.5" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                            <button
                              onClick={goToPreviousPage}
                              disabled={currentPage === 1}
                              className="p-2 rounded-lg transition-colors"
                              style={{ color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-light)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1 }}
                              onMouseEnter={e => { if (currentPage !== 1) { (e.currentTarget as HTMLButtonElement).style.background = 'var(--card-hover)'; } }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                              title="Previous page"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>

                            <div className="flex items-center space-x-1 min-w-0 text-center">
                              <input
                                type="number"
                                value={pageInputValue}
                                onChange={handlePageInput}
                                onKeyDown={handlePageInputSubmit}
                                onBlur={handlePageInputBlur}
                                min={1}
                                max={totalPages}
                                className="w-11 sm:w-12 text-xs sm:text-sm text-center rounded px-1 py-0.5 focus:outline-none"
                                style={{ border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                              />
                              <span className="text-xs sm:text-sm whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>/ {totalPages}</span>
                            </div>

                            <button
                              onClick={goToNextPage}
                              disabled={currentPage >= totalPages}
                              className="p-2 rounded-lg transition-colors"
                              style={{ color: currentPage >= totalPages ? 'var(--text-muted)' : 'var(--text-light)', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', opacity: currentPage >= totalPages ? 0.4 : 1 }}
                              onMouseEnter={e => { if (currentPage < totalPages) { (e.currentTarget as HTMLButtonElement).style.background = 'var(--card-hover)'; } }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                              title="Next page"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Book Content */}
                    <div ref={contentRef} onScroll={handleContentScroll} onMouseUp={handleContentMouseUp} onClick={handleContentClick} className="flex-1 overflow-y-auto p-3 sm:p-6 ebook-reader-book-content" style={{ background: 'var(--book-content-bg)', color: 'var(--book-content-text)' }}>
                      <div
                        className="prose max-w-none leading-relaxed"
                        style={{ fontSize: `${fontSize}px`, lineHeight: lineHeight, color: 'var(--book-content-text)' }}
                        dangerouslySetInnerHTML={{
                          __html: highlightedContent
                        }}
                      />
                      {/* Bottom padding so FAB doesn't obscure last line on mobile */}
                      {isMobile && <div style={{ height: '5rem' }} />}
                    </div>

                    {/* Mobile FAB — Browse Library */}
                    {isMobile && !isCategoryPanelVisible && (
                      <button
                        onClick={() => setIsCategoryPanelVisible(true)}
                        style={{
                          position: 'fixed',
                          bottom: '1.25rem',
                          right: '1.25rem',
                          zIndex: 35,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          padding: '0.65rem 1.1rem',
                          borderRadius: '999px',
                          background: 'linear-gradient(135deg, #b45309, #d97706)',
                          color: '#fef3c7',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 4px 16px rgba(180,83,9,0.45)',
                          fontFamily: 'inherit',
                        }}
                        title="Browse Library"
                      >
                        <BookOpen className="w-4 h-4" />
                        Browse Library
                      </button>
                    )}

                  </div>
                )}
              </div>
            ) : bookId && !content && !isLoading ? (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h2 className="text-xl font-semibold text-gray-700 mb-2">Book Not Found</h2>
                  <p className="text-gray-500 mb-2">The selected book could not be loaded</p>
                  <p className="text-gray-500">Please try selecting another book</p>
                  {isMobile && (
                    <button
                      onClick={() => setIsCategoryPanelVisible(true)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm"
                      style={{ background: '#b45309', color: '#fef3c7', border: 'none', cursor: 'pointer' }}
                    >
                      <BookOpen className="w-4 h-4" /> Browse Library
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* ── Welcome Screen ────────────────────────────── */
              <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
                {/* Banner */}
                <div style={{
                  background: 'var(--panel-header-gradient)',
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--header-badge-bg)',
                    border: '1.5px solid var(--header-badge-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent)', fontSize: '1.2rem',
                  }}>✦</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ color: 'var(--panel-header-color)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.35rem', fontFamily: '"Gentium Plus", "Noto Serif Devanagari", Georgia, serif' }}>
                      Welcome to Your Vedic Library
                    </h2>
                    <p style={{ color: 'var(--panel-header-color)', opacity: 0.78, fontSize: '0.82rem', lineHeight: 1.6 }}>
                      Browse sacred Śruti &amp; Smṛti literature. Select a text from the categories to begin your study.
                    </p>
                    <p style={{ color: 'var(--accent)', fontSize: '0.78rem', marginTop: '0.5rem', fontStyle: 'italic', opacity: 0.9 }}>
                      ॥ सा विद्या या विमुक्तये ॥
                    </p>
                    {/* Mobile: open category panel button */}
                    {isMobile && (
                      <button
                        onClick={() => setIsCategoryPanelVisible(true)}
                        style={{
                          marginTop: '1rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.5rem 1.1rem',
                          borderRadius: '999px',
                          background: 'var(--accent)',
                          color: 'var(--btn-primary-text)',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <BookOpen className="w-4 h-4" />
                        Browse Library
                      </button>
                    )}
                  </div>
                </div>

                {/* Category overview cards */}
                <div style={{ padding: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {[
                    { icon: '📖', title: 'Śruti', sub: '4 categories', desc: 'Vedas & revealed texts' },
                    { icon: '📚', title: 'Smṛti', sub: '6 categories', desc: 'Traditional literature' },
                    { icon: '✨', title: 'Features Guide', sub: 'How to use', desc: 'Tips to read śāstra', onClick: () => setShowFeaturesModal(true) },
                  ].map(card => {
                    const clickable = !!card.onClick;
                    return (
                    <div
                      key={card.title}
                      onClick={card.onClick}
                      role={clickable ? 'button' : undefined}
                      title={clickable ? 'View features guide' : undefined}
                      style={{
                        flex: '1 1 160px',
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.75rem',
                        padding: '1.1rem 1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.85rem',
                        boxShadow: '0 1px 4px rgba(180,120,0,0.07)',
                        cursor: clickable ? 'pointer' : 'default',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={clickable ? (e) => (e.currentTarget.style.background = 'var(--card-hover)') : undefined}
                      onMouseLeave={clickable ? (e) => (e.currentTarget.style.background = 'var(--card)') : undefined}
                    >
                      <span style={{ fontSize: '1.6rem' }}>{card.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>{card.title}</div>
                        <div style={{ color: 'var(--text-light)', fontSize: '0.78rem', marginTop: '0.1rem' }}>{card.sub}</div>
                      </div>
                    </div>
                    );
                  })}
                </div>

                {/* Admin overview — clickable stat cards matching the library cards above */}
                {user?.role === 'admin' && (
                  <div style={{ padding: '0 1.5rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <h3 style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>Administration</h3>
                      <button
                        onClick={() => setAdminStatsReloadKey((prev) => prev + 1)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--accent-deep)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        {adminStatsLoading ? 'Refreshing…' : 'Refresh'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {[
                        { icon: '👥', label: 'Total Users', value: adminStats?.totalUsers ?? 0, target: 'users' as const, hint: 'View all users' },
                        { icon: '🟢', label: 'Logged In', value: adminStats?.loggedInUsers ?? 0, target: 'users' as const, hint: 'Active sessions' },
                        { icon: '📕', label: 'Total Books', value: adminStats?.totalBooks ?? 0, target: 'books' as const, hint: 'View all books' },
                      ].map(stat => (
                        <button
                          key={stat.label}
                          onClick={() => openAdminModalFromWelcome(stat.target)}
                          title={stat.hint}
                          style={{
                            flex: '1 1 160px',
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: '0.75rem',
                            padding: '1.1rem 1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.85rem',
                            boxShadow: '0 1px 4px rgba(180,120,0,0.07)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--card-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}
                        >
                          <span style={{ fontSize: '1.6rem' }}>{stat.icon}</span>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1.35rem', lineHeight: 1.1 }}>
                              {adminStatsLoading ? '…' : stat.value}
                            </div>
                            <div style={{ color: 'var(--text-light)', fontSize: '0.78rem', marginTop: '0.15rem' }}>{stat.label}</div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {adminStatsError && (
                      <div style={{ marginTop: '0.65rem', fontSize: '0.78rem', color: '#b91c1c' }}>{adminStatsError}</div>
                    )}
                  </div>
                )}

                {/* Recently viewed */}
                {visibleBooks.length > 0 && (
                  <div style={{ padding: '0 1.5rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <h3 style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>Recently available</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {visibleBooks.slice(0, 5).map(book => (
                        <button
                          key={book._id}
                          onClick={() => onBookSelect && onBookSelect(book)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.75rem 1rem',
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderLeft: '3px solid var(--accent-deep)',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--card-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem' }}>{book.title}</div>
                            {book.author && (
                              <div style={{ color: 'var(--text-light)', fontSize: '0.75rem', marginTop: '0.15rem' }}>{book.author}</div>
                            )}
                          </div>
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 600,
                            padding: '0.15rem 0.55rem',
                            borderRadius: '999px',
                            background: 'var(--header-badge-bg)',
                            border: '1px solid var(--header-badge-border)',
                            color: 'var(--text-light)',
                            flexShrink: 0,
                            marginLeft: '0.75rem',
                          }}>Śruti</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Floating highlight toolbar (create / remove) */}
      {hlPopup && (
        <div
          style={{
            position: 'fixed',
            left: Math.min(Math.max(hlPopup.x, 90), (typeof window !== 'undefined' ? window.innerWidth : 1000) - 90),
            top: Math.max(hlPopup.y - 52, 8),
            transform: 'translateX(-50%)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.4rem 0.5rem',
            borderRadius: '0.6rem',
            background: 'var(--modal-bg)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}
          onMouseDown={e => e.preventDefault()}
        >
          {hlPopup.mode === 'create' ? (
            <>
              {HIGHLIGHT_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => addHighlight(c.value)}
                  title={`Highlight (${c.label})`}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: c.value,
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                />
              ))}
              <button
                onClick={() => setHlPopup(null)}
                title="Cancel"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => hlPopup.id && removeHighlight(hlPopup.id)}
              title="Remove highlight"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.6rem', borderRadius: '0.45rem', background: 'transparent', border: 'none', color: 'var(--modal-error)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          )}
        </div>
      )}

      {/* Highlights list panel */}
      {showHighlights && (
        <div
          onClick={() => setShowHighlights(false)}
          style={{ position: 'fixed', inset: 0, background: 'var(--modal-overlay)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="vb-modal"
            style={{ width: '100%', maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.4rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontWeight: 800, color: 'var(--accent-deep)', fontSize: '1.15rem', fontFamily: '"Gentium Plus", "Noto Serif Devanagari", Georgia, serif' }}>
                My Highlights{highlights.length > 0 ? ` (${highlights.length})` : ''}
              </h2>
              <button
                onClick={() => setShowHighlights(false)}
                aria-label="Close"
                style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--header-badge-border)', background: 'var(--header-badge-bg)', color: 'var(--panel-header-color)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '0.75rem 1.4rem 1.2rem', overflowY: 'auto' }}>
              {highlights.length === 0 ? (
                <div style={{ color: 'var(--text-light)', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' }}>
                  No highlights yet. Select any text in the book and pick a colour to mark important points.
                </div>
              ) : (
                [...highlights].sort((a, b) => a.page - b.page || a.createdAt - b.createdAt).map(h => (
                  <div
                    key={h.id}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.7rem 0', borderBottom: '1px solid var(--border)' }}
                  >
                    <span style={{ flexShrink: 0, width: 14, height: 14, borderRadius: '50%', background: h.color, border: '1px solid var(--border)', marginTop: 4 }} />
                    <button
                      onClick={() => jumpToHighlight(h)}
                      title="Go to this highlight"
                      style={{ flex: 1, textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <div style={{ color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        “{h.text}”
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.2rem' }}>Page {h.page}</div>
                    </button>
                    <button
                      onClick={() => removeHighlight(h.id)}
                      title="Delete highlight"
                      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '0.4rem', background: 'transparent', border: 'none', color: 'var(--modal-error)', cursor: 'pointer' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Features guide modal */}
      {showFeaturesModal && (
        <div
          onClick={() => setShowFeaturesModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '0.9rem',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
            }}
          >
            {/* Modal header */}
            <div style={{
              background: 'var(--panel-header-gradient)',
              padding: '1.1rem 1.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                <span style={{ fontSize: '1.4rem' }}>✨</span>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ color: 'var(--panel-header-color)', fontSize: '1.1rem', fontWeight: 700, fontFamily: '"Gentium Plus", "Noto Serif Devanagari", Georgia, serif' }}>
                    Features Guide
                  </h2>
                  <p style={{ color: 'var(--panel-header-color)', opacity: 0.8, fontSize: '0.78rem', marginTop: '0.1rem' }}>
                    Everything you need to read śāstra comfortably
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFeaturesModal(false)}
                aria-label="Close"
                style={{
                  flexShrink: 0,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: '1px solid var(--header-badge-border)',
                  background: 'var(--header-badge-bg)',
                  color: 'var(--panel-header-color)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '1.2rem 1.4rem', overflowY: 'auto' }}>
              {[
                { icon: '🌐', title: 'Read in your language', body: 'Use the EN / TE / संस्कृत buttons in the top bar to switch between English, Telugu and Sanskrit. The category tree and book lists update to show only that language.' },
                { icon: '🌳', title: 'Browse by category', body: 'Open the sidebar to explore the Śruti and Smṛti tree. Expand a category to reach a text, then click the book title to start reading. Use Fold all / Unfold all to manage the tree.' },
                { icon: '🔎', title: 'Search inside a book', body: 'While a book is open, type a word in the search bar and press Search. Matching passages are listed with page numbers — click any result to jump straight to that page with the word highlighted.' },
                { icon: '🔖', title: 'Bookmarks & auto-resume', body: 'Tap the bookmark icon to save your spot. Your last read page is also remembered automatically, so reopening a book brings you back where you left off.' },
                { icon: '🖍️', title: 'Highlight important points', body: 'Select any text in a book and pick a colour to highlight it. Your highlights are saved per book — open the highlighter icon in the toolbar to review them, jump to a passage, or delete one. Click a highlight to remove it.' },
                { icon: '📜', title: 'Continuous reading', body: 'Pages flow like a document — just keep scrolling and the next page loads automatically. The page indicator and progress stay in sync with what you see.' },
                { icon: '🧭', title: 'Chapter navigation', body: 'When a book is open, its chapters appear under the title in the sidebar. Click a chapter to jump directly to it.' },
                { icon: '🔠', title: 'Adjust text size', body: 'Use A- / A+ in the reading toolbar (or the zoom icons in the header) to make the text larger or smaller for comfortable reading.' },
                { icon: '📑', title: 'Page jump', body: 'Type a page number in the page box and press Enter, or use the ‹ › arrows to move one page at a time.' },
                { icon: '🎨', title: 'Choose your theme', body: 'Open Settings to switch between display themes — Light, Dark and Midnight Teal. The whole app, including menus and reading pages, instantly adapts, and your choice is remembered for next time.' },
              ].map(feature => (
                <div
                  key={feature.title}
                  style={{
                    display: 'flex',
                    gap: '0.85rem',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: '1.3rem', flexShrink: 0, lineHeight: 1.3 }}>{feature.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>{feature.title}</div>
                    <div style={{ color: 'var(--text-light)', fontSize: '0.82rem', marginTop: '0.2rem', lineHeight: 1.55 }}>{feature.body}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal footer */}
            <div style={{ padding: '0.9rem 1.4rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowFeaturesModal(false)}
                style={{
                  padding: '0.5rem 1.2rem',
                  borderRadius: '0.55rem',
                  background: 'var(--accent)',
                  color: 'var(--btn-primary-text)',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EBookReader;