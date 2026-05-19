'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, ArrowLeft, Settings, SkipForward, SkipBack, AlertCircle, Bookmark, BookmarkCheck, User, Upload, Bug, ChevronDown, Plus, FileText, Search } from 'lucide-react';
import { updateBookProgress, fetchBookContent, fetchBooks, Book } from '../lib/bookStorage';
import { useAuth } from '../contexts/AuthContext';
import Header from './Header';
import CategoryPanel from './CategoryPanel';

interface EBookReaderProps {
  bookId?: string;
  title?: string;
  user?: { role: string; username: string; name?: string } | null;
  onLogout?: () => void;
  onBookSelect?: (book: Book) => void;
  onViewChange?: (view: 'reading' | 'upload' | 'debug') => void;
  categoryPanelRefreshKey?: number;
}

const EBookReader: React.FC<EBookReaderProps> = ({ bookId, title, user, onLogout, onBookSelect, onViewChange, categoryPanelRefreshKey }) => {
  // Books and categories state
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<{name: string; books: Book[]; expanded: boolean}[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  
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
      return 22; // 22px for both mobile and desktop for better readability
    }
    return 22; // Default for SSR
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
  
  // Backend pagination state
  const [paginationInfo, setPaginationInfo] = useState<any>(null);
  const [isContentHtml, setIsContentHtml] = useState(false);
  const lastLoadedPageRef = useRef<number>(1);
  const bookmarkLoadedRef = useRef<boolean>(false);
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
        return `<span id="${id}" style="background: #ffe066; color: #b45309; font-weight: bold; border-radius: 0.25em; padding: 0 2px;">${match}</span>`;
      } else {
        return `<span style="background: #ffe066; color: #b45309; font-weight: bold; border-radius: 0.25em; padding: 0 2px;">${match}</span>`;
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

  // Organize books into categories
  const organizeBooks = (booksList: Book[]) => {
    // Filter books by selected language first
    const filteredBooks = booksList.filter(book => {
      if (selectedLanguage === 'english') {
        return !book.tags?.some(tag => tag.toLowerCase().includes('telugu') || tag.toLowerCase().includes('sanskrit'));
      } else if (selectedLanguage === 'telugu') {
        return book.tags?.some(tag => tag.toLowerCase().includes('telugu'));
      } else if (selectedLanguage === 'sanskrit') {
        return book.tags?.some(tag => tag.toLowerCase().includes('sanskrit'));
      }
      return true;
    });


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
      
      const apiUrl = `/api/books/${bookId}/search?q=${encodeURIComponent(query)}&limit=200`;
      console.log('📡 Calling search API:', apiUrl);
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📥 API Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API call failed:', { status: response.status, statusText: response.statusText, errorText });
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }
      
      const searchData = await response.json();
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

  const languageConfig = {
    english: { label: 'English books', code: 'EN', icon: 'EN', count: 3 },
    telugu: { label: 'Telugu books', code: 'TE', icon: 'తె', count: 1 },
    sanskrit: { label: 'Sanskrit books', code: 'संस्कृत', icon: 'सं', count: 1 }
  };

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
  const currentPageContent = paginationInfo ? content : (pages[currentPage - 1] || '');
  const displayTitle = bookTitle || title || 'this book';

  // Update highlighted content when page content changes or search query changes
  useEffect(() => {
    let highlighted = currentPageContent;
    // Apply search highlighting if there's a search query
    if (searchQuery && searchQuery.trim() && highlighted) {
      // Only add IDs in main reading area (not in search results panel)
      highlighted = highlightSearchWord(highlighted, searchQuery, { addIds: true, page: currentPage });
    }
    setHighlightedContent(highlighted);
  }, [currentPageContent, searchQuery, currentPage]);

  // Reload content when page changes (for backend pagination)
  useEffect(() => {
    console.log('Page reload useEffect triggered:', {
      bookId,
      currentPage, 
      lastLoaded: lastLoadedPageRef.current,
      shouldReload: bookId && currentPage !== lastLoadedPageRef.current
    });
    
    if (bookId && currentPage !== lastLoadedPageRef.current) {
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
  }, [currentPage, bookId]);

  // Auto-scroll to current search result when page content updates
  useEffect(() => {
    if (isSearchMode && searchResults.length > 0 && highlightedContent && currentSearchIndex < searchResults.length) {
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
      const newDefaultSize = 22;
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
        setFontSize(22); // Reset to default
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
    }
  };

  const toggleBookmark = () => {
    if (isBookmarked) {
      removeBookmark();
    } else {
      saveBookmark(currentPage);
    }
  };

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPageInputValue(value);
  };

  const handlePageInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const page = parseInt(pageInputValue);
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{color: 'red'}} />
          <p className="text-lg mb-4" style={{color: 'var(--deep-blue)'}}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg"
            style={{background: 'var(--saffron)', color: 'var(--deep-blue)'}}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
              }}
            >
              <CategoryPanel
                selectedLanguage={selectedLanguage}
                languageConfig={languageConfig}
                loadingBooks={loadingBooks}
                expandedCategories={expandedCategories}
                bookId={bookId}
                onCategoryToggle={toggleCategoryExpanded}
                onBookSelection={handleBookSelection}
                onFoldAll={foldAllCategories}
                onUnfoldAll={unfoldAllCategories}
                bookChapters={bookChapters}
                onChapterSelect={(pageNumber) => {
                  console.log('EBookReader: Navigating to chapter page', pageNumber);
                  setCurrentPage(pageNumber);
                  setPageInputValue(pageNumber.toString());
                  if (isMobile) setIsCategoryPanelVisible(false);
                }}
                refreshKey={categoryPanelRefreshKey}
                onClose={isMobile ? () => setIsCategoryPanelVisible(false) : undefined}
              />
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col ebook-reader-content" style={{ background: 'var(--bg)', flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {/* Search Bar */}
            {bookId && content && (
              <div className="px-3 py-2 border-b border-amber-300 ebook-reader-searchbar" style={{ background: 'var(--search-bar-bg)' }}>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={16} style={{ color: 'var(--icon)' }} />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={handleSearchChange}
                      onKeyDown={handleSearchKeyDown}
                      placeholder={`Search in "${displayTitle}"...`}
                      className="w-full pl-9 pr-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent search-input text-sm"
                      style={{ background: 'var(--search-bar-bg)', color: 'var(--book-content-text)' }}
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={handleSearchSubmit}
                      className="px-3 py-2 rounded-lg font-semibold border border-amber-400 transition-colors text-sm"
                      style={{ background: 'var(--color-vb-action-bg, #0f766e)', color: 'var(--color-vb-action-text, #fff)' }}
                      title="Search this book"
                    >
                      Search
                    </button>

                    {/* Search Results Navigation */}
                    {showSearchResults && searchResults.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-amber-800 whitespace-nowrap">
                          {currentSearchIndex + 1}/{searchResults.length}
                        </span>
                        <button
                          onClick={goToPreviousSearchResult}
                          className="p-1 hover:bg-amber-200 rounded text-amber-700"
                          disabled={searchResults.length <= 1}
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          onClick={goToNextSearchResult}
                          className="p-1 hover:bg-amber-200 rounded text-amber-700"
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
                  <div className="mt-1 text-xs text-amber-800">
                    {searchResults.length > 0 ? `Found ${searchResults.length} matches` : searchQuery && 'No matches found'}
                  </div>
                )}
              </div>
            )}
            
            {bookId && isLoading ? (
              <LoadingContent />
            ) : bookId && content ? (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Search Results Display */}
                {isSearchMode && searchResults.length > 0 && (
                  <div className="flex-1 overflow-auto flex flex-col bg-amber-50" style={{borderRadius: '0.75rem', boxShadow: '0 2px 16px 0 rgba(0,0,0,0.04)', border: '1.5px solid #ffe066', margin: '1.5rem', minHeight: 0}}>
                    <div className="p-4 bg-amber-100 border-b border-amber-200 flex items-center justify-between sticky top-0 z-40">
                      <div>
                        <h3 className="font-semibold text-amber-800 text-lg">Search Results</h3>
                        <p className="text-sm text-amber-700">
                          Found {searchResults.length} matches for "{searchQuery}"
                          {searchResults.length > 0 && (
                            <span className="text-xs text-amber-600 ml-2">
                              (Pages: {[...new Set(searchResults.map(r => r.pageIndex + 1))].sort((a, b) => a - b).slice(0, 20).join(', ')}
                              {[...new Set(searchResults.map(r => r.pageIndex + 1))].length > 20 ? '...' : ''})
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
                        className="text-amber-600 hover:text-amber-800 p-2 text-xl font-bold rounded-full border border-amber-300 bg-white shadow"
                        title="Close search"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-8">
                      {/* Group search results by paragraphIndex */}
                      {Object.entries(
                        searchResults.reduce((acc, result) => {
                          const key = result.paragraphIndex ?? `no-paragraph-${result.pageIndex}`;
                          if (!acc[key]) acc[key] = [];
                          acc[key].push(result);
                          return acc;
                        }, {} as Record<string, typeof searchResults>)
                      ).map(([paragraphKey, group], groupIdx) => (
                        <div
                          key={paragraphKey}
                          className="p-10 rounded-2xl shadow-lg border-2 transition-colors cursor-pointer bg-white border-amber-200 hover:border-amber-400 hover:shadow-2xl"
                          style={{ fontSize: '1.5rem', lineHeight: 2.1 }}
                        >
                          {/* Book name and paragraph info */}
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-lg font-semibold text-amber-700">
                              {bookTitle || title} — Page {group[0].pageIndex + 1}
                            </span>
                            <span className="text-lg text-amber-500">
                              Paragraph {group[0].paragraphIndex !== undefined ? group[0].paragraphIndex + 1 : '?'}
                            </span>
                          </div>
                          {/* Show only the context line for single match, or multiple lines for multiple matches */}
                          {group.length === 1 ? (
                            <div
                              className="mb-4 cursor-pointer hover:bg-amber-100 rounded"
                              onClick={() => {
                                setCurrentPage(group[0].pageIndex + 1);
                                setPageInputValue((group[0].pageIndex + 1).toString());
                                setLastSearchWord(group[0].match || searchQuery);
                                setSearchQuery(group[0].match || searchQuery);
                                setIsSearchMode(false);
                                setSearchResults([]);
                              }}
                            >
                              <span className="block text-sm text-amber-600 mb-1">Match {searchResults.indexOf(group[0]) + 1}</span>
                              <p className="text-2xl text-gray-900 leading-relaxed" style={{fontWeight: 400}} dangerouslySetInnerHTML={{__html: highlightSearchWord(group[0].context, group[0].match || searchQuery)}} />
                            </div>
                          ) : (
                            group.map((result, idx) => (
                              <div
                                key={idx}
                                className="mb-4 cursor-pointer hover:bg-amber-100 rounded"
                                onClick={() => {
                                  setCurrentPage(result.pageIndex + 1);
                                  setPageInputValue((result.pageIndex + 1).toString());
                                  setLastSearchWord(result.match || searchQuery);
                                  setSearchQuery(result.match || searchQuery);
                                  setIsSearchMode(false);
                                  setSearchResults([]);
                                }}
                              >
                                <span className="block text-sm text-amber-600 mb-1">Match {searchResults.indexOf(result) + 1}</span>
                                <p className="text-2xl text-gray-900 leading-relaxed" style={{fontWeight: 400}} dangerouslySetInnerHTML={{__html: highlightSearchWord(result.context, result.match || searchQuery)}} />
                              </div>
                            ))
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
                    <div className="border-b border-gray-200 px-3 py-2 flex-shrink-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Mobile: toggle category panel */}
                          <button
                            className="md:hidden flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0 text-xs font-semibold"
                            onClick={toggleCategoryPanel}
                            title="Browse Library"
                            style={{
                              color: isCategoryPanelVisible ? '#fef3c7' : 'var(--text)',
                              background: isCategoryPanelVisible ? '#b45309' : 'var(--card)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            Library
                          </button>
                          <BookOpen className="w-4 h-4 hidden md:block flex-shrink-0" style={{ color: 'var(--icon)' }} />
                          <span className="font-bold text-sm sm:text-base truncate" style={{ color: 'var(--book-content-text-light)' }}>{title}</span>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={decreaseFontSize}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                            title="Decrease font size"
                          >
                      
                          </button>
                          
                          <span className="text-sm px-2 font-semibold" style={{ color: 'var(--book-content-text-light)' }}>{fontSize}px</span>
                          
                          <button
                            onClick={increaseFontSize}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                            title="Increase font size"
                          >
                            
                          </button>
                          
                          <button
                            onClick={toggleBookmark}
                            className={`p-2 rounded-lg transition-colors ${
                              isBookmarked 
                                ? 'text-yellow-600 bg-yellow-100' 
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                            title={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
                          >
                            {isBookmarked ? (
                              <BookmarkCheck className="w-4 h-4" />
                            ) : (
                              <Bookmark className="w-4 h-4" />
                            )}
                          </button>
                          
                          {/* Page Navigation */}
                          <div className="flex items-center gap-0.5 border-l border-gray-300 pl-2 ml-1">
                            <button
                              onClick={goToPreviousPage}
                              disabled={currentPage === 1}
                              className={`p-2 rounded-lg transition-colors ${
                                currentPage === 1 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                              title="Previous page"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            
                            <div className="flex items-center space-x-1 min-w-[4rem] text-center">
                              <input
                                type="number"
                                value={pageInputValue}
                                onChange={handlePageInput}
                                onKeyDown={handlePageInputSubmit}
                                onBlur={handlePageInputBlur}
                                min={1}
                                max={totalPages}
                                className="w-12 text-sm text-center border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                              />
                              <span className="text-sm" style={{ color: 'var(--book-content-text-light)' }}>/ {totalPages}</span>
                            </div>
                            
                            <button
                              onClick={goToNextPage}
                              disabled={currentPage >= totalPages}
                              className={`p-2 rounded-lg transition-colors ${
                                currentPage >= totalPages 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                              title="Next page"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Book Content */}
                    <div ref={contentRef} className="flex-1 overflow-y-auto p-3 sm:p-6 ebook-reader-book-content" style={{ background: 'var(--book-content-bg)', color: 'var(--book-content-text)' }}>
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
                  background: 'linear-gradient(135deg, #7c4a12, #a16207)',
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(251,191,36,0.12)',
                    border: '1.5px solid rgba(251,191,36,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fbbf24', fontSize: '1.2rem',
                  }}>✦</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ color: '#fef3c7', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.35rem', fontFamily: '"Noto Serif Devanagari", Georgia, serif' }}>
                      Welcome to Your Vedic Library
                    </h2>
                    <p style={{ color: 'rgba(254,243,199,0.78)', fontSize: '0.82rem', lineHeight: 1.6 }}>
                      Browse sacred Śruti &amp; Smṛti literature. Select a text from the categories to begin your study.
                    </p>
                    <p style={{ color: '#fbbf24', fontSize: '0.78rem', marginTop: '0.5rem', fontStyle: 'italic', opacity: 0.9 }}>
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
                          background: '#fbbf24',
                          color: '#78350f',
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
                    { icon: '🔖', title: 'Saved texts', sub: 'Bookmarked', desc: 'Your reading list' },
                  ].map(card => (
                    <div key={card.title} style={{
                      flex: '1 1 160px',
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.75rem',
                      padding: '1.1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      boxShadow: '0 1px 4px rgba(180,120,0,0.07)',
                    }}>
                      <span style={{ fontSize: '1.6rem' }}>{card.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>{card.title}</div>
                        <div style={{ color: 'var(--text-light)', fontSize: '0.78rem', marginTop: '0.1rem' }}>{card.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recently viewed */}
                {books.length > 0 && (
                  <div style={{ padding: '0 1.5rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <h3 style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>Recently available</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {books.slice(0, 5).map(book => (
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
                            borderLeft: '3px solid #b45309',
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
                            background: 'rgba(180,83,9,0.1)',
                            border: '1px solid rgba(180,83,9,0.3)',
                            color: '#92400e',
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
  );
};

export default EBookReader;