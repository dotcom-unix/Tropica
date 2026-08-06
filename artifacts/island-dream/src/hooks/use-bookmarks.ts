import { useState, useEffect } from 'react';

export interface Bookmark {
  url: string;
  title: string;
  favicon?: string;
  addedAt: number;
}

const KEY = 'island_dream_bookmarks';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      try { setBookmarks(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  const save = (next: Bookmark[]) => {
    setBookmarks(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  const addBookmark = (b: Omit<Bookmark, 'addedAt'>) => {
    setBookmarks(prev => {
      const filtered = prev.filter(x => x.url !== b.url);
      const next = [{ ...b, addedAt: Date.now() }, ...filtered].slice(0, 200);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeBookmark = (url: string) => {
    setBookmarks(prev => {
      const next = prev.filter(x => x.url !== url);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  const isBookmarked = (url: string) => bookmarks.some(b => b.url === url);

  const clearBookmarks = () => save([]);

  return { bookmarks, addBookmark, removeBookmark, isBookmarked, clearBookmarks };
}
