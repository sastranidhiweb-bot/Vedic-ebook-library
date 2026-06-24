import React from 'react';

interface Book {
  _id: string;
  title: string;
  author?: string;
  language?: string;
  [key: string]: any;
}

interface BookListModalProps {
  open: boolean;
  onClose: () => void;
  books: Book[];
}

type EditableBook = Book & { _editing?: boolean };


import { useState } from 'react';
import { deleteBookFile } from '../lib/bookStorage';

const BookListModal: React.FC<BookListModalProps> = ({ open, onClose, books }) => {
  const [editBooks, setEditBooks] = useState<EditableBook[]>(books.map(b => ({ ...b })));
  const [editIdx, setEditIdx] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Book>>({});


  // Category, language, and type options (sync with FileUpload)
    const typeOptions = [
      { value: 'normal', label: 'Normal' },
      { value: 'special', label: 'Special' },
      { value: 'private', label: 'Private' }
    ];
  const bookCategories = [
    'Srila Prabhupada',
    'Acaryas',
    'Great Vaishnavas',
    'Vaishnavas of ISKCON',
    'Contemporary vaishnavas',
    'Vedic Sages',
    'Other authors',
    'Sastras',
    'Other'
  ];
  const languageOptions = [
    { value: 'english', label: 'English' },
    { value: 'telugu', label: 'Telugu' },
    { value: 'sanskrit', label: 'Sanskrit' }
  ];

  // Sync books prop to local state if modal is reopened
  React.useEffect(() => {
    setEditBooks(books.map(b => ({ ...b })));
    setEditIdx(null);
    setEditValues({});
  }, [books, open]);

  const handleEdit = (id: string) => {
    setEditIdx(id);
    const book = editBooks.find(b => b._id === id);
    setEditValues(book ? { ...book } : {});
  };

  const handleEditChange = (field: keyof Book, value: string) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  };


  const handleEditSave = async (id: string) => {
    // Call backend API to update book
    try {
      const token = localStorage.getItem('vedic_auth_token') || sessionStorage.getItem('vedic_auth_token');
      const { BACKEND_API_URL } = await import('../lib/config');
      const response = await fetch(`${BACKEND_API_URL}/books/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editValues)
      });
      if (!response.ok) throw new Error('Failed to update book');
      setEditBooks(prev => prev.map(b => b._id === id ? { ...b, ...editValues } : b));
      setEditIdx(null);
      setEditValues({});
    } catch (err) {
      alert('Failed to update book.');
    }
  };

  const handleEditCancel = () => {
    setEditIdx(null);
    setEditValues({});
  };


  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    const success = await deleteBookFile(id);
    if (success) {
      setEditBooks(prev => prev.filter(b => b._id !== id));
    } else {
      alert('Failed to delete book.');
    }
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
        className="vb-modal w-full max-w-6xl px-10 py-8 relative"
        style={{
          transform: 'scale(1)',
          transition: 'transform 0.2s',
        }}
      >
        <button
          className="absolute top-4 right-4 text-2xl font-bold transition-colors"
          style={{ color: 'var(--text-muted)', lineHeight: 1 }}
          onClick={onClose}
          title="Close"
        >
          &times;
        </button>
        <h2
          className="text-3xl font-extrabold mb-6 text-center tracking-tight"
          style={{ color: 'var(--accent-deep)', letterSpacing: '-0.01em', fontFamily: '"Gentium Plus", "Noto Serif Devanagari", Georgia, serif' }}
        >
          All Books
        </h2>
        <hr className="mb-6" style={{ borderColor: 'var(--border)' }} />
        <div className="overflow-x-auto">
          <table className="min-w-full rounded-xl overflow-hidden shadow" style={{ border: '1px solid var(--border)' }}>
            <thead>
              <tr style={{ background: 'var(--card-hover)', color: 'var(--text)' }}>
                <th className="px-4 py-2 font-semibold" style={{ borderBottom: '1px solid var(--border)' }}>Title</th>
                <th className="px-4 py-2 font-semibold" style={{ borderBottom: '1px solid var(--border)' }}>Author</th>
                <th className="px-4 py-2 font-semibold" style={{ borderBottom: '1px solid var(--border)' }}>Language</th>
                <th className="px-4 py-2 font-semibold" style={{ borderBottom: '1px solid var(--border)' }}>Category</th>
                <th className="px-4 py-2 font-semibold" style={{ borderBottom: '1px solid var(--border)' }}>Description</th>
                <th className="px-4 py-2 font-semibold" style={{ borderBottom: '1px solid var(--border)' }}>Type</th>
                <th className="px-4 py-2 font-semibold" style={{ borderBottom: '1px solid var(--border)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {editBooks.map((book, idx) => (
                <tr
                  key={book._id}
                  className="transition"
                  style={{ background: idx % 2 === 0 ? 'var(--card)' : 'var(--bg)', color: 'var(--text)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--card-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'var(--card)' : 'var(--bg)')}
                >
                  {editIdx === book._id ? (
                    <>
                      <td className="px-4 py-2 font-semibold" style={{ borderBottom: '1px solid var(--border)' }}>
                        <input
                          className="w-full px-2 py-1 rounded"
                          style={{ background: 'var(--input-bg)', color: 'var(--input-text)', border: '1px solid var(--input-border)' }}
                          value={editValues.title || ''}
                          onChange={e => handleEditChange('title', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                        <input
                          className="w-full px-2 py-1 rounded"
                          style={{ background: 'var(--input-bg)', color: 'var(--input-text)', border: '1px solid var(--input-border)' }}
                          value={editValues.author || ''}
                          onChange={e => handleEditChange('author', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                        <select
                          className="w-full px-2 py-1 rounded focus:outline-none"
                          style={{ background: 'var(--input-bg)', color: 'var(--input-text)', border: '1px solid var(--input-border)' }}
                          value={editValues.language || ''}
                          onChange={e => handleEditChange('language', e.target.value)}
                        >
                          <option value="">Select language...</option>
                          {languageOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                        <select
                          className="w-full px-2 py-1 rounded focus:outline-none"
                          style={{ background: 'var(--input-bg)', color: 'var(--input-text)', border: '1px solid var(--input-border)' }}
                          value={editValues.category || ''}
                          onChange={e => handleEditChange('category', e.target.value)}
                        >
                          <option value="">Select category...</option>
                          {bookCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2 max-w-xs" style={{ borderBottom: '1px solid var(--border)' }}>
                        <input
                          className="w-full px-2 py-1 rounded"
                          style={{ background: 'var(--input-bg)', color: 'var(--input-text)', border: '1px solid var(--input-border)' }}
                          value={editValues.description || ''}
                          onChange={e => handleEditChange('description', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                        <select
                          className="w-full px-2 py-1 rounded focus:outline-none"
                          style={{ background: 'var(--input-bg)', color: 'var(--input-text)', border: '1px solid var(--input-border)' }}
                          value={editValues.type || ''}
                          onChange={e => handleEditChange('type', e.target.value)}
                        >
                          <option value="">Select type...</option>
                          {typeOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2 align-middle min-h-[48px]" style={{ borderBottom: '1px solid var(--border)' }}>
                        <div className="flex flex-col md:flex-row gap-2 justify-center items-center">
                          <button
                            className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold shadow-sm transition-all"
                            onClick={() => handleEditSave(book._id)}
                          >Save</button>
                          <button
                            className="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold shadow-sm transition-all"
                            onClick={handleEditCancel}
                          >Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2 font-semibold" style={{ borderBottom: '1px solid var(--border)' }}>{book.title}</td>
                      <td className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>{book.author || '-'}</td>
                      <td className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>{book.language || '-'}</td>
                      <td className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>{book.category || '-'}</td>
                      <td className="px-4 py-2 max-w-xs truncate" style={{ borderBottom: '1px solid var(--border)' }} title={book.description}>{book.description || '-'}</td>
                      <td className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>{book.type || '-'}</td>
                      <td className="px-4 py-2 align-middle min-h-[48px]" style={{ borderBottom: '1px solid var(--border)' }}>
                        <div className="flex flex-col md:flex-row gap-2 justify-center items-center">
                          <button
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold shadow-sm transition-all"
                            onClick={() => handleEdit(book._id)}
                          >Edit</button>
                          <button
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow-sm transition-all"
                            onClick={() => handleDelete(book._id)}
                          >Delete</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

export default BookListModal;
