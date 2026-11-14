import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Browser } from '@capacitor/browser';
import {
  Check,
  Download,
  Globe,
  HardDrive,
  HeartOff,
  Info,
  LogOut,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  ShieldCheck,
  Sun,
  Trash2,
} from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';
import {
  LANGUAGE_NAMES,
  type LanguagePreference,
  type ThemePreference,
} from '../i18n/translations';
import {
  communitySupabase,
  isNativeApp,
  PENDING_REPORT_GAME_KEY,
  signInCommunityWithGoogle,
} from '../lib/communitySupabase';

interface SettingsViewProps {
  appVersion: string;
  favoritesCount: number;
  downloadsCount: number;
  onCheckUpdatesNow: () => Promise<'up-to-date' | 'update-available' | 'error'>;
  onClearCache: () => Promise<void>;
  onClearFavorites: () => void;
}

const LIBRETORRENT_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=org.proninyaroslav.libretorrent';

function getGoogleUserName(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fullName =
    (typeof meta?.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta?.name === 'string' && meta.name.trim());
  if (fullName) return fullName;
  if (user.email) return user.email.split('@')[0];
  return 'Jogador';
}

function getGoogleUserAvatar(user: User): string | null {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const url =
    (typeof meta?.avatar_url === 'string' && meta.avatar_url.trim()) ||
    (typeof meta?.picture === 'string' && meta.picture.trim());
  return url || null;
}

export function SettingsView({
  appVersion,
  favoritesCount,
  downloadsCount,
  onCheckUpdatesNow,
  onClearCache,
  onClearFavorites,
}: SettingsViewProps) {
  const {
    themePreference,
    setThemePreference,
    languagePreference,
    deviceLanguage,
    setLanguagePreference,
    autoCheckUpdates,
    setAutoCheckUpdates,
    t,
  } = usePreferences();

  const [communityUser, setCommunityUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const [cacheCleared, setCacheCleared] = useState(false);
  const [favsCleared, setFavsCleared] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateCheckStatus, setUpdateCheckStatus] = useState<
    'idle' | 'up-to-date' | 'update-available'
  >('idle');

  useEffect(() => {
    let active = true;

    communitySupabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setCommunityUser(data.session?.user ?? null);
    });

    const { data: authListener } = communitySupabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setCommunityUser(session?.user ?? null);
        setAuthLoading(false);
        setAvatarFailed(false);
      }
    );

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      try {
        localStorage.removeItem(PENDING_REPORT_GAME_KEY);
      } catch {
        // Ignore
      }
      await signInCommunityWithGoogle();
      if (isNativeApp()) {
        setAuthLoading(false);
      }
    } catch (err) {
      setAuthLoading(false);
      setAuthError(
        err instanceof Error ? err.message : 'Erro ao conectar conta Google.'
      );
    }
  };

  const handleSignOut = async () => {
    await communitySupabase.auth.signOut();
    setCommunityUser(null);
  };

  const handleClearCache = async () => {
    await onClearCache();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2500);
  };

  const handleClearFavorites = () => {
    onClearFavorites();
    setFavsCleared(true);
    setTimeout(() => setFavsCleared(false), 2500);
  };

  const handleManualUpdateCheck = async () => {
    setCheckingUpdate(true);
    setUpdateCheckStatus('idle');
    try {
      const result = await onCheckUpdatesNow();
      if (result === 'up-to-date') {
        setUpdateCheckStatus('up-to-date');
      } else if (result === 'update-available') {
        setUpdateCheckStatus('update-available');
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleOpenLibreTorrent = async () => {
    try {
      await Browser.open({ url: LIBRETORRENT_PLAY_STORE_URL });
    } catch {
      window.open(LIBRETORRENT_PLAY_STORE_URL, '_system');
    }
  };

  const userName = communityUser ? getGoogleUserName(communityUser) : '';
  const userAvatar = communityUser ? getGoogleUserAvatar(communityUser) : null;
  const userInitial = (userName.trim()[0] || 'G').toUpperCase();

  const themeOptions: Array<{
    id: ThemePreference;
    label: string;
    icon: typeof Moon;
  }> = [
    { id: 'dark', label: t.settings.themeDark, icon: Moon },
    { id: 'light', label: t.settings.themeLight, icon: Sun },
    { id: 'purple', label: t.settings.themePurple, icon: Palette },
    { id: 'system', label: t.settings.themeSystem, icon: Monitor },
  ];

  const languageOptions: Array<{
    id: LanguagePreference;
    label: string;
  }> = [
    {
      id: 'auto',
      label: `${t.settings.languageDeviceDefault} (${LANGUAGE_NAMES[deviceLanguage]})`,
    },
    { id: 'pt-BR', label: LANGUAGE_NAMES['pt-BR'] },
    { id: 'en', label: LANGUAGE_NAMES.en },
    { id: 'es', label: LANGUAGE_NAMES.es },
  ];

  return (
    <div className="space-y-4 max-w-2xl">
      {/* 1. Google Account Card at Top */}
      <section className="rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
            {t.settings.accountSectionTitle}
          </h3>
          {communityUser && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Google</span>
            </span>
          )}
        </div>

        {communityUser ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {userAvatar && !avatarFailed ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="w-12 h-12 rounded-full object-cover border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] purple:from-[#7E22CE] purple:to-[#C026D3] text-white font-bold text-base flex items-center justify-center shrink-0">
                  {userInitial}
                </div>
              )}

              <div className="min-w-0">
                <p className="text-sm font-bold text-[#111827] dark:text-white truncate">
                  {userName}
                </p>
                {communityUser.email && (
                  <p className="text-xs text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] truncate">
                    {communityUser.email}
                  </p>
                )}
                <p className="text-[11px] text-[#6366F1] dark:text-[#A5B4FC] purple:text-[#D8B4FE] font-medium mt-0.5">
                  {t.settings.accountConnected}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="min-h-[40px] px-3 rounded-xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] hover:border-rose-500/40 text-xs font-semibold text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] hover:text-rose-500 inline-flex items-center gap-1.5 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.settings.signOut}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-bold text-[#111827] dark:text-white">
                {t.settings.accountGuestTitle}
              </p>
              <p className="text-xs text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] mt-0.5 leading-relaxed">
                {t.settings.accountGuestDesc}
              </p>
            </div>

            {authError && (
              <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/25 rounded-xl px-3 py-2">
                {authError}
              </p>
            )}

            <button
              type="button"
              disabled={authLoading}
              onClick={() => void handleGoogleSignIn()}
              className="w-full min-h-[44px] px-4 rounded-xl bg-[#F4F5F9] dark:bg-white hover:bg-[#E8EAF2] dark:hover:bg-gray-100 border border-[#E2E4EC] dark:border-transparent disabled:opacity-60 text-[#111827] text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2.5 transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              <span>
                {authLoading ? t.settings.redirecting : t.settings.signInGoogle}
              </span>
            </button>
          </div>
        )}
      </section>

      {/* 2. Appearance & Language */}
      <section className="rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] divide-y divide-[#E2E4EC] dark:divide-[#2A2738] purple:divide-[#392466]">
        {/* Theme Selector */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC]" />
            <h3 className="text-sm font-bold text-[#111827] dark:text-white">
              {t.settings.themeLabel}
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const active = themePreference === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setThemePreference(opt.id)}
                  className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                    active
                      ? opt.id === 'purple'
                        ? 'bg-gradient-to-r from-[#7E22CE] to-[#A855F7] border-[#C084FC] text-white shadow-sm shadow-[#9333EA]/35'
                        : 'bg-[#6366F1] purple:bg-[#9333EA] border-[#6366F1] purple:border-[#A855F7] text-white shadow-sm shadow-[#6366F1]/25'
                      : 'bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] text-[#374151] dark:text-[#D1D5DB] purple:text-[#DDD6FE] hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Language Selector */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC]" />
            <h3 className="text-sm font-bold text-[#111827] dark:text-white">
              {t.settings.languageLabel}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {languageOptions.map((opt) => {
              const active = languagePreference === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLanguagePreference(opt.id)}
                  className={`min-h-[42px] px-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition-colors ${
                    active
                      ? 'bg-[#6366F1]/12 dark:bg-[#6366F1]/20 purple:bg-[#9333EA]/25 border-[#6366F1] purple:border-[#A855F7] text-[#4F46E5] dark:text-white'
                      : 'bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] text-[#374151] dark:text-[#D1D5DB] purple:text-[#DDD6FE] hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/60'
                  }`}
                >
                  <span className="truncate text-left">{opt.label}</span>
                  {active && (
                    <Check className="w-4 h-4 text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Useful Preferences: Updates & P2P App */}
      <section className="rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] divide-y divide-[#E2E4EC] dark:divide-[#2A2738] purple:divide-[#392466]">
        {/* Auto-check Updates + Manual Check */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#111827] dark:text-white">
                {t.settings.autoUpdatesLabel}
              </h3>
              <p className="text-xs text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] mt-0.5">
                {t.settings.autoUpdatesDesc}
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={autoCheckUpdates}
              aria-label={t.settings.autoUpdatesLabel}
              onClick={() => setAutoCheckUpdates(!autoCheckUpdates)}
              className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 ${
                autoCheckUpdates
                  ? 'bg-[#6366F1] purple:bg-[#9333EA]'
                  : 'bg-[#D1D5DB] dark:bg-[#2A2738] purple:bg-[#392466]'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  autoCheckUpdates ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              disabled={checkingUpdate}
              onClick={() => void handleManualUpdateCheck()}
              className="min-h-[40px] px-3.5 rounded-xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/60 text-xs font-semibold text-[#111827] dark:text-white inline-flex items-center gap-2 transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC] ${
                  checkingUpdate ? 'animate-spin' : ''
                }`}
              />
              <span>
                {checkingUpdate
                  ? t.settings.checkingUpdates
                  : t.settings.checkUpdatesNow}
              </span>
            </button>

            {updateCheckStatus === 'up-to-date' && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {t.settings.upToDateMessage}
              </span>
            )}
            {updateCheckStatus === 'update-available' && (
              <span className="text-xs font-medium text-[#6366F1] dark:text-[#A5B4FC] purple:text-[#D8B4FE]">
                {t.settings.updateFoundMessage}
              </span>
            )}
          </div>
        </div>

        {/* LibreTorrent Shortcut */}
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] flex items-center justify-center text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC] shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#111827] dark:text-white">
                {t.settings.libreTorrentTitle}
              </h3>
              <p className="text-xs text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] mt-0.5">
                {t.settings.libreTorrentDesc}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleOpenLibreTorrent()}
            className="min-h-[44px] px-4 rounded-xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/60 text-[#111827] dark:text-white text-xs font-semibold shrink-0 transition-colors"
          >
            {t.settings.libreTorrentAction}
          </button>
        </div>
      </section>

      {/* 4. Storage & Cleanup */}
      <section className="rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] divide-y divide-[#E2E4EC] dark:divide-[#2A2738] purple:divide-[#392466]">
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] flex items-center justify-center text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC] shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#111827] dark:text-white">
                {t.settings.clearHistoryTitle}
              </h3>
              <p className="text-xs text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] mt-0.5">
                {t.settings.clearHistoryDesc} ({downloadsCount}{' '}
                {downloadsCount === 1
                  ? t.settings.recordSingular
                  : t.settings.recordPlural}
                ).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClearCache}
            className="min-h-[44px] px-4 rounded-xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/60 text-[#111827] dark:text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
          >
            {cacheCleared ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">
                  {t.settings.clearedAction}
                </span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]" />
                <span>{t.settings.clearAction}</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] flex items-center justify-center text-rose-500 dark:text-rose-400 shrink-0">
              <HeartOff className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#111827] dark:text-white">
                {t.settings.clearFavoritesTitle}
              </h3>
              <p className="text-xs text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] mt-0.5">
                {t.settings.clearFavoritesDesc} ({favoritesCount}{' '}
                {favoritesCount === 1
                  ? t.settings.favoriteSingular
                  : t.settings.favoritePlural}
                ).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClearFavorites}
            className="min-h-[44px] px-4 rounded-xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] hover:border-rose-500/50 text-[#111827] dark:text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
          >
            {favsCleared ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">
                  {t.settings.clearedAction}
                </span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                <span>{t.settings.clearAction}</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* 5. App Information */}
      <section className="rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <Info className="w-5 h-5 text-[#6366F1] purple:text-[#C084FC]" />
          <h3 className="text-sm font-bold text-[#111827] dark:text-white">
            {t.settings.aboutTitle}
          </h3>
        </div>

        <div className="space-y-2 text-xs text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] leading-relaxed">
          <p>
            <strong className="text-[#111827] dark:text-white">
              DroidPort Store
            </strong>{' '}
            {t.settings.aboutDesc}
          </p>
          <div className="pt-1 space-y-1 font-mono-nums">
            <p>
              {t.settings.versionLabel} {appVersion}
            </p>
            <p>{t.settings.engineLabel}</p>
            <p>{t.settings.persistenceLabel}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
