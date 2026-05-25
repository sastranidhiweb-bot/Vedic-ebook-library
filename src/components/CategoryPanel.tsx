'use client';

import { Search, Plus, Book as BookIcon, BookOpen, FileText, ChevronRight, ChevronDown, RefreshCw, X } from 'lucide-react';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import { Book } from '../lib/bookStorage';
import { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { BACKEND_API_URL } from '../lib/config';

interface CategoryPanelProps {
  selectedLanguage: string;
  languageConfig: {
    [key: string]: {
      label: string;
      code: string;
      icon: string;
      count: number;
    };
  };
  loadingBooks?: boolean;
  expandedCategories?: {[key: string]: boolean};
  bookId?: string;
  onCategoryToggle?: (category: string) => void;
  onBookSelection: (book: Book) => void;
  onFoldAll?: () => void;
  onUnfoldAll?: () => void;
  onChapterSelect?: (pageNumber: number) => void;
  refreshKey?: number;
  onClose?: () => void;
}

const API_URL = `${BACKEND_API_URL}/categories/tree`;

const CategoryPanel: React.FC<CategoryPanelProps & { bookChapters?: { text: string; wordIndex: number }[] }> = ({
  selectedLanguage,
  languageConfig,
  bookId,
  onBookSelection,
  onChapterSelect,
  onFoldAll,
  onUnfoldAll,
  loadingBooks = false,
  refreshKey,
  onClose,
  ...rest
}) => {
  // Local state for categories and user privileges
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPrivileges, setUserPrivileges] = useState<string[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [manualRefreshKey, setManualRefreshKey] = useState(0);

  // Fetch categories and user privileges on client only
  useEffect(() => {
    setLoading(true);
    // Fetch categories
    axios.get(API_URL)
      .then(res => {
        setCategories(res.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Get user privilege from localStorage/sessionStorage
    let privileges: string[] = ['normal'];
    try {
      const userStr = localStorage.getItem('vedic_user') || sessionStorage.getItem('vedic_user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        setIsAdmin(userObj?.role === 'admin');
        if (userObj.privilegeForBooks) {
          if (Array.isArray(userObj.privilegeForBooks)) {
            privileges = userObj.privilegeForBooks;
          } else if (typeof userObj.privilegeForBooks === 'string') {
            privileges = [userObj.privilegeForBooks];
          }
        }
      } else {
        setIsAdmin(false);
      }
    } catch {
      setIsAdmin(false);
    }
    setUserPrivileges(privileges);
  }, [refreshKey, manualRefreshKey]);
  // (Removed duplicate userPrivileges and userPrivilege declarations. Only use state variable.)

  // Filter categories/books by user privilege (only after privileges loaded)
  const filteredCategories = (userPrivileges ? categories.map(category => ({
    ...category,
    books: category.books ? category.books.filter((book: any) => userPrivileges.includes(book.type)) : [],
    children: category.children ? category.children : [],
  })) : []);


  // Controlled expansion state for the MUI TreeView
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Collect all category/subcategory node IDs recursively, mirroring renderTree's itemId logic
  function getAllCategoryIds(nodes: any[], seen = new Set<string>(), parentId = ''): string[] {
    const ids: string[] = [];
    nodes.forEach((node, idx) => {
      const itemId = node._id
        ? String(node._id)
        : `${parentId}${node.name || node.title || 'node'}-${idx}`;
      if (!seen.has(itemId)) {
        seen.add(itemId);
        ids.push(itemId);
      }
      if (node.children && node.children.length > 0) {
        ids.push(...getAllCategoryIds(node.children, seen, itemId));
      }
    });
    return ids;
  }

  const handleFoldAll = () => setExpandedItems([]);
  const handleUnfoldAll = () => setExpandedItems(getAllCategoryIds(filteredCategories));

  // Track expanded state for each book
  const [expandedBooks, setExpandedBooks] = useState<{ [bookId: string]: boolean }>({});

  const handleBookToggle = (book: Book) => {
    setExpandedBooks(prev => ({
      ...prev,
      [book._id]: !prev[book._id]
    }));
    // Only call onBookSelection if not already selected
    if (book._id !== bookId && onBookSelection) {
      onBookSelection(book);
    }
  };

  const handleUnlinkBook = async (categoryId: string, book: any, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!categoryId || !book?._id) return;
    const confirmed = window.confirm(`Unlink "${book.title}" from this category?`);
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('vedic_auth_token') || sessionStorage.getItem('vedic_auth_token');
      const response = await fetch(`${BACKEND_API_URL}/categories/${categoryId}/unlink-book?bookId=${encodeURIComponent(String(book._id))}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to unlink book from category');
      }

      setManualRefreshKey(k => k + 1);
    } catch (error) {
      console.error('Failed to unlink book:', error);
      const message = error instanceof Error ? error.message : 'Failed to unlink book from category.';
      alert(message);
    }
  };

  // MUI TreeView recursive rendering (always show children and books)
  const renderTree = (nodes: any[], parentId = '') => {
    return nodes.map((node, idx) => {
      const itemId = node._id ? String(node._id) : `${parentId}${node.name || node.title || 'node'}-${idx}`;
      return (
        <TreeItem key={itemId} itemId={itemId} label={node.name || node.title}>
          {/* Render children categories */}
          {node.children && node.children.length > 0 && renderTree(node.children, itemId)}
          {/* Render books at leaf node */}
          {node.books && node.books.length > 0 && node.books.map((book: any, bidx: number) => {
            const bookIdStr = book._id ? `${itemId}-book-${String(book._id)}` : `${itemId}-book-${bidx}`;
            const isSelected = book._id === bookId;
            const isExpanded = !!expandedBooks[book._id];
            return (
              <TreeItem
                key={bookIdStr}
                itemId={bookIdStr}
                label={
                  <div>
                    <span
                      onClick={() => handleBookToggle(book)}
                      style={{ cursor: 'pointer', fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? undefined : undefined, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                        <span style={{ color: 'var(--text)', fontSize: '1em', display: 'inline-block', width: 18, textAlign: 'center', flexShrink: 0 }}>
                          {rest.bookChapters && isSelected ? (
                            isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />
                          ) : ''}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</span>
                      </span>
                      {isAdmin && node?._id && (
                        <button
                          type="button"
                          title="Unlink this book from category"
                          onClick={(event) => handleUnlinkBook(String(node._id), book, event)}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '999px',
                            border: '1px solid #ef4444',
                            color: '#ef4444',
                            background: 'transparent',
                            fontSize: 12,
                            lineHeight: 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          x
                        </button>
                      )}
                    </span>
                    {/* Show chapters if this book is selected, expanded, and bookChapters exist */}
                    {isSelected && isExpanded && rest.bookChapters && rest.bookChapters.length > 0 && (
                      <div style={{ marginTop: 8, marginLeft: 16 }}>
                        {rest.bookChapters.map((chapter, cidx) => (
                          <div
                            key={cidx}
                            style={{ cursor: 'pointer', color: 'var(--accent)', fontSize: '0.95em', padding: '2px 0' }}
                            onClick={e => {
                              e.stopPropagation();
                              if (onChapterSelect) onChapterSelect(chapter.wordIndex + 1);
                            }}
                          >
                            {chapter.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                }
              />
            );
          })}
        </TreeItem>
      );
    });
  };
  const [activeTab, setActiveTab] = useState<'categories' | 'authors' | 'title'>('categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLetters, setExpandedLetters] = useState<{[key: string]: boolean}>({});
  const [expandedAuthors, setExpandedAuthors] = useState<{[key: string]: boolean}>({});
  const [expandedTitleLetters, setExpandedTitleLetters] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    if (!bookId) return;

    const timer = setTimeout(() => {
      const selectedBookElement = document.querySelector(`[data-book-id="${bookId}"]`) as HTMLElement | null;
      if (selectedBookElement) {
        selectedBookElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [bookId]);

  // Organize books by author first letter
  const authorGroups = useMemo(() => {
    const groups: {[key: string]: {author: string; books: Book[]}[]} = {};
    
    // Get all books from all filtered categories
    const allBooks = filteredCategories.flatMap(category => category.books);
    
    // Group books by author
    const authorMap = new Map<string, Book[]>();
    allBooks.forEach(book => {
      if (book.author) {
        if (!authorMap.has(book.author)) {
          authorMap.set(book.author, []);
        }
        authorMap.get(book.author)!.push(book);
      }
    });
    
    // Function to get the first meaningful letter after removing honorifics
    const getFirstMeaningfulLetter = (authorName: string): string => {
      // Remove honorific titles
      const honorifics = ['Srila', 'His Holiness', 'His Divine Grace', 'Sri', 'Srimad', 'A.C.', 'H.H.', 'H.D.G.'];
      let cleanedName = authorName.trim();
      
      // Remove honorifics from the beginning
      for (const honorific of honorifics) {
        if (cleanedName.startsWith(honorific + ' ')) {
          cleanedName = cleanedName.substring(honorific.length + 1).trim();
        }
      }
      
      return cleanedName.charAt(0).toUpperCase();
    };
    
    // Group authors by first meaningful letter
    authorMap.forEach((books, author) => {
      const firstLetter = getFirstMeaningfulLetter(author);
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push({ author, books });
    });
    
    return groups;
  }, [filteredCategories]);

  // Organize books by title first letter
  const titleGroups = useMemo(() => {
    const groups: {[key: string]: Book[]} = {};
    
    // Get all books from all filtered categories
    const allBooks = filteredCategories.flatMap(category => category.books);
    
    // Function to get the first alphabetical letter from title, ignoring numbers and honorifics
    const getFirstAlphabeticalLetter = (title: string): string => {
      // Remove common prefixes and honorifics from titles
      const prefixes = ['Śrī', 'Sri', 'Shri', 'Śrīmad', 'Srimad', 'The', 'A ', 'An '];
      let cleanedTitle = title.trim();
      
      // Remove prefixes from the beginning
      for (const prefix of prefixes) {
        if (cleanedTitle.startsWith(prefix + ' ') || cleanedTitle.startsWith(prefix)) {
          const prefixLength = cleanedTitle.startsWith(prefix + ' ') ? prefix.length + 1 : prefix.length;
          cleanedTitle = cleanedTitle.substring(prefixLength).trim();
          break; // Only remove the first matching prefix
        }
      }
      
      // Find the first alphabetical character (ignore numbers and special characters)
      for (let i = 0; i < cleanedTitle.length; i++) {
        const char = cleanedTitle.charAt(i).toUpperCase();
        if (char >= 'A' && char <= 'Z') {
          return char;
        }
      }
      
      // If no alphabetical character found, return 'A' as default
      return 'A';
    };
    
    // Group books by first alphabetical letter of title
    allBooks.forEach(book => {
      const firstLetter = getFirstAlphabeticalLetter(book.title);
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(book);
    });
    
    return groups;
  }, [filteredCategories]);

  // Filtered data per tab based on searchQuery
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return filteredCategories;
    const q = searchQuery.toLowerCase();
    function filterNodes(nodes: any[]): any[] {
      return nodes.reduce((acc: any[], node) => {
        const children = filterNodes(node.children || []);
        const nameMatch = (node.name || '').toLowerCase().includes(q);
        if (nameMatch || children.length > 0) {
          acc.push({ ...node, children });
        }
        return acc;
      }, []);
    }
    return filterNodes(filteredCategories);
  }, [filteredCategories, searchQuery]);

  const filteredAuthorGroups = useMemo(() => {
    if (!searchQuery.trim()) return authorGroups;
    const q = searchQuery.toLowerCase();
    const result: typeof authorGroups = {};
    Object.entries(authorGroups).forEach(([letter, authors]) => {
      const matched = authors.filter(({ author }) => author.toLowerCase().includes(q));
      if (matched.length > 0) result[letter] = matched;
    });
    return result;
  }, [authorGroups, searchQuery]);

  const filteredTitleGroups = useMemo(() => {
    if (!searchQuery.trim()) return titleGroups;
    const q = searchQuery.toLowerCase();
    const result: typeof titleGroups = {};
    Object.entries(titleGroups).forEach(([letter, books]) => {
      const matched = books.filter(book => book.title.toLowerCase().includes(q));
      if (matched.length > 0) result[letter] = matched;
    });
    return result;
  }, [titleGroups, searchQuery]);

  // Auto-expand categories tree when searching
  useEffect(() => {
    if (activeTab === 'categories' && searchQuery.trim()) {
      setExpandedItems(getAllCategoryIds(filteredTree));
    }
  }, [searchQuery, activeTab, filteredTree]);

  const toggleTitleLetterExpanded = (letter: string) => {
    setExpandedTitleLetters(prev => ({
      ...prev,
      [letter]: !prev[letter]
    }));
  };

  const toggleLetterExpanded = (letter: string) => {
    setExpandedLetters(prev => ({
      ...prev,
      [letter]: !prev[letter]
    }));
  };

  const toggleAuthorExpanded = (author: string) => {
    setExpandedAuthors(prev => ({
      ...prev,
      [author]: !prev[author]
    }));
  };

  const renderAuthorsTab = () => {
    if (loadingBooks) {
      return (
        <div className="p-4 text-center">
          <div className="" style={{ color: "var(--text-muted)" }}>Loading...</div>
        </div>
      );
    }

    const sortedLetters = Object.keys(filteredAuthorGroups).sort();
    const isSearching = !!searchQuery.trim();

    return (
      <>
        {sortedLetters.map((letter) => {
          const isLetterOpen = isSearching || !!expandedLetters[letter];
          return (
            <div key={letter} className="border-b border-yellow-200">
              <button
                onClick={() => toggleLetterExpanded(letter)}
                className="w-full p-4 text-left hover:bg-yellow-100 flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Plus
                    className={`w-4 h-4 transition-transform ${isLetterOpen ? 'transform rotate-45' : ''}`}
                    style={{ color: 'var(--accent-deep)' }}
                  />
                  <span className="font-medium text-lg" style={{ color: "var(--text)" }}>{letter}</span>
                </div>
              </button>

              {isLetterOpen && (
                <div className="bg-yellow-50">
                  {filteredAuthorGroups[letter].map(({ author, books }) => {
                    const isAuthorOpen = isSearching || !!expandedAuthors[author];
                    return (
                      <div key={author} className="border-b border-yellow-200 last:border-b-0">
                        <button
                          onClick={() => toggleAuthorExpanded(author)}
                          className="w-full p-3 pl-8 text-left hover:bg-yellow-100 flex items-center justify-between group transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <Plus
                              className={`w-3 h-3 transition-transform ${isAuthorOpen ? 'transform rotate-45' : ''}`}
                              style={{ color: 'var(--accent-deep)' }}
                            />
                            <span className="font-medium" style={{ color: "var(--text)" }}>{author}</span>
                          </div>
                        </button>

                        {isAuthorOpen && (
                          <div className="bg-yellow-50">
                            {books.map((book) => (
                              <button
                                key={book._id}
                                onClick={() => onBookSelection(book)}
                                className={`w-full p-3 pl-16 text-left hover:bg-yellow-200 transition-colors ${
                                  bookId === book._id ? 'bg-yellow-200 text-amber-900' : ''
                                }`}
                              >
                                <div className="text-sm font-medium">{book.title}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  };

  const renderTitlesTab = () => {
    if (loadingBooks) {
      return (
        <div className="p-4 text-center">
          <div className="" style={{ color: "var(--text-muted)" }}>Loading...</div>
        </div>
      );
    }

    const sortedLetters = Object.keys(filteredTitleGroups).sort();
    const isSearching = !!searchQuery.trim();

    return (
      <>
        {sortedLetters.map((letter) => {
          const isOpen = isSearching || !!expandedTitleLetters[letter];
          return (
            <div key={letter} className="border-b border-yellow-200">
              <button
                onClick={() => toggleTitleLetterExpanded(letter)}
                className="w-full p-4 text-left hover:bg-yellow-100 flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Plus
                    className={`w-4 h-4 transition-transform ${isOpen ? 'transform rotate-45' : ''}`}
                    style={{ color: 'var(--accent-deep)' }}
                  />
                  <span className="font-medium text-lg" style={{ color: "var(--text)" }}>{letter}</span>
                </div>
              </button>

              {isOpen && (
                <div className="bg-yellow-50">
                  {filteredTitleGroups[letter]
                    .sort((a, b) => a.title.localeCompare(b.title))
                    .map((book) => (
                      <button
                        key={book._id}
                        onClick={() => onBookSelection(book)}
                        className={`w-full p-3 pl-12 text-left hover:bg-yellow-200 transition-colors ${
                          bookId === book._id ? 'bg-yellow-200 text-amber-900' : ''
                        }`}
                      >
                        <div className="text-sm font-medium">{book.title}</div>
                        {book.author && (
                          <div className="text-xs mt-1">{book.author}</div>
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  };

  // Dynamically set text color for light theme
  return (
    <div
      className="flex flex-col flex-shrink-0 category-panel-root"
      style={{
        background: 'var(--card)',
        borderRight: '1px solid var(--border)',
        width: '18rem',
        minWidth: 0,
      }}
    >
      {/* Panel Header */}
      <div
        className="px-4 py-3 category-panel-header flex items-center justify-between"
        style={{
          background: 'var(--panel-header-gradient)',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <h3 className="text-sm font-bold" style={{ color: 'var(--panel-header-color)', letterSpacing: '0.02em' }}>
          {languageConfig[selectedLanguage as keyof typeof languageConfig].label} ({languageConfig[selectedLanguage as keyof typeof languageConfig].count})
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            style={{ color: 'var(--panel-header-color)', opacity: 0.8, background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', borderRadius: '0.25rem' }}
            title="Close panel"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div
        className="flex"
        style={{
          background: 'var(--panel-header-gradient)',
        }}
      >
        {(['categories', 'authors', 'title'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 text-xs font-semibold tracking-wide"
            style={{
              color: 'var(--panel-header-color)',
              borderBottom: activeTab === tab ? '2px solid var(--panel-header-color)' : '2px solid transparent',
              background: activeTab === tab ? 'rgba(0,0,0,0.18)' : 'transparent',
              textTransform: 'capitalize',
              opacity: activeTab === tab ? 1 : 0.8,
              transition: 'all 0.15s',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="px-3 py-2.5 flex items-center gap-1.5" style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-light)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'categories' ? 'Search categories…' :
              activeTab === 'authors'    ? 'Search authors…'    :
                                          'Search titles…'
            }
            className="w-full rounded-md py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-1"
            style={{
              background: 'var(--bg)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          />
        </div>
        <button
          title="Refresh book list"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', borderRadius: '0.375rem' }}
          onClick={() => setManualRefreshKey(k => k + 1)}
          aria-label="Refresh book list"
        >
          <RefreshCw size={15} style={{ color: 'var(--text-light)' }} />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'categories' && (
          <>
            {loading || !userPrivileges ? (
              <div className="p-4 text-center">
                <div className="" style={{ color: "var(--text-muted)" }}>Loading...</div>
              </div>
            ) : (
              <SimpleTreeView
                expandedItems={expandedItems}
                onExpandedItemsChange={(_: React.SyntheticEvent | null, itemIds: string[]) => setExpandedItems(itemIds)}
                sx={{
                  background: 'var(--card)',
                  color: 'var(--text)',
                  '& .MuiTreeItem-label': { color: 'var(--text)', fontSize: '0.875rem' },
                  '& .MuiTreeItem-content': { '&:hover': { background: 'var(--card-hover)' } },
                  '& .MuiTreeItem-iconContainer svg': { color: 'var(--sidenav-icon)' },
                }}
              >
                {renderTree(filteredTree)}
              </SimpleTreeView>
            )}
          </>
        )}
        
        {activeTab === 'authors' && renderAuthorsTab()}
        
        {activeTab === 'title' && renderTitlesTab()}
      </div>

      {/* Footer Controls */}
      <div
        className="flex justify-between items-center category-panel-footer"
        style={{
          padding: '0.5rem 1rem',
          borderTop: '1px solid var(--border)',
          background: 'var(--panel-header-bg)',
        }}
      >
        <button
          onClick={handleFoldAll}
          className="text-xs category-panel-footer-btn"
          style={{ color: 'var(--text-light)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
        >
          Fold all
        </button>
        <button
          onClick={handleUnfoldAll}
          className="text-xs category-panel-footer-btn"
          style={{ color: 'var(--text-light)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
        >
          Unfold all
        </button>
      </div>
    </div>
  );
};

export default CategoryPanel;