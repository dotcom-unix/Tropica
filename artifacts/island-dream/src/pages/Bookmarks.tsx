import { useLocation } from 'wouter';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { ArrowLeft, Bookmark, Globe, Trash2, X } from 'lucide-react';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function Bookmarks() {
  const [, setLocation] = useLocation();
  const { bookmarks, removeBookmark, clearBookmarks } = useBookmarks();

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-[#0f8b8d] text-white px-4 py-3 flex items-center gap-3 shadow-lg sticky top-0 z-10">
        <button
          onClick={() => setLocation('/')}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-serif text-xl font-bold flex-1">Bookmarks</h1>
        {bookmarks.length > 0 && (
          <button
            onClick={clearBookmarks}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear all</span>
          </button>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
            <Bookmark className="w-10 h-10" />
            <p className="text-base">No bookmarks yet</p>
            <p className="text-sm text-center max-w-xs">
              While browsing securely, tap the bookmark icon in the toolbar to save a site.
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {bookmarks.map((b, i) => (
              <li
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-card group transition-colors"
              >
                {b.favicon ? (
                  <img src={b.favicon} alt="" className="w-5 h-5 object-contain shrink-0" />
                ) : (
                  <Globe className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
                <button
                  className="flex-1 text-left min-w-0"
                  onClick={() => setLocation(`/browse?url=${encodeURIComponent(b.url)}`)}
                >
                  <p className="text-sm font-medium text-foreground truncate">{b.title || b.url}</p>
                  <p className="text-xs text-muted-foreground truncate">{b.url}</p>
                </button>
                <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{timeAgo(b.addedAt)}</span>
                <button
                  onClick={() => removeBookmark(b.url)}
                  className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                  title="Remove bookmark"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
