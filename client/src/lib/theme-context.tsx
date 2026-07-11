import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export const Theme = {
  light: 'light',
  dark: 'dark',
} as const;

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'helpdesk-theme';

function isTheme(value: string | null): value is Theme {
  return value === Theme.light || value === Theme.dark;
}

function getStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isTheme(stored) ? stored : Theme.light;
}

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue>({ theme: Theme.light, setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === Theme.dark);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
