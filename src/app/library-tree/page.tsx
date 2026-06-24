import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, ChevronDown, BookOpen, FolderTree } from 'lucide-react';
import { fetchBooksHierarchyTree, HierarchyCategoryNode } from '../../lib/bookStorage';
import { usePageMeta } from '../../lib/usePageMeta';

function LibraryTreePageInner() {
  const navigate = useNavigate();

  usePageMeta(
    'Library Catalog',
    'Explore the full catalog of Vedic scriptures and spiritual texts organized by category in a browsable tree.'
  );
  const [searchParams] = useSearchParams();
  const [tree, setTree] = useState<HierarchyCategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // ...existing code...

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div className="max-w-6xl mx-auto">
        {/* ...existing code... */}
      </div>
    </div>
  );
}

export default function LibraryTreePage() {
  return <LibraryTreePageInner />;
}

