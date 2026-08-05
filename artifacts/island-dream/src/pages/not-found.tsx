import { Link } from 'wouter';
import { Palmtree } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-4 text-center font-sans">
      <Palmtree className="w-24 h-24 text-primary/40 mb-6" />
      <h1 className="text-6xl font-serif font-bold text-primary mb-4">404</h1>
      <p className="text-xl text-foreground/80 mb-8 max-w-md">
        Looks like you've drifted too far from the shore. This island doesn't exist.
      </p>
      <Link href="/" className="px-8 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95 shadow-lg">
        Row Back Home
      </Link>
    </div>
  );
}
