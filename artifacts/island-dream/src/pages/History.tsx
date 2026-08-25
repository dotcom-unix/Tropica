import { useLocation } from 'wouter';
import { useBrowseHistory } from '@/hooks/use-browse-history';
import { useHistory } from '@/hooks/use-history';
import { ArrowLeft, Clock, Globe, Search, Trash2, X, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef } from 'react';
import SecureView from '@/lib/SecureView';

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
  const secureViewRef = useRef<SecureView | null>(null);

  // Initialize SecureView and render secure history summary
  useEffect(() => {
    const secureView = new SecureView({
      encryptionKey: 'island-browser-history-secure',
      showIndicator: true
    });

    secureView.init('secure-history-container');
    secureViewRef.current = secureView;

    // Store browse history in secure worker
    secureView.storeSecurely('browse-history', {
      totalVisits: browseHistory.length,
      entries: browseHistory.map(entry => ({
        title: entry.title,
        url: entry.url,
        visitedAt: entry.visitedAt
      })),
      lastUpdated: new Date().toISOString()
    });

    // Store search history in secure worker
    secureView.storeSecurely('search-history', {
      totalSearches: searchHistory.length,
      queries: searchHistory,
      lastUpdated: new Date().toISOString()
    });

    // Render secure history summary
    const browseStats = `
      <div style="padding: 12px;">
        <div style="margin-bottom: 14px;">
          <p style="margin: 0; color: #666; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.6px;">Browse History</p>
        </div>
        <div style="background: #f9f9f9; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Total Sites Visited:</strong></p>
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #667eea;">${browseHistory.length}</p>
        </div>
        ${browseHistory.length > 0 ? `
          <div style="background: #f5f5f5; border-radius: 6px; padding: 10px; margin-bottom: 12px;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #333;">Most Recent Visits:</p>
            ${browseHistory.slice(0, 3).map((entry, idx) => `
              <div style="padding: 6px 0; border-bottom: ${idx < 2 ? '1px solid #e0e0e0' : 'none'}; font-size: 11px;">
                <p style="margin: 0; color: #333; word-break: break-word;">${entry.title || entry.url}</p>
                <p style="margin: 2px 0 0 0; color: #999; font-size: 10px;">${timeAgo(entry.visitedAt)}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}
        <div style="background: #f0f0f0; border-radius: 6px; padding: 8px; border-left: 3px solid #667eea;">
          <p style="margin: 0; font-size: 10px; color: #999;">Last Updated: ${new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    `;

    const searchStats = `
      <div style="padding: 12px;">
        <div style="margin-bottom: 14px;">
          <p style="margin: 0; color: #666; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.6px;">Search History</p>
        </div>
        <div style="background: #f9f9f9; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Total Searches:</strong></p>
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #667eea;">${searchHistory.length}</p>
        </div>
        ${searchHistory.length > 0 ? `
          <div style="background: #f5f5f5; border-radius: 6px; padding: 10px;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #333;">Recent Searches:</p>
            ${searchHistory.slice(0, 5).map((query, idx) => `
              <div style="padding: 6px 0; border-bottom: ${idx < 4 ? '1px solid #e0e0e0' : 'none'}; font-size: 11px;">
                <p style="margin: 0; color: #333; word-break: break-word;">"${query}"</p>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    // Render the appropriate stats based on tab
    secureView.render(
      tab === 'browse' ? browseStats : searchStats,
      tab === 'browse' ? 'Secure Browse History' : 'Secure Search History'
    );

    return () => {
      secureView.clear();
    };
  }, [browseHistory, searchHistory, tab]);

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

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Secure History Summary - Hidden from Extensions */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary/60">
              Extension-Isolated History
            </h2>
          </div>
          <div 
            id="secure-history-container"
            className="rounded-lg overflow-hidden"
          ></div>
        </section>

        {/* Regular History Display */}
        {tab === 'browse' && (
          browseHistory.length === 0 ? (
            <EmptyState icon={<Globe className="w-10 h-10" />} message="No sites visited yet" />
          ) : (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-3 px-1">
                Browse History
              </h2>
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
            </section>
          )
        )}

        {tab === 'search' && (
          searchHistory.length === 0 ? (
            <EmptyState icon={<Search className="w-10 h-10" />} message="No searches yet" />
          ) : (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-3 px-1">
                Search History
              </h2>
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
            </section>
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