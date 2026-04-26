'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ChevronRight, ChevronDown, BookOpen, FolderTree } from 'lucide-react';
import { fetchBooksHierarchyTree, HierarchyCategoryNode } from '../../lib/bookStorage';

function LibraryTreePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  return (
    <Suspense>
      <LibraryTreePageInner />
    </Suspense>
  );
}
