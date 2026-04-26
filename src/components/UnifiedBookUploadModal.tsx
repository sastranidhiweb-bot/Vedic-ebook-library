import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle, User, Tag, BookOpen, FileCheck, FolderOpen } from 'lucide-react';
import { uploadBook } from '../lib/bookStorage';

interface UnifiedBookUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

const typeOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'special', label: 'Special' },
  { value: 'private', label: 'Private' }
];

const bookCategories = [
  'Vaisnava Literature',
  'Sruti',
  'Smriti',
  'Classical Literature'
];

const languageOptions = [
  { value: 'english', label: 'English' },
  { value: 'telugu', label: 'Telugu' },
  { value: 'sanskrit', label: 'Sanskrit' }
];

const UnifiedBookUploadModal: React.FC<UnifiedBookUploadModalProps> = ({ open, onClose, onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [metadata, setMetadata] = useState({
    title: '',
    author: '',
    // category: '',
    description: '',
    tags: '',
    language: 'english',
    type: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selected = files[0];
      setFile(selected);
      setMetadata(prev => ({ ...prev, title: selected.name.replace(/\.[^/.]+$/, '') }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const selected = files[0];
      setFile(selected);
      setMetadata(prev => ({ ...prev, title: selected.name.replace(/\.[^/.]+$/, '') }));
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    if (!metadata.title.trim() || !metadata.author.trim() || !metadata.language || !metadata.type) {
      setError('Please fill all required fields.');
      return;
    }
    setIsProcessing(true);
    try {
      const parsedTags = metadata.tags
        ? metadata.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];
      await uploadBook(file, {
        title: metadata.title.trim(),
        author: metadata.author.trim(),
        language: metadata.language.toLowerCase(),
        description: metadata.description.trim() || undefined,
        tags: parsedTags.length ? parsedTags : undefined,
        type: metadata.type || 'normal'
      });
      setFile(null);
      setMetadata({ title: '', author: '', description: '', tags: '', language: 'english', type: '' });
      onUploadSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(245, 245, 255, 0.65)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-2xl p-0 relative border border-amber-100 overflow-x-auto" style={{ maxWidth: '700px', minWidth: '340px', background: 'linear-gradient(135deg, #fffbe8 0%, #fff 100%)', color: '#783f04', boxShadow: '0 8px 32px #fbbf24a0' }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-red-500 font-bold">&times;</button>
        <div className="border-b border-amber-100 px-8 pt-8 pb-4" style={{ background: 'transparent' }}>
          <h2 className="text-3xl font-extrabold text-center tracking-tight text-amber-700 drop-shadow-sm mb-2" style={{ letterSpacing: '-0.01em', color: '#b97b2c' }}>Upload Book</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-8 py-6" style={{ color: '#783f04', background: 'transparent' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: '#783f04' }}>Book Title *</label>
                <input
                  type="text"
                  value={metadata.title}
                  onChange={e => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-amber-100 rounded-lg focus:outline-none focus:ring-2 bg-white"
                  style={{ color: '#783f04' }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: '#783f04' }}>Author *</label>
                <input
                  type="text"
                  value={metadata.author}
                  onChange={e => setMetadata(prev => ({ ...prev, author: e.target.value }))}
                  className="w-full px-4 py-2 border border-amber-100 rounded-lg focus:outline-none focus:ring-2 bg-white"
                  style={{ color: '#783f04' }}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1" style={{ color: '#783f04' }}>Description (Optional)</label>
                <textarea
                  value={metadata.description}
                  onChange={e => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-amber-100 rounded-lg focus:outline-none focus:ring-2 h-20 bg-white"
                  style={{ color: '#783f04' }}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: '#783f04' }}>Categories/Tags (Optional)</label>
                <input
                  type="text"
                  value={metadata.tags}
                  onChange={e => setMetadata(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-4 py-2 border border-amber-100 rounded-lg focus:outline-none focus:ring-2 bg-white"
                  style={{ color: '#783f04' }}
                  placeholder="e.g., Vedas, Puranas, Philosophy, Yoga (separate with commas)"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: '#783f04' }}>Language *</label>
                <select
                  value={metadata.language}
                  onChange={e => setMetadata(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-4 py-2 border border-amber-100 rounded-lg focus:outline-none focus:ring-2 bg-white"
                  style={{ color: '#783f04' }}
                  required
                >
                  <option value="">Select a language...</option>
                  {languageOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: '#783f04' }}>Type *</label>
                <select
                  value={metadata.type}
                  onChange={e => setMetadata(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-2 border border-amber-100 rounded-lg focus:outline-none focus:ring-2 bg-white"
                  style={{ color: '#783f04' }}
                  required
                >
                  <option value="">Select type...</option>
                  {typeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center md:col-span-1 mt-2 md:mt-0">
              <div
                className={`flex flex-col items-center justify-center px-4 py-6 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer bg-white hover:bg-amber-50 transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ minWidth: '160px', minHeight: '160px', color: '#783f04' }}
                onDrop={e => { e.preventDefault(); if (!isProcessing) { const files = e.dataTransfer.files; if (files.length > 0) { const selected = files[0]; setFile(selected); setMetadata(prev => ({ ...prev, title: selected.name.replace(/\.[^/.]+$/, '') })); } } }}
                onDragOver={e => e.preventDefault()}
                onClick={() => { if (!isProcessing) fileInputRef.current?.click(); }}
                title="Upload or drop a file"
              >
                <input
                  type="file"
                  accept=".docx,.pdf,.epub"
                  onChange={handleFileInputChange}
                  ref={fileInputRef}
                  className="hidden"
                  disabled={isProcessing}
                />
                {file ? (
                  <FileCheck className="w-8 h-8 text-green-600 mb-1" />
                ) : (
                  <Upload className="w-8 h-8 text-amber-500 mb-1" />
                )}
                <span className="text-sm font-medium">Upload/Drop</span>
                <span className="text-xs text-gray-400">.docx, .pdf, .epub</span>
                {file && <span className="text-xs text-green-700 mt-1 truncate max-w-[120px]">{file.name}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center mt-6">
            {error && (
              <div className="mb-2 p-3 rounded-lg bg-red-100 text-red-700 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}
            <button
              type="submit"
              className="w-full md:w-auto px-8 py-3 rounded-lg font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 shadow transition-all"
              style={{ boxShadow: '0 2px 8px #fbbf24' }}
              disabled={isProcessing}
            >
              {isProcessing ? 'Uploading...' : 'Save to Library & Start Reading'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UnifiedBookUploadModal;
