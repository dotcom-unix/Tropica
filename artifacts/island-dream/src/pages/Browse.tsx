import { useState, useRef, useEffect } from 'react';
import { useSearch as useWouterSearch, useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, RotateCw, Home, Shield, Lock } from 'lucide-react';
import { useGetProxyMeta, getGetProxyMetaQueryKey } from '@workspace/api-client-react';

export default function Browse() {
  const searchString = useWouterSearch();
  const queryParams = new URLSearchParams(searchString);
  const initialUrl = queryParams.get('url') || '';
  const [, setLocation] = useLocation();

  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [inputValue, setInputValue] = useState(initialUrl);
  
  const [iframeKey, setIframeKey] = useState(0);

  const { data: meta } = useGetProxyMeta(
    { url: currentUrl },
    { query: { enabled: !!currentUrl, queryKey: getGetProxyMetaQueryKey({ url: currentUrl }) } }
  );

  useEffect(() => {
    setInputValue(currentUrl);
  }, [currentUrl]);

  if (!initialUrl) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-sans">
        <p className="text-2xl text-foreground font-serif mb-4">No island mapped.</p>
        <button onClick={() => setLocation('/')} className="px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors">Go Home</button>
      </div>
    );
  }

  const handleRefresh = () => {
    setIframeKey(k => k + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalUrl = inputValue;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }
    setCurrentUrl(finalUrl);
  };

  const handleBack = () => {
    window.history.back();
  };
  
  const handleForward = () => {
    window.history.forward();
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-card font-sans">
      <header className="shrink-0 bg-gradient-to-r from-primary to-[#0f8b8d] text-white p-2 md:p-3 flex items-center gap-2 md:gap-4 shadow-lg z-10">
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <button onClick={() => setLocation('/')} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Home" data-testid="button-home">
            <Home className="w-5 h-5" />
          </button>
          <button onClick={handleBack} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Back" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button onClick={handleForward} className="p-2 hover:bg-white/20 rounded-full transition-colors hidden sm:block" title="Forward" data-testid="button-forward">
            <ArrowRight className="w-5 h-5" />
          </button>
          <button onClick={handleRefresh} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Refresh" data-testid="button-refresh">
            <RotateCw className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex items-center max-w-4xl mx-auto relative group" data-testid="form-address-bar">
          <div className="absolute left-3 flex items-center justify-center">
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
            className="w-full bg-white text-gray-900 pl-10 pr-32 py-2 rounded-full focus:outline-none focus:ring-4 ring-accent/50 shadow-inner font-sans text-sm md:text-base border-none"
            data-testid="input-url"
          />
          <div className="absolute right-1 top-1 bottom-1 hidden sm:flex items-center">
             <div className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
               <Shield className="w-3 h-3" />
               Secure Mode 🛡️
             </div>
          </div>
        </form>
        
        <div className="sm:hidden shrink-0">
           <div className="bg-emerald-400 text-emerald-950 p-1.5 rounded-full" title="Secure Mode 🛡️">
             <Shield className="w-4 h-4" />
           </div>
        </div>
      </header>
      
      {meta?.title && (
        <div className="shrink-0 bg-white border-b border-border px-4 py-1.5 flex items-center gap-2 text-sm shadow-sm z-0">
          <span className="font-medium text-foreground truncate">{meta.title}</span>
        </div>
      )}

      <main className="flex-1 w-full bg-white relative animate-in fade-in duration-1000">
        <iframe
          key={iframeKey}
          src={`/api/proxy?url=${encodeURIComponent(currentUrl)}`}
          className="w-full h-full border-none"
          title="Secure Proxy View"
          sandbox="allow-same-origin allow-scripts allow-forms"
          data-testid="iframe-proxy"
        />
      </main>
    </div>
  );
}
