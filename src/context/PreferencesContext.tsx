import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  detectDeviceLanguage,
  TRANSLATIONS,
  type AppLanguage,
  type AppTranslations,
  type LanguagePreference,
  type ThemePreference,
} from '../i18n/translations';

const THEME_STORAGE_KEY = 'droidport_theme_v1';
const LANGUAGE_STORAGE_KEY = 'droidport_language_v1';
const AUTO_CHECK_UPDATES_KEY = 'droidport_auto_check_updates_v1';

interface PreferencesContextValue {
  themePreference: ThemePreference;
  resolvedTheme: 'dark' | 'light' | 'purple';
  setThemePreference: (theme: ThemePreference) => void;
  languagePreference: LanguagePreference;
  deviceLanguage: AppLanguage;
  language: AppLanguage;
  setLanguagePreference: (lang: LanguagePreference) => void;
  autoCheckUpdates: boolean;
  setAutoCheckUpdates: (enabled: boolean) => void;
  t: AppTranslations;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (
        saved === 'light' ||
        saved === 'dark' ||
        saved === 'purple' ||
        saved === 'system'
      ) {
        return saved;
      }
    } catch {
      // Ignore storage errors
    }
    return 'dark';
  });

  const [systemDark, setSystemDark] = useState<boolean>(getSystemPrefersDark);

  const [languagePreference, setLanguagePreference] =
    useState<LanguagePreference>(() => {
      try {
        const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (
          saved === 'auto' ||
          saved === 'pt-BR' ||
          saved === 'en' ||
          saved === 'es'
        ) {
          return saved;
        }
      } catch {
        // Ignore storage errors
      }
      return 'auto';
    });

  const [autoCheckUpdates, setAutoCheckUpdates] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(AUTO_CHECK_UPDATES_KEY);
      if (saved === 'false') return false;
    } catch {
      // Ignore storage errors
    }
    return true;
  });

  const deviceLanguage = useMemo(() => detectDeviceLanguage(), []);
  const language: AppLanguage =
    languagePreference === 'auto' ? deviceLanguage : languagePreference;

  const resolvedTheme: 'dark' | 'light' | 'purple' =
    themePreference === 'system' ? (systemDark ? 'dark' : 'light') : themePreference;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);

    setSystemDark(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themePreference);
    } catch {
      // Ignore
    }
  }, [themePreference]);

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, languagePreference);
    } catch {
      // Ignore
    }
  }, [languagePreference]);

  useEffect(() => {
    try {
      localStorage.setItem(AUTO_CHECK_UPDATES_KEY, String(autoCheckUpdates));
    } catch {
      // Ignore
    }
  }, [autoCheckUpdates]);

  useEffect(() => {
    const root = document.documentElement;
    const isPurple = resolvedTheme === 'purple';
    const isDarkLike = resolvedTheme === 'dark' || isPurple;

    root.classList.toggle('dark', isDarkLike);
    root.classList.toggle('purple', isPurple);
    root.style.colorScheme = isDarkLike ? 'dark' : 'light';

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute(
        'content',
        isPurple ? '#140C24' : resolvedTheme === 'dark' ? '#0F0E13' : '#F4F5F9'
      );
    }
  }, [resolvedTheme]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      themePreference,
      resolvedTheme,
      setThemePreference,
      languagePreference,
      deviceLanguage,
      language,
      setLanguagePreference,
      autoCheckUpdates,
      setAutoCheckUpdates,
      t: TRANSLATIONS[language],
    }),
    [
      themePreference,
      resolvedTheme,
      languagePreference,
      deviceLanguage,
      language,
      autoCheckUpdates,
    ]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return ctx;
}
