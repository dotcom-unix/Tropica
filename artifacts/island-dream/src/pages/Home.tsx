import { SearchInput } from '@/components/search-input';
import { useHistory } from '@/hooks/use-history';
import { useLocation } from 'wouter';
import { Clock } from 'lucide-react';
import { IslandBackground } from '@/components/island-background';

export default function Home() {
  const { history } = useHistory();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] w-full relative overflow-hidden flex flex-col items-center justify-center bg-background text-foreground">
      <IslandBackground />

      <div className="relative z-10 w-full px-6 flex flex-col items-center max-w-4xl">
        <h1 className="font-serif text-6xl md:text-8xl font-bold text-primary mb-4 text-center drop-shadow-sm tracking-tight">
          Island Dream
        </h1>
        <p className="text-xl md:text-2xl text-foreground/80 mb-12 text-center font-sans max-w-lg">
          Your slice of paradise on the web.
        </p>

        <div className="w-full mb-12 flex justify-center">
          <SearchInput />
        </div>

        {history.length > 0 && (
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-2 text-primary/60 mb-4">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-bold uppercase tracking-widest">Recent Discoveries</span>
            </div>
            <div className="flex flex-wrap justify-center gap-3 max-w-2xl">
              {history.map((q, i) => (
                <button
                  key={i}
                  data-testid={`button-history-${i}`}
                  onClick={() => setLocation(`/search?q=${encodeURIComponent(q)}`)}
                  className="px-5 py-2.5 rounded-full bg-white/60 hover:bg-primary hover:text-white border border-primary/10 shadow-sm backdrop-blur-md transition-all duration-300 font-medium text-sm text-foreground/80 hover:scale-105 active:scale-95"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
