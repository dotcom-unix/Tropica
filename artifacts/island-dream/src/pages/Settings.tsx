import { useLocation } from 'wouter';
import { useSettings } from '@/hooks/use-settings';
import { ArrowLeft, Terminal, Shield, ShieldOff, RotateCw } from 'lucide-react';

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ icon, label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-card border border-border hover:border-primary/20 transition-colors">
      <div className="text-primary shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
          checked ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { settings, set, reset } = useSettings();

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="bg-gradient-to-r from-primary to-[#0f8b8d] text-white px-4 py-3 flex items-center gap-3 shadow-lg sticky top-0 z-10">
        <button
          onClick={() => setLocation('/')}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-serif text-xl font-bold flex-1">Settings</h1>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors"
          title="Reset to defaults"
        >
          <RotateCw className="w-4 h-4" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8 space-y-6">

        {/* Developer */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-3 px-1">
            Developer
          </h2>
          <div className="space-y-2">
            <ToggleRow
              icon={<Terminal className="w-5 h-5" />}
              label="Browser Terminal"
              description="Show a console panel while browsing securely. Captures logs, errors, and network issues from proxied pages."
              checked={settings.terminalEnabled}
              onChange={v => set('terminalEnabled', v)}
            />
          </div>
        </section>

        {/* Privacy */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-3 px-1">
            Privacy & Security
          </h2>
          <div className="space-y-2">
            <ToggleRow
              icon={<Shield className="w-5 h-5" />}
              label="Ad & Tracker Blocker"
              description="Strip known ad networks, tracking pixels, and analytics scripts from proxied pages."
              checked={settings.adBlockEnabled}
              onChange={v => set('adBlockEnabled', v)}
            />
            <ToggleRow
              icon={<ShieldOff className="w-5 h-5" />}
              label="Redirect Blocker"
              description="Intercept HTTP, meta-refresh, and JavaScript redirects and ask before following them."
              checked={settings.redirectBlockEnabled}
              onChange={v => set('redirectBlockEnabled', v)}
            />
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground pt-4">
          All settings are stored locally on this device only.
        </p>
      </main>
    </div>
  );
}
