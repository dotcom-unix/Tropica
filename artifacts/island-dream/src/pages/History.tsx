import { useLocation } from 'wouter';
import { useBrowseHistory } from '@/hooks/use-browse-history';
import { useHistory } from '@/hooks/use-history';
import { ArrowLeft, Clock, Globe, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

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

export default function History() {
  const [, setLocation] = useLocation();
  const { browseHistory, clearBrowseHistory, removeBrowseEntry } = useBrowseHistory();
  const { history: searchHistory, clearHistory: clearSearchHistory, addHistory } = useHistory();
  const [tab, setTab] = useState<'browse' | 'search'>('browse');

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
        <h1 className="font-serif text-xl font-bold flex-1">History</h1>
        <button
          onClick={() => tab === 'browse' ? clearBrowseHistory() : clearSearchHistory()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors"
          title="Clear all"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Clear all</span>
        </button>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card sticky top-[57px] z-10">
        {(['browse', 'search'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold capitalize transition-colors border-b-2 ${
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'browse' ? <Globe className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            {t === 'browse' ? 'Sites Visited' : 'Searches'}
          </button>
        ))}
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {tab === 'browse' && (
          browseHistory.length === 0 ? (
            <EmptyState icon={<Globe className="w-10 h-10" />} message="No sites visited yet" />
          ) : (
            <ul className="space-y-1">
              {browseHistory.map((entry, i) => (
                <li key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-card group transition-colors">
                  {entry.favicon ? (
                    <img src={entry.favicon} alt="" className="w-5 h-5 object-contain shrink-0" />
                  ) : (
                    <Globe className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                  <button
                    className="flex-1 text-left min-w-0"
                    onClick={() => setLocation(`/browse?url=${encodeURIComponent(entry.url)}`)}
                  >
                    <p className="text-sm font-medium text-foreground truncate">{entry.title || entry.url}</p>
                    <p className="text-xs text-muted-foreground truncate">{entry.url}</p>
                  </button>
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{timeAgo(entry.visitedAt)}</span>
                  <button
                    onClick={() => removeBrowseEntry(entry.url)}
                    className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === 'search' && (
          searchHistory.length === 0 ? (
            <EmptyState icon={<Search className="w-10 h-10" />} message="No searches yet" />
          ) : (
            <ul className="space-y-1">
              {searchHistory.map((q, i) => (
                <li key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-card group transition-colors">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <button
                    className="flex-1 text-left"
                    onClick={() => {
                      addHistory(q);
                      setLocation(`/search?q=${encodeURIComponent(q)}`);
                    }}
                  >
                    <span className="text-sm text-foreground">{q}</span>
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </main>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
      {icon}
      <p className="text-base">{message}</p>
    </div>
  );
}
