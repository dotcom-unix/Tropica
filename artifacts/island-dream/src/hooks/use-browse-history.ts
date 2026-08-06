import { useState, useEffect } from 'react';

export interface BrowseEntry {
  url: string;
  title: string;
  favicon?: string;
  visitedAt: number;
}

const KEY = 'island_dream_browse_history';

export function useBrowseHistory() {
  const [browseHistory, setBrowseHistory] = useState<BrowseEntry[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      try { setBrowseHistory(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  const addBrowseEntry = (entry: Omit<BrowseEntry, 'visitedAt'>) => {
    setBrowseHistory(prev => {
      const filtered = prev.filter(x => x.url !== entry.url);
      const next = [{ ...entry, visitedAt: Date.now() }, ...filtered].slice(0, 500);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  const clearBrowseHistory = () => {
    setBrowseHistory([]);
    localStorage.removeItem(KEY);
  };

  const removeBrowseEntry = (url: string) => {
    setBrowseHistory(prev => {
      const next = prev.filter(x => x.url !== url);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  return { browseHistory, addBrowseEntry, clearBrowseHistory, removeBrowseEntry };
}
