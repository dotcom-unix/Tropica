import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearch as useWouterSearch, useLocation } from 'wouter';
import {
  ArrowLeft, ArrowRight, RotateCw, Home, Shield, Lock,
  ShieldOff, ShieldCheck, Bookmark, BookmarkCheck, Clock, Globe,
  Terminal, X, Trash2, ChevronDown, ChevronUp, Settings,
} from 'lucide-react';
import { useGetProxyMeta, getGetProxyMetaQueryKey } from '@workspace/api-client-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { useBrowseHistory } from '@/hooks/use-browse-history';
import { useSettings } from '@/hooks/use-settings';

interface RedirectRequest { url: string; from?: string; }

interface ConsoleEntry {
  id: number;
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  args: string[];
  source: string;
  ts: number;
}

let entryId = 0;

const LEVEL_STYLES: Record<ConsoleEntry['level'], string> = {
  log:   'text-gray-300',
  info:  'text-blue-400',
  debug: 'text-gray-500',
  warn:  'bg-yellow-950/60 text-yellow-300 border-l-2 border-yellow-500',
  error: 'bg-red-950/60 text-red-400 border-l-2 border-red-500',
};

const LEVEL_BADGE: Record<ConsoleEntry['level'], string> = {
  log:   'text-gray-500',
  info:  'text-blue-500',
  debug: 'text-gray-600',
  warn:  'text-yellow-500 font-bold',
  error: 'text-red-500 font-bold',
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 2 });
}

export default function Browse() {
  const searchString = useWouterSearch();
  const queryParams = new URLSearchParams(searchString);
  const initialUrl = queryParams.get('url') || '';
  const [, setLocation] = useLocation();

  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [inputValue, setInputValue] = useState(initialUrl);
  const [iframeKey, setIframeKey] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const addressWrapperRef = useRef<HTMLDivElement>(null);

  const [pendingRedirect, setPendingRedirect] = useState<RedirectRequest | null>(null);

  // Terminal state
  const [consoleLog, setConsoleLog] = useState<ConsoleEntry[]>([]);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(220);
  const [errorCount, setErrorCount] = useState(0);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartH = useRef(0);

  const { addBookmark, removeBookmark, isBookmarked } = useBookmarks();
  const { browseHistory, addBrowseEntry } = useBrowseHistory();
  const { settings } = useSettings();

  const { data: meta } = useGetProxyMeta(
    { url: currentUrl },
    { query: { enabled: !!currentUrl, queryKey: getGetProxyMetaQueryKey({ url: currentUrl }) } }
  );

  useEffect(() => {
    if (!currentUrl) return;
    addBrowseEntry({ url: currentUrl, title: meta?.title || currentUrl, favicon: meta?.favicon });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUrl, meta?.title]);

  useEffect(() => { setInputValue(currentUrl); }, [currentUrl]);

  // Reset error count when navigating
  useEffect(() => { setErrorCount(0); setConsoleLog([]); }, [currentUrl]);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalOpen) terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLog, terminalOpen]);

  // Close address suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addressWrapperRef.current && !addressWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Terminal drag-to-resize
  const onDragStart = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartH.current = terminalHeight;
    e.preventDefault();
  };
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = dragStartY.current - e.clientY;
      setTerminalHeight(Math.max(100, Math.min(600, dragStartH.current + delta)));
    };
    const onUp = () => { isDragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    if (!event.data || typeof event.data !== 'object') return;

    if (event.data.type === 'island-dream-redirect') {
      const url = event.data.url as string;
      const from = event.data.from as string | undefined;
      if (url) setPendingRedirect({ url, from });
    }

    if (event.data.type === 'island-dream-console' && settings.terminalEnabled) {
      const entry: ConsoleEntry = {
        id: ++entryId,
        level: event.data.level || 'log',
        args: Array.isArray(event.data.args) ? event.data.args : [String(event.data.args)],
        source: event.data.source || '',
        ts: event.data.ts || Date.now(),
      };
      setConsoleLog(prev => [...prev.slice(-499), entry]);
      if (entry.level === 'error') {
        setErrorCount(n => n + 1);
        if (!terminalOpen) setTerminalOpen(true); // auto-open on first error
      }
    }
  }, [settings.terminalEnabled, terminalOpen]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  if (!initialUrl) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-sans">
        <p className="text-2xl text-foreground font-serif mb-4">No island mapped.</p>
        <button onClick={() => setLocation('/')} className="px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors" data-testid="button-go-home">Go Home</button>
      </div>
    );
  }

  const handleRefresh = () => { setIframeKey(k => k + 1); setConsoleLog([]); setErrorCount(0); };

  const navigateTo = (url: string) => {
    let final = url;
    if (!/^https?:\/\//i.test(final)) final = 'https://' + final;
    setCurrentUrl(final);
    setInputValue(final);
    setShowSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); navigateTo(inputValue); };
  const handleBack = () => window.history.back();
  const handleForward = () => window.history.forward();

  const allowRedirect = () => {
    if (!pendingRedirect) return;
    setCurrentUrl(pendingRedirect.url);
    setInputValue(pendingRedirect.url);
    setIframeKey(k => k + 1);
    setPendingRedirect(null);
  };
  const blockRedirect = () => setPendingRedirect(null);

  const formatUrlDisplay = (url: string) => {
    try { const p = new URL(url); return p.hostname + (p.pathname !== '/' ? p.pathname : ''); }
    catch { return url; }
  };

  const toggleBookmark = () => {
    if (isBookmarked(currentUrl)) removeBookmark(currentUrl);
    else addBookmark({ url: currentUrl, title: meta?.title || currentUrl, favicon: meta?.favicon });
  };

  const addressSuggestions = inputValue.trim()
    ? browseHistory.filter(e =>
        (e.url.toLowerCase().includes(inputValue.toLowerCase()) ||
         e.title.toLowerCase().includes(inputValue.toLowerCase())) &&
        e.url !== currentUrl).slice(0, 6)
    : browseHistory.slice(0, 6);

  const bookmarked = isBookmarked(currentUrl);

  const clearTerminal = () => { setConsoleLog([]); setErrorCount(0); };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-card font-sans">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-gradient-to-r from-primary to-[#0f8b8d] text-white p-2 md:p-3 flex items-center gap-2 md:gap-3 shadow-lg z-20">
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setLocation('/')} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Home" data-testid="button-home"><Home className="w-5 h-5" /></button>
          <button onClick={handleBack} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Back" data-testid="button-back"><ArrowLeft className="w-5 h-5" /></button>
          <button onClick={handleForward} className="p-2 hover:bg-white/20 rounded-full transition-colors hidden sm:block" title="Forward" data-testid="button-forward"><ArrowRight className="w-5 h-5" /></button>
          <button onClick={handleRefresh} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Refresh" data-testid="button-refresh"><RotateCw className="w-5 h-5" /></button>
        </div>

        {/* Address bar */}
        <div ref={addressWrapperRef} className="flex-1 relative">
          <form onSubmit={handleSubmit} className="flex items-center relative" data-testid="form-address-bar">
            <div className="absolute left-3 z-10">
              {meta?.favicon ? <img src={meta.favicon} alt="" className="w-4 h-4 object-contain" /> : <Lock className="w-4 h-4 text-primary/70" />}
            </div>
            <input
              type="text"
              value={inputValue}
              onChange={e => { setInputValue(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              autoComplete="off"
              className="w-full bg-white text-gray-900 pl-9 pr-3 py-2 rounded-full focus:outline-none focus:ring-4 ring-accent/50 shadow-inner font-sans text-sm border-none"
              data-testid="input-url"
            />
          </form>

          {showSuggestions && addressSuggestions.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <ul>
                {addressSuggestions.map((entry, i) => (
                  <li key={i}>
                    <button onMouseDown={e => { e.preventDefault(); navigateTo(entry.url); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-primary/5 transition-colors">
                      {entry.favicon ? <img src={entry.favicon} alt="" className="w-4 h-4 object-contain shrink-0" /> : <Globe className="w-4 h-4 text-gray-400 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate font-medium">{entry.title || entry.url}</p>
                        <p className="text-xs text-gray-400 truncate">{entry.url}</p>
                      </div>
                      <Clock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={toggleBookmark} className={`p-2 rounded-full transition-colors ${bookmarked ? 'bg-amber-400/30 hover:bg-amber-400/40 text-amber-200' : 'hover:bg-white/20'}`} title={bookmarked ? 'Remove bookmark' : 'Bookmark'} data-testid="button-bookmark">
            {bookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
          </button>

          {/* Terminal toggle — only show if enabled in settings */}
          {settings.terminalEnabled && (
            <button
              onClick={() => setTerminalOpen(o => !o)}
              className={`p-2 rounded-full transition-colors relative ${terminalOpen ? 'bg-white/25' : 'hover:bg-white/20'}`}
              title="Toggle terminal"
              data-testid="button-terminal"
            >
              <Terminal className="w-5 h-5" />
              {errorCount > 0 && !terminalOpen && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {errorCount > 99 ? '99+' : errorCount}
                </span>
              )}
            </button>
          )}

          <button onClick={() => setLocation('/settings')} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Settings" data-testid="button-settings">
            <Settings className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full cursor-default select-none" title="Secure proxy mode" data-testid="badge-secure">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Secure</span>
          </div>
          <div className="sm:hidden">
            <div className="bg-emerald-400 text-emerald-950 p-1.5 rounded-full" title="Secure Mode"><Shield className="w-4 h-4" /></div>
          </div>
        </div>
      </header>

      {/* Page title strip */}
      {meta?.title && (
        <div className="shrink-0 bg-white border-b border-border px-4 py-1.5 flex items-center gap-2 text-sm shadow-sm z-0">
          <span className="font-medium text-foreground truncate" data-testid="text-page-title">{meta.title}</span>
        </div>
      )}

      {/* Iframe */}
      <main className="flex-1 w-full bg-white relative overflow-hidden animate-in fade-in duration-700">
        <iframe
          ref={iframeRef}
          key={iframeKey}
          src={`/api/proxy?url=${encodeURIComponent(currentUrl)}`}
          className="w-full h-full border-none"
          title="Secure Proxy View"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          data-testid="iframe-proxy"
        />
      </main>

      {/* ── Terminal Panel ────────────────────────────────────────────────── */}
      {settings.terminalEnabled && terminalOpen && (
        <div className="shrink-0 flex flex-col bg-gray-950 border-t-2 border-gray-700 z-30" style={{ height: terminalHeight }}>
          {/* Drag handle */}
          <div
            onMouseDown={onDragStart}
            className="shrink-0 h-1.5 bg-gray-700 hover:bg-primary cursor-ns-resize transition-colors"
            title="Drag to resize"
          />

          {/* Terminal header */}
          <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-gray-900 border-b border-gray-800 select-none">
            <Terminal className="w-3.5 h-3.5 text-green-400" />
            <span className="text-green-400 text-xs font-mono font-bold flex-1">
              Island Dream — Browser Console
              {currentUrl && (
                <span className="text-gray-500 font-normal ml-2 truncate max-w-[300px] inline-block align-bottom">
                  {formatUrlDisplay(currentUrl)}
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              {errorCount > 0 && (
                <span className="text-red-400 text-xs font-mono">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
              )}
              <button onClick={clearTerminal} className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white" title="Clear console">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setTerminalOpen(false)} className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white" title="Close terminal">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Log entries */}
          <div className="flex-1 overflow-y-auto font-mono text-xs">
            {consoleLog.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-600 gap-2">
                <Terminal className="w-4 h-4" />
                <span>No output yet — waiting for page activity…</span>
              </div>
            ) : (
              consoleLog.map(entry => (
                <div key={entry.id} className={`flex gap-2 px-3 py-0.5 hover:bg-white/5 ${LEVEL_STYLES[entry.level]}`}>
                  <span className="shrink-0 text-gray-600 select-none">{formatTime(entry.ts)}</span>
                  <span className={`shrink-0 uppercase text-[10px] w-10 leading-5 ${LEVEL_BADGE[entry.level]}`}>{entry.level}</span>
                  <span className="flex-1 break-all whitespace-pre-wrap leading-5">{entry.args.join(' ')}</span>
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      )}

      {/* ── Redirect Confirmation Dialog ──────────────────────────────────── */}
      <Dialog open={!!pendingRedirect} onOpenChange={open => { if (!open) blockRedirect(); }}>
        <DialogContent className="max-w-md" data-testid="dialog-redirect">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <ShieldOff className="w-5 h-5 text-amber-500" />
              Redirect Detected
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-1">
                {pendingRedirect?.from && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{formatUrlDisplay(pendingRedirect.from)}</span>{' '}wants to redirect you.
                  </p>
                )}
                <p className="text-sm text-muted-foreground">Destination:</p>
                <div className="bg-muted rounded-lg px-3 py-2 text-xs font-mono text-foreground break-all border border-border" data-testid="text-redirect-url">
                  {pendingRedirect?.url}
                </div>
                <p className="text-xs text-muted-foreground">Island Dream blocked this redirect. Do you want to follow it?</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={blockRedirect} className="flex items-center gap-1.5" data-testid="button-block-redirect">
              <ShieldOff className="w-4 h-4 text-destructive" />Block Redirect
            </Button>
            <Button onClick={allowRedirect} className="flex items-center gap-1.5 bg-primary hover:bg-primary/90" data-testid="button-allow-redirect">
              <ShieldCheck className="w-4 h-4" />Allow &amp; Follow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
