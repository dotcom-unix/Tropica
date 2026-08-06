import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearch as useWouterSearch, useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, RotateCw, Home, Shield, Lock, ShieldOff, ShieldCheck } from 'lucide-react';
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

interface RedirectRequest {
  url: string;
  from?: string;
}

export default function Browse() {
  const searchString = useWouterSearch();
  const queryParams = new URLSearchParams(searchString);
  const initialUrl = queryParams.get('url') || '';
  const [, setLocation] = useLocation();

  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [inputValue, setInputValue] = useState(initialUrl);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Redirect blocker state
  const [pendingRedirect, setPendingRedirect] = useState<RedirectRequest | null>(null);

  const { data: meta } = useGetProxyMeta(
    { url: currentUrl },
    { query: { enabled: !!currentUrl, queryKey: getGetProxyMetaQueryKey({ url: currentUrl }) } }
  );

  useEffect(() => {
    setInputValue(currentUrl);
  }, [currentUrl]);

  // Listen for postMessage events from proxied iframe content
  const handleMessage = useCallback((event: MessageEvent) => {
    if (!event.data || typeof event.data !== 'object') return;
    if (event.data.type === 'island-dream-redirect') {
      const url = event.data.url as string;
      const from = event.data.from as string | undefined;
      if (url) {
        setPendingRedirect({ url, from });
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  if (!initialUrl) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-sans">
        <p className="text-2xl text-foreground font-serif mb-4">No island mapped.</p>
        <button
          onClick={() => setLocation('/')}
          className="px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors"
          data-testid="button-go-home"
        >
          Go Home
        </button>
      </div>
    );
  }

  const handleRefresh = () => setIframeKey((k) => k + 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalUrl = inputValue;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }
    setCurrentUrl(finalUrl);
  };

  const handleBack = () => window.history.back();
  const handleForward = () => window.history.forward();

  // Redirect dialog handlers
  const allowRedirect = () => {
    if (!pendingRedirect) return;
    setCurrentUrl(pendingRedirect.url);
    setInputValue(pendingRedirect.url);
    setIframeKey((k) => k + 1);
    setPendingRedirect(null);
  };

  const blockRedirect = () => {
    setPendingRedirect(null);
  };

  const formatUrlDisplay = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '');
    } catch {
      return url;
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-card font-sans">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-gradient-to-r from-primary to-[#0f8b8d] text-white p-2 md:p-3 flex items-center gap-2 md:gap-3 shadow-lg z-10">
        {/* Nav buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setLocation('/')}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Home"
            data-testid="button-home"
          >
            <Home className="w-5 h-5" />
          </button>
          <button
            onClick={handleBack}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Back"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleForward}
            className="p-2 hover:bg-white/20 rounded-full transition-colors hidden sm:block"
            title="Forward"
            data-testid="button-forward"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Refresh"
            data-testid="button-refresh"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>

        {/* Address bar */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 flex items-center relative group"
          data-testid="form-address-bar"
        >
          <div className="absolute left-3 flex items-center justify-center z-10">
            {meta?.favicon ? (
              <img src={meta.favicon} alt="" className="w-4 h-4 object-contain" />
            ) : (
              <Lock className="w-4 h-4 text-primary/70" />
            )}
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full bg-white text-gray-900 pl-9 pr-3 py-2 rounded-full focus:outline-none focus:ring-4 ring-accent/50 shadow-inner font-sans text-sm border-none"
            data-testid="input-url"
          />
        </form>

        {/* Security & ad-block badges */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div
            className="flex items-center gap-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors cursor-default select-none"
            title="Secure proxy mode — traffic is routed through Island Dream"
            data-testid="badge-secure"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Secure</span>
          </div>
        </div>

        {/* Mobile shield */}
        <div className="sm:hidden shrink-0">
          <div className="bg-emerald-400 text-emerald-950 p-1.5 rounded-full" title="Secure Mode">
            <Shield className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* Page title strip */}
      {meta?.title && (
        <div className="shrink-0 bg-white border-b border-border px-4 py-1.5 flex items-center gap-2 text-sm shadow-sm z-0">
          <span className="font-medium text-foreground truncate" data-testid="text-page-title">
            {meta.title}
          </span>
        </div>
      )}

      {/* Iframe proxy view */}
      <main className="flex-1 w-full bg-white relative animate-in fade-in duration-700">
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

      {/* ── Redirect Confirmation Dialog ─────────────────────────────────── */}
      <Dialog open={!!pendingRedirect} onOpenChange={(open) => { if (!open) blockRedirect(); }}>
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
                    <span className="font-medium text-foreground">
                      {formatUrlDisplay(pendingRedirect.from)}
                    </span>{' '}
                    wants to redirect you.
                  </p>
                )}
                <p className="text-sm text-muted-foreground">Destination:</p>
                <div
                  className="bg-muted rounded-lg px-3 py-2 text-xs font-mono text-foreground break-all border border-border"
                  data-testid="text-redirect-url"
                >
                  {pendingRedirect?.url}
                </div>
                <p className="text-xs text-muted-foreground">
                  Island Dream blocked this redirect. Do you want to follow it?
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={blockRedirect}
              className="flex items-center gap-1.5"
              data-testid="button-block-redirect"
            >
              <ShieldOff className="w-4 h-4 text-destructive" />
              Block Redirect
            </Button>
            <Button
              onClick={allowRedirect}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90"
              data-testid="button-allow-redirect"
            >
              <ShieldCheck className="w-4 h-4" />
              Allow &amp; Follow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
