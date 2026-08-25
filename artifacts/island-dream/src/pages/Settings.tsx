import { useLocation } from 'wouter';
import { useSettings } from '@/hooks/use-settings';
import { ArrowLeft, Shield, ShieldOff, RotateCw, Ban, Lock } from 'lucide-react';
import { useEffect, useRef } from 'react';
import SecureView from '@/lib/SecureView';

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
  const secureViewRef = useRef<SecureView | null>(null);

  useEffect(() => {
    // Initialize SecureView for sensitive settings data
    const secureView = new SecureView({
      encryptionKey: 'island-browser-secure',
      showIndicator: true
    });

    secureView.init('secure-settings-container');
    secureViewRef.current = secureView;

    // Store sensitive settings data in secure worker
    const sensitiveData = {
      privacySettings: {
        adBlockEnabled: settings.adBlockEnabled,
        redirectBlockEnabled: settings.redirectBlockEnabled,
        popupBlockEnabled: settings.popupBlockEnabled,
      },
      lastModified: new Date().toISOString(),
      sessionToken: `session-${Date.now()}`
    };

    secureView.storeSecurely('browser-settings', sensitiveData);

    // Render secure settings summary
    secureView.render(
      `
      <div style="padding: 10px; font-family: inherit;">
        <div style="margin-bottom: 12px;">
          <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Privacy Configuration</p>
        </div>
        <div style="space-y: 8px;">
          <div style="padding: 8px; background: #f5f5f5; border-radius: 6px; margin-bottom: 8px;">
            <p style="margin: 4px 0; font-size: 13px;"><strong>Ad & Tracker Blocker:</strong></p>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">${settings.adBlockEnabled ? '✓ Enabled' : '✗ Disabled'}</p>
          </div>
          <div style="padding: 8px; background: #f5f5f5; border-radius: 6px; margin-bottom: 8px;">
            <p style="margin: 4px 0; font-size: 13px;"><strong>Redirect Blocker:</strong></p>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">${settings.redirectBlockEnabled ? '✓ Enabled' : '✗ Disabled'}</p>
          </div>
          <div style="padding: 8px; background: #f5f5f5; border-radius: 6px; margin-bottom: 8px;">
            <p style="margin: 4px 0; font-size: 13px;"><strong>Popup Blocker:</strong></p>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">${settings.popupBlockEnabled ? '✓ Enabled' : '✗ Disabled'}</p>
          </div>
          <div style="padding: 8px; background: #f0f0f0; border-radius: 6px; border-left: 3px solid #667eea;">
            <p style="margin: 4px 0; font-size: 11px; color: #999;">Last Updated: ${new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
      `,
      'Secure Privacy Settings'
    );

    return () => {
      secureView.clear();
    };
  }, [settings]);

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

        {/* Secure Settings Container - Hidden from Extensions */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary/60">
              Extension-Isolated Settings
            </h2>
          </div>
          <div 
            id="secure-settings-container" 
            className="mb-6"
          ></div>
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
            <ToggleRow
              icon={<Ban className="w-5 h-5" />}
              label="Popup Blocker"
              description="Stop new windows, tabs, and popup frames opened by proxied pages unless you turn this off."
              checked={settings.popupBlockEnabled}
              onChange={v => set('popupBlockEnabled', v)}
            />
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground pt-4">
          All settings are stored locally on this device only.
          <br />
          <span className="text-primary/60 text-xs">🔒 Secure settings isolated from browser extensions</span>
        </p>
      </main>
    </div>
  );
}