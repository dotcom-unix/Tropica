import { useLocation } from 'wouter';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { ArrowLeft, Bookmark, Globe, Trash2, X, Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import SecureView from '@/lib/SecureView';

export default function Bookmarks() {
  const [, setLocation] = useLocation();
  const { bookmarks, removeBookmark, clearBookmarks } = useBookmarks();
  const secureViewRef = useRef<SecureView | null>(null);

  useEffect(() => {
    const secureView = new SecureView({
      encryptionKey: 'island-browser-bookmarks-secure',
      showIndicator: true
    });
    
    secureView.init('secure-bookmarks-container');
    secureViewRef.current = secureView;

    // Store bookmarks in secure worker
    secureView.storeSecurely('bookmarks', {
      totalBookmarks: bookmarks.length,
      bookmarks: bookmarks.map(b => ({
        title: b.title,
        url: b.url,
        addedAt: b.addedAt
      })),
      lastUpdated: new Date().toISOString()
    });

    // Render secure bookmarks summary
    secureView.render(
      `
      <div style="padding: 12px;">
        <div style="margin-bottom: 14px;">
          <p style="margin: 0; color: #666; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.6px;">Bookmarks</p>
        </div>
        <div style="background: #f9f9f9; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Total Bookmarks:</strong></p>
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #667eea;">${bookmarks.length}</p>
        </div>
        ${bookmarks.length > 0 ? `
          <div style="background: #f5f5f5; border-radius: 6px; padding: 10px;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #333;">Recent Bookmarks:</p>
            ${bookmarks.slice(0, 5).map((b, idx) => `
              <div style="padding: 6px 0; border-bottom: ${idx < 4 ? '1px solid #e0e0e0' : 'none'}; font-size: 11px;">
                <p style="margin: 0; color: #333; word-break: break-word;">${b.title || b.url}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
      `,
      'Secure Bookmarks'
    );

    return () => {
      secureView.clear();
    };
  }, [bookmarks]);

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

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Secure Bookmarks Summary */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary/60">
              Extension-Isolated Bookmarks
            </h2>
          </div>
          <div 
            id="secure-bookmarks-container"
            className="rounded-lg overflow-hidden"
          ></div>
        </section>

        {/* Regular Bookmarks Display */}
        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
            <Bookmark className="w-10 h-10" />
            <p className="text-base">No bookmarks yet</p>
            <p className="text-sm text-center max-w-xs">
              While browsing securely, tap the bookmark icon in the toolbar to save a site.
            </p>
          </div>
        ) : (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-3 px-1">
              All Bookmarks
            </h2>
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
          </section>
        )}
      </main>
    </div>
  );
}
