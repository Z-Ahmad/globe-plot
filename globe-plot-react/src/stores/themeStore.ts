import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  setDark: (isDark: boolean) => void;
}

const applyTheme = (isDark: boolean) => {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: false,
      toggleTheme: () =>
        set((state) => {
          const next = !state.isDark;
          applyTheme(next);
          return { isDark: next };
        }),
      setDark: (isDark: boolean) => {
        applyTheme(isDark);
        set({ isDark });
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);

// Apply theme immediately on module load (before React renders)
const stored = localStorage.getItem('theme-storage');
if (stored) {
  try {
    const parsed = JSON.parse(stored);
    if (parsed?.state?.isDark) {
      document.documentElement.classList.add('dark');
    }
  } catch {
    // ignore
  }
}
