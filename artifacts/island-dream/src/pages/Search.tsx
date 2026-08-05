import { useSearch as useWouterSearch } from 'wouter';
import { useSearch, getSearchQueryKey } from '@workspace/api-client-react';
import { SearchInput } from '@/components/search-input';
import { ResultCard } from '@/components/result-card';
import { Loader2, Palmtree } from 'lucide-react';

export default function Search() {
  const searchString = useWouterSearch();
  const queryParams = new URLSearchParams(searchString);
  const q = queryParams.get('q') || '';
  
  const { data, isLoading, isError } = useSearch(
    { q, page: 1 },
    { query: { enabled: !!q, queryKey: getSearchQueryKey({ q, page: 1 }) } }
  );

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-border shadow-sm px-4 md:px-8 py-4 flex flex-col md:flex-row items-center gap-6">
        <a href="/" className="font-serif text-2xl font-bold text-primary shrink-0 flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="link-home">
          <Palmtree className="w-6 h-6 text-secondary" />
          Island Dream
        </a>
        <div className="w-full max-w-3xl flex-1">
          <SearchInput initialValue={q} />
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8">
        {!q && (
          <div className="text-center py-20 text-muted-foreground font-medium">
            Please enter a search query.
          </div>
        )}
        
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
            <p className="text-xl text-primary font-serif font-medium animate-pulse">Combing the beaches for results...</p>
          </div>
        )}

        {isError && (
          <div className="text-center py-20 text-destructive bg-destructive/10 rounded-3xl border border-destructive/20 p-10 shadow-sm max-w-2xl mx-auto">
            <p className="text-2xl font-serif font-bold mb-3">Oh no, a stormy sea!</p>
            <p className="text-lg">We couldn't fetch your results right now. Please try again later.</p>
          </div>
        )}

        {data?.results && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <p className="text-sm text-muted-foreground px-2">
              Found treasures for "<span className="font-medium text-foreground">{q}</span>"
            </p>
            {data.results.map((result, i) => (
              <ResultCard key={i} result={result} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
