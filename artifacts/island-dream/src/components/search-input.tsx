import { useState } from 'react';
import { useLocation } from 'wouter';
import { Search } from 'lucide-react';
import { useHistory } from '@/hooks/use-history';

export function SearchInput({ initialValue = '', className = '' }: { initialValue?: string, className?: string }) {
  const [query, setQuery] = useState(initialValue);
  const [, setLocation] = useLocation();
  const { addHistory } = useHistory();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      addHistory(query.trim());
      setLocation(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`relative flex items-center w-full max-w-2xl ${className}`} data-testid="form-search">
      <div className="absolute left-4 text-primary pointer-events-none">
        <Search className="w-6 h-6" />
      </div>
      <input
        data-testid="input-search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search the web from paradise..."
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
  );
}
