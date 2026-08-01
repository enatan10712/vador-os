'use client';

import { useEffect } from 'react';
import { useStore } from '../store/useStore';

const STORAGE_KEYS = {
  theme: 'vador_theme',
  locale: 'vador_preferred_locale',
  workspace: 'vador_active_workspace',
} as const;

export default function PreferenceHydrator() {
  const setTheme = useStore((state) => state.setTheme);
  const setLocale = useStore((state) => state.setLocale);
  const setActiveWorkspace = useStore((state) => state.setActiveWorkspace);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedTheme = window.localStorage.getItem(STORAGE_KEYS.theme);
    const storedLocale = window.localStorage.getItem(STORAGE_KEYS.locale);
    const storedWorkspace = window.localStorage.getItem(STORAGE_KEYS.workspace);

    if (storedTheme === 'light' || storedTheme === 'dark') {
      setTheme(storedTheme);
    }

    if (storedLocale === 'en' || storedLocale === 'am') {
      setLocale(storedLocale);
    }

    if (storedWorkspace) {
      setActiveWorkspace(storedWorkspace);
    }
  }, [setActiveWorkspace, setLocale, setTheme]);

  return null;
}
