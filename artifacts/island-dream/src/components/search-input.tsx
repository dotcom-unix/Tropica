import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Search, Clock, X } from 'lucide-react';
import { useHistory } from '@/hooks/use-history';

export function SearchInput({ initialValue = '', className = '' }: { initialValue?: string; className?: string }) {
  const [query, setQuery] = useState(initialValue);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [, setLocation] = useLocation();
  const { history, addHistory, clearHistory } = useHistory();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const suggestions = query.trim()
    ? history.filter(h => h.toLowerCase().includes(query.toLowerCase()) && h.toLowerCase() !== query.toLowerCase())
    : history;

  const submit = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    addHistory(trimmed);
    setShowSuggestions(false);
    setLocation(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(query);
  };

  return (
    <div ref={wrapperRef} className={`relative w-full max-w-2xl ${className}`}>
      <form onSubmit={handleSubmit} className="relative flex items-center w-full" data-testid="form-search">
        <div className="absolute left-4 text-primary pointer-events-none">
          <Search className="w-6 h-6" />
        </div>
        <input
          data-testid="input-search"
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search the web from paradise..."
          autoComplete="off"
          className="w-full pl-14 pr-32 py-4 rounded-full border-2 border-primary/20 bg-white/80 backdrop-blur-md text-foreground placeholder:text-muted-foreground shadow-lg focus:outline-none focus:border-primary focus:ring-4 ring-primary/20 transition-all text-lg font-sans"
        />
        <button
          data-testid="button-submit-search"
          type="submit"
          className="absolute right-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-full font-medium transition-transform hover:scale-105 active:scale-95 shadow-md text-sm md:text-base"
        >
          Search
        </button>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white/95 backdrop-blur-md border border-primary/10 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-xs font-bold uppercase tracking-widest text-primary/60 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Recent
            </span>
            <button
              onClick={(e) => { e.preventDefault(); clearHistory(); setShowSuggestions(false); }}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear
            </button>
          </div>
          <ul>
            {suggestions.slice(0, 8).map((s, i) => (
              <li key={i}>
                <button
                  onMouseDown={(e) => { e.preventDefault(); setQuery(s); submit(s); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-primary/5 transition-colors text-sm text-foreground"
                >
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{s}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
