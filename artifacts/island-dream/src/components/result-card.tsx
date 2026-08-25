import { useState } from 'react';
import { useLocation } from 'wouter';
import { SearchResult } from '@workspace/api-client-react';
import { Shield, Globe, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function ResultCard({ result, index }: { result: SearchResult, index: number }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [, setLocation] = useLocation();

  const handleSecureOpen = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setModalOpen(false);
    setLocation(`/browse?url=${encodeURIComponent(result.url)}`);
  };

  return (
    <>
      <div 
        data-testid={`card-result-${index}`}
        onClick={handleSecureOpen}
        className="group bg-card rounded-2xl p-6 border border-card-border shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden relative"
      >
        {/* Subtle decorative coral accent on hover */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

        <div className="flex items-start gap-4 relative z-10">
          <div className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
            {result.favicon ? (
              <img src={result.favicon} alt="" className="w-6 h-6 object-contain" />
            ) : (
              <Globe className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-primary/80 truncate">{result.domain}</span>
            </div>
            <h3 className="text-xl font-serif font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">
              {result.title}
            </h3>
            <p className="text-foreground/70 text-sm line-clamp-2 mb-6">
              {result.description}
            </p>
            
            <div className="flex flex-wrap items-center gap-3">
              <button 
                data-testid={`button-secure-${index}`}
                onClick={handleSecureOpen}
                className="flex items-center gap-2 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground px-4 py-2 rounded-full text-sm font-medium transition-colors"
              >
                <span>Open Securely 🛡️</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-primary/20 shadow-2xl" data-testid="dialog-open-choice">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-center mb-4">Open securely in Tropic?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <button
              data-testid="dialog-button-secure"
              onClick={handleSecureOpen}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-primary/5 hover:bg-primary/10 border-2 border-primary/20 hover:border-primary transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-lg text-primary">Open Securely 🛡️</div>
                  <div className="text-sm text-foreground/70">Stay in paradise. Load page via proxy.</div>
                </div>
              </div>
              <ChevronRight className="text-primary opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>

          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
