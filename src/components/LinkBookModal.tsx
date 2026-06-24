import React, { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { BACKEND_API_URL } from '../lib/config';

interface Book {
  _id: string;
  title: string;
  author?: string;
}

interface CategoryNode {
  _id: string;
  name: string;
  children?: CategoryNode[];
  type?: string;
}

interface LinkBookModalProps {
  open: boolean;
  onClose: () => void;
  onBookLinked?: () => void;
}

const LinkBookModal: React.FC<LinkBookModalProps> = ({ open, onClose, onBookLinked }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [bookSearch, setBookSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<{ [id: string]: boolean }>({});
  const [categorySearch, setCategorySearch] = useState('');
  const [success, setSuccess] = useState('');
  const [linking, setLinking] = useState(false);

  // Fetch books and categories on open
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError('');
    // Fetch books
    fetch(`${BACKEND_API_URL}/books/list`)
      .then(res => res.json())
      .then(data => setBooks(data.books || []))
      .catch(() => setError('Failed to load books'));
    // Fetch categories tree
    fetch(`${BACKEND_API_URL}/categories/tree`)
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(() => setError('Failed to load categories'))
      .finally(() => setLoading(false));
  }, [open]);

  // Helper to get path to selected category
  function findCategoryPath(nodes: CategoryNode[], targetId: string, path: string[] = []): string[] | null {
    for (const node of nodes) {
      if (node._id === targetId) return [...path, node.name];
      if (node.children) {
        const res = findCategoryPath(node.children, targetId, [...path, node.name]);
        if (res) return res;
      }
    }
    return null;
  }

  // Expand/collapse logic
  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter tree nodes by search
  function filterTree(nodes: CategoryNode[], search: string): CategoryNode[] {
    if (!search.trim()) return nodes;
    const lower = search.toLowerCase();
    function filterNode(node: CategoryNode): CategoryNode | null {
      if (node.name.toLowerCase().includes(lower)) return node;
      if (node.children) {
        const filteredChildren = node.children.map(filterNode).filter(Boolean) as CategoryNode[];
        if (filteredChildren.length > 0) return { ...node, children: filteredChildren };
      }
      return null;
    }
    return nodes.map(filterNode).filter(Boolean) as CategoryNode[];
  }
  {error && <div className="text-red-600 mb-2">{error}</div>}
  {success && <div className="text-green-600 mb-2">{success}</div>}
  // Recursive tree rendering for categories
  const renderCategoryTree = (nodes: CategoryNode[], depth = 0) => {
    return (
      <ul className={depth === 0 ? '' : 'ml-4'}>
        {nodes.map(node => {
          const isLeaf = node.type === 'book-list' || !node.children || node.children.length === 0;
          const isExpanded = expanded[node._id] || false;
          return (
            <li key={node._id} className="flex items-start">
              {!isLeaf && (
                <button
                  type="button"
                  className="mr-1 focus:outline-none flex items-center"
                  style={{ fontSize: '1em', lineHeight: 1, marginTop: 2, color: 'var(--text-light)' }}
                  onClick={() => toggleExpand(node._id)}
                  tabIndex={0}
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              <button
                className="text-left px-1 py-0.5 rounded transition-colors"
                style={{
                  color: isLeaf ? 'var(--accent-deep)' : 'var(--text)',
                  fontWeight: isLeaf ? 600 : 400,
                  background: selectedCategory === node._id ? 'var(--card-hover)' : 'transparent',
                  cursor: isLeaf ? 'pointer' : 'default',
                  opacity: isLeaf ? 1 : 0.7,
                }}
                disabled={!isLeaf}
                onClick={() => isLeaf && setSelectedCategory(node._id)}
                tabIndex={isLeaf ? 0 : -1}
              >
                {node.name} {isLeaf && <span className="ml-1 text-xs" style={{ color: 'var(--accent-deep)' }}>(Leaf)</span>}
              </button>
              {node.children && node.children.length > 0 && isExpanded && renderCategoryTree(node.children, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'var(--modal-overlay)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        animation: 'modalFadeIn 0.25s cubic-bezier(.4,2,.6,1)'
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="vb-modal px-8 py-7 min-w-[370px] max-w-[95vw]"
        style={{
          transform: 'scale(1)',
          transition: 'transform 0.2s',
        }}
      >
        <h2 className="text-2xl font-extrabold mb-6 tracking-tight" style={{ color: 'var(--accent-deep)', letterSpacing: '-0.01em', fontFamily: '"Gentium Plus", "Noto Serif Devanagari", Georgia, serif' }}>Link a Book to Category</h2>
        <hr className="mb-6" style={{ borderColor: 'var(--border)' }} />
        {loading ? (
          <div style={{ color: 'var(--text-light)' }}>Loading...</div>
        ) : error ? (
          <div className="mb-2" style={{ color: 'var(--modal-error)' }}>{error}</div>
        ) : (
          <>
            {success && (
              <div
                className="mb-4 font-semibold text-center px-4 py-3 rounded-lg"
                style={{
                  background: 'var(--card-hover)',
                  color: 'var(--modal-success)',
                  border: '1.5px solid var(--modal-success)',
                  fontSize: '1.08rem',
                  letterSpacing: '0.01em',
                }}
              >
                {success}
              </div>
            )}
            <div className="mb-6">
              <label className="block mb-2 font-semibold" style={{ color: 'var(--modal-label)' }}>Select Book:</label>
              <input
                type="text"
                className="w-full rounded-lg px-3 py-2 mb-2 shadow-sm"
                style={{ background: 'var(--input-bg)', color: 'var(--input-text)', border: '1px solid var(--input-border)' }}
                placeholder="Search books by title or author..."
                value={bookSearch}
                onChange={e => setBookSearch(e.target.value)}
              />
              <select
                className="w-full rounded-lg px-3 py-2 shadow-sm transition-colors"
                style={{ background: 'var(--input-bg)', color: 'var(--input-text)', border: '1px solid var(--input-border)' }}
                value={selectedBook}
                onChange={e => setSelectedBook(e.target.value)}
              >
                <option value="">-- Choose a book --</option>
                {books
                  .filter(book =>
                    book.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
                    (book.author && book.author.toLowerCase().includes(bookSearch.toLowerCase()))
                  )
                  .map(book => (
                    <option key={book._id} value={book._id}>
                      {book.title}{book.author ? ` — ${book.author}` : ''}
                    </option>
                  ))}
              </select>
            </div>
            <div className="mb-6">
              <label className="block mb-2 font-semibold" style={{ color: 'var(--modal-label)' }}>Select Category (Leaf Node):</label>
              <input
                type="text"
                className="w-full rounded-lg px-3 py-2 mb-2 shadow-sm"
                style={{ background: 'var(--input-bg)', color: 'var(--input-text)', border: '1px solid var(--input-border)' }}
                placeholder="Search categories..."
                value={categorySearch}
                onChange={e => setCategorySearch(e.target.value)}
              />
              <div className="max-h-48 overflow-auto rounded-lg p-2 shadow-inner" style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--input-border)' }}>
                {renderCategoryTree(filterTree(categories, categorySearch))}
              </div>
              {selectedCategory && (
                <div className="mt-2 text-xs" style={{ color: 'var(--text-light)' }}>
                  <span className="font-medium">Selected Path:</span> {findCategoryPath(categories, selectedCategory)?.join(' > ') || ''}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button
                className="px-5 py-2 rounded-lg font-semibold transition-colors shadow-sm"
                style={{ background: 'var(--card-hover)', color: 'var(--text)', border: '1px solid var(--border)', minWidth: 90 }}
                onClick={onClose}
              >
                Close
              </button>
              <button
                className="px-5 py-2 rounded-lg font-bold shadow-lg border-0 transition-all duration-150"
                disabled={!selectedBook || !selectedCategory || linking}
                style={{ minWidth: 90, background: 'var(--accent-deep)', color: 'var(--btn-primary-text)', opacity: (!selectedBook || !selectedCategory || linking) ? 0.55 : 1 }}
                onClick={async () => {
                  setError('');
                  setSuccess('');
                  setLinking(true);
                  try {
                    const res = await fetch(`${BACKEND_API_URL}/categories/${selectedCategory}/link-book`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ bookId: selectedBook })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                      setSuccess('Book linked successfully!');
                      setSelectedBook('');
                      setSelectedCategory('');
                      if (onBookLinked) onBookLinked();
                      setTimeout(() => setSuccess(''), 2500);
                    } else {
                      setError(data.error || 'Failed to link book.');
                    }
                  } catch (err) {
                    setError('Failed to link book.');
                  } finally {
                    setLinking(false);
                  }
                }}
              >
                {linking ? 'Linking...' : 'Link'}
              </button>
            </div>
          </>
        )}
      </div>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default LinkBookModal;
