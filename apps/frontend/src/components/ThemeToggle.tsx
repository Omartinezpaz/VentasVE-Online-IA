'use client';

import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'dark';
  const savedTheme = localStorage.getItem('theme') as ThemeMode | null;
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
  if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[11px] font-medium text-[var(--foreground)] hover:border-[var(--accent)] transition-colors"
    >
      <span suppressHydrationWarning>{theme === 'dark' ? '🌙 Oscuro' : '☀️ Claro'}</span>
    </button>
  );
}
