import { useState, useEffect } from 'react';

export interface Settings {
  adBlockEnabled: boolean;
  redirectBlockEnabled: boolean;
  popupBlockEnabled: boolean;
}

const DEFAULTS: Settings = {
  adBlockEnabled: true,
  redirectBlockEnabled: true,
  popupBlockEnabled: true,
};

const KEY = 'island_dream_settings';

function load(): Settings {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return { ...DEFAULTS, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const reset = () => {
    setSettings(DEFAULTS);
    localStorage.removeItem(KEY);
  };

  return { settings, set, reset };
}
