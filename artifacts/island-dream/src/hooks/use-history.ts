import { useState, useEffect } from 'react';

export function useHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('island_dream_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        // ignore parse errors
      }
    }
  }, []);

  const addHistory = (query: string) => {
    if (!query.trim()) return;
    setHistory(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== query.toLowerCase());
      const newHistory = [query, ...filtered].slice(0, 10);
      localStorage.setItem('island_dream_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('island_dream_history');
  };

  return { history, addHistory, clearHistory };
}
