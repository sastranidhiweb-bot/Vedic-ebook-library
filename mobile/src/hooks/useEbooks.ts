import { useEffect, useState } from 'react';

export interface Ebook {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  description: string;
}

export const useEbooks = () => {
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // using a dummy endpoint for now, or just setting dummy data
    const dummyEbooks: Ebook[] = [
        { id: '1', title: 'Rig Veda', author: 'Vyasa', coverUrl: 'https://via.placeholder.com/150', description: 'Ancient Indian text.' },
        { id: '2', title: 'Upanishads', author: 'Unknown', coverUrl: 'https://via.placeholder.com/150', description: 'Philosophical texts.' },
    ];
    setTimeout(() => {
        setEbooks(dummyEbooks);
        setLoading(false);
    }, 1000);
  }, []);

  return { ebooks, loading };
};
