import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = '3dw-theme-mode';
const THEME_COLOR_LIGHT = '#0d9488';
const THEME_COLOR_DARK = '#0b1220';
const DEFAULT_THEME_MODE: ThemeMode = 'system';
const DEFAULT_RESOLVED_THEME: ResolvedTheme = 'light';

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const modeOrder: ThemeMode[] = ['light', 'dark', 'system'];

function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_MODE;
  }

  const modeFromDom = document.documentElement.dataset.themeMode;
  if (isThemeMode(modeFromDom)) {
    return modeFromDom;
  }

  try {
    const storedMode = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeMode(storedMode)) {
      return storedMode;
    }
  } catch {
    // Local storage can be blocked in hardened browser environments.
  }

  return DEFAULT_THEME_MODE;
}

function systemPreference(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return DEFAULT_RESOLVED_THEME;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') {
    return systemPreference();
  }
  return mode;
}

function applyThemeToDocument(mode: ThemeMode, resolvedTheme: ResolvedTheme): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.dataset.themeMode = mode;
  root.dataset.resolvedTheme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta instanceof HTMLMetaElement) {
    themeMeta.setAttribute('content', resolvedTheme === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
  }
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_THEME_MODE);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(DEFAULT_RESOLVED_THEME);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initialMode = readStoredMode();
    const initialResolvedTheme = resolveTheme(initialMode);
    setModeState(initialMode);
    setResolvedTheme(initialResolvedTheme);
    setIsReady(true);
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    setResolvedTheme(resolveTheme(nextMode));
  }, []);

  const cycleMode = useCallback(() => {
    const currentIndex = modeOrder.indexOf(mode);
    const nextMode = modeOrder[(currentIndex + 1) % modeOrder.length] ?? DEFAULT_THEME_MODE;
    setMode(nextMode);
  }, [mode, setMode]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Ignore local storage write errors.
    }

    applyThemeToDocument(mode, resolvedTheme);
  }, [isReady, mode, resolvedTheme]);

  useEffect(() => {
    if (!isReady || mode !== 'system' || typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onChange);
      return () => mediaQuery.removeEventListener('change', onChange);
    }

    mediaQuery.addListener(onChange);
    return () => mediaQuery.removeListener(onChange);
  }, [isReady, mode]);

  const value = useMemo(
    () => ({ mode, resolvedTheme, setMode, cycleMode }),
    [mode, resolvedTheme, setMode, cycleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider.');
  }
  return context;
}
