import { SearchInput } from '@/components/search-input';
import { useHistory } from '@/hooks/use-history';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { useBrowseHistory } from '@/hooks/use-browse-history';
import { useLocation } from 'wouter';
import { Clock, Bookmark, Globe, History } from 'lucide-react';
import { IslandBackground } from '@/components/island-background';

export default function Home() {
  const { history } = useHistory();
  const { bookmarks } = useBookmarks();
  const { browseHistory } = useBrowseHistory();
  const [, setLocation] = useLocation();

  const recentSites = browseHistory.slice(0, 6);

  return (
    <div className="min-h-[100dvh] w-full relative overflow-hidden flex flex-col items-center justify-center bg-background text-foreground">
      <IslandBackground />

      {/* Top-right nav links */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={() => setLocation('/history')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/50 hover:bg-white/80 border border-primary/10 text-sm text-foreground/70 hover:text-primary backdrop-blur-md shadow-sm transition-all"
        >
          <History className="w-4 h-4" />
          <span className="hidden sm:inline font-medium">History</span>
        </button>
        <button
          onClick={() => setLocation('/bookmarks')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/50 hover:bg-white/80 border border-primary/10 text-sm text-foreground/70 hover:text-primary backdrop-blur-md shadow-sm transition-all"
        >
          <Bookmark className="w-4 h-4" />
          <span className="hidden sm:inline font-medium">Bookmarks</span>
        </button>
      </div>

      <div className="relative z-10 w-full px-6 flex flex-col items-center max-w-4xl">
        <h1 className="font-serif text-6xl md:text-8xl font-bold text-primary mb-4 text-center drop-shadow-sm tracking-tight">
          Island Dream
        </h1>
        <p className="text-xl md:text-2xl text-foreground/80 mb-12 text-center font-sans max-w-lg">
          Your slice of paradise on the web.
        </p>

        <div className="w-full mb-10 flex justify-center">
          <SearchInput />
        </div>

        {/* Recent searches */}
        {history.length > 0 && (
          <div className="flex flex-col items-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-2 text-primary/60 mb-4">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-bold uppercase tracking-widest">Recent Searches</span>
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

        {/* Recent sites */}
        {recentSites.length > 0 && (
          <div className="flex flex-col items-center mb-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            <div className="flex items-center justify-between w-full max-w-2xl mb-4">
              <div className="flex items-center gap-2 text-primary/60">
                <Globe className="w-4 h-4" />
                <span className="text-sm font-bold uppercase tracking-widest">Recent Sites</span>
              </div>
              <button
                onClick={() => setLocation('/history')}
                className="text-xs text-primary/60 hover:text-primary transition-colors font-medium"
              >
                View all →
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-2xl">
              {recentSites.map((entry, i) => (
                <button
                  key={i}
                  onClick={() => setLocation(`/browse?url=${encodeURIComponent(entry.url)}`)}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-white/60 hover:bg-white/90 border border-primary/10 shadow-sm backdrop-blur-md transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] text-left group"
                >
                  {entry.favicon ? (
                    <img src={entry.favicon} alt="" className="w-5 h-5 object-contain shrink-0" />
                  ) : (
                    <Globe className="w-5 h-5 text-primary/40 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground/90 truncate">{entry.title || entry.url}</p>
                    <p className="text-xs text-muted-foreground truncate">{
                      (() => { try { return new URL(entry.url).hostname; } catch { return entry.url; } })()
                    }</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bookmarks */}
        {bookmarks.length > 0 && (
          <div className="flex flex-col items-center w-full animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="flex items-center justify-between w-full max-w-2xl mb-4">
              <div className="flex items-center gap-2 text-primary/60">
                <Bookmark className="w-4 h-4" />
                <span className="text-sm font-bold uppercase tracking-widest">Bookmarks</span>
              </div>
              <button
                onClick={() => setLocation('/bookmarks')}
                className="text-xs text-primary/60 hover:text-primary transition-colors font-medium"
              >
                View all →
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-3 max-w-2xl">
              {bookmarks.slice(0, 8).map((b, i) => (
                <button
                  key={i}
                  onClick={() => setLocation(`/browse?url=${encodeURIComponent(b.url)}`)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/60 hover:bg-primary hover:text-white border border-primary/10 shadow-sm backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  {b.favicon ? (
                    <img src={b.favicon} alt="" className="w-4 h-4 object-contain" />
                  ) : (
                    <Globe className="w-4 h-4 opacity-60" />
                  )}
                  <span className="text-sm font-medium truncate max-w-[120px]">
                    {b.title || (() => { try { return new URL(b.url).hostname; } catch { return b.url; } })()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
