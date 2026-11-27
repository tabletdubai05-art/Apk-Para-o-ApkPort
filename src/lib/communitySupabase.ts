import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import { sanitizeHttpUrl } from '../utils/urlSecurity';

const COMMUNITY_SUPABASE_URL = 'https://gtkitrxssdkncjpwzvjl.supabase.co';
const COMMUNITY_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0a2l0cnhzc2RrbmNqcHd6dmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1OTY0MDQsImV4cCI6MjExMDE3MjQwNH0.j-w8V7V7br8jcigfjKfPDcRAiGc2i5VA-9jiHPFcFko';

export const PENDING_REPORT_GAME_KEY = 'droidport_pending_report_game_v1';
export const NATIVE_OAUTH_REDIRECT_URL = 'droidport://login-callback';

const processedAuthCodes = new Set<string>();

function getConfiguredAppLinkRedirect(): string | null {
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, unknown> })?.env;
    const raw = metaEnv?.VITE_OAUTH_APP_LINK_URL;
    return sanitizeHttpUrl(raw, { requireHttps: true });
  } catch {
    return null;
  }
}

export function getNativeOAuthRedirectUrl(): string {
  return getConfiguredAppLinkRedirect() || NATIVE_OAUTH_REDIRECT_URL;
}

export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (Capacitor.isNativePlatform()) {
      return true;
    }
  } catch {
    // Ignore if Capacitor native check fails
  }
  const protocol = window.location.protocol;
  return protocol === 'capacitor:' || protocol === 'file:';
}

function createSafeSessionStorage(): SupportedStorage | undefined {
  if (typeof window === 'undefined') return undefined;
  return {
    getItem: (key: string) => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Ignore storage quota errors
      }
    },
    removeItem: (key: string) => {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore storage errors
      }
    },
  };
}

export const communitySupabase = createClient(
  COMMUNITY_SUPABASE_URL,
  COMMUNITY_SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: 'pkce',
      storageKey: 'droidport_community_supabase_auth_v1',
      storage: createSafeSessionStorage(),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: !isNativeApp(),
    },
  }
);

export type ParsedOAuthCallback =
  | { valid: false }
  | { valid: true; error: string }
  | { valid: true; code: string };

export function parsePkceOAuthCallback(rawUrl: string): ParsedOAuthCallback {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { valid: false };
  }

  const appLinkRedirect = getConfiguredAppLinkRedirect();
  const isCustomSchemeMatch =
    parsed.protocol === 'droidport:' && parsed.hostname === 'login-callback';
  let isAppLinkMatch = false;
  if (appLinkRedirect) {
    try {
      const expected = new URL(appLinkRedirect);
      isAppLinkMatch =
        parsed.origin === expected.origin &&
        parsed.pathname === expected.pathname;
    } catch {
      isAppLinkMatch = false;
    }
  }

  if (!isCustomSchemeMatch && !isAppLinkMatch) {
    return { valid: false };
  }

  const errorCode =
    parsed.searchParams.get('error_description') ||
    parsed.searchParams.get('error');
  if (errorCode) {
    return { valid: true, error: errorCode.trim() };
  }

  const code = parsed.searchParams.get('code')?.trim();
  if (!code) {
    return { valid: false };
  }

  return { valid: true, code };
}

export async function signInCommunityWithGoogle(): Promise<void> {
  if (isNativeApp()) {
    const redirectTo = getNativeOAuthRedirectUrl();
    const { data, error } = await communitySupabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    const safeOAuthUrl = sanitizeHttpUrl(data?.url, { requireHttps: true });
    if (safeOAuthUrl) {
      try {
        await Browser.open({ url: safeOAuthUrl });
      } catch {
        window.open(safeOAuthUrl, '_blank', 'noopener,noreferrer');
      }
    }
    return;
  }

  const { error } = await communitySupabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function handleOAuthCallbackUrl(rawUrl: string): Promise<boolean> {
  const parsed = parsePkceOAuthCallback(rawUrl);
  if (!parsed.valid) {
    return false;
  }

  if ('error' in parsed) {
    throw new Error(parsed.error);
  }

  if (processedAuthCodes.has(parsed.code)) {
    return false;
  }
  processedAuthCodes.add(parsed.code);

  const { error } = await communitySupabase.auth.exchangeCodeForSession(
    parsed.code
  );
  if (error) {
    processedAuthCodes.delete(parsed.code);
    throw error;
  }

  return true;
}
