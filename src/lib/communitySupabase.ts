import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { createClient } from '@supabase/supabase-js';

const COMMUNITY_SUPABASE_URL = 'https://gtkitrxssdkncjpwzvjl.supabase.co';
const COMMUNITY_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0a2l0cnhzc2RrbmNqcHd6dmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1OTY0MDQsImV4cCI6MjExMDE3MjQwNH0.j-w8V7V7br8jcigfjKfPDcRAiGc2i5VA-9jiHPFcFko';

export const PENDING_REPORT_GAME_KEY = 'droidport_pending_report_game_v1';
export const NATIVE_OAUTH_REDIRECT_URL = 'droidport://login-callback';

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

export const communitySupabase = createClient(
  COMMUNITY_SUPABASE_URL,
  COMMUNITY_SUPABASE_ANON_KEY,
  {
    auth: {
      storageKey: 'droidport_community_supabase_auth_v1',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: !isNativeApp(),
    },
  }
);

export async function signInCommunityWithGoogle(): Promise<void> {
  if (isNativeApp()) {
    const { data, error } = await communitySupabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: NATIVE_OAUTH_REDIRECT_URL,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data?.url) {
      try {
        await Browser.open({ url: data.url });
      } catch {
        window.open(data.url, '_system');
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
  if (!rawUrl || !rawUrl.startsWith(NATIVE_OAUTH_REDIRECT_URL)) {
    return false;
  }

  const hashIndex = rawUrl.indexOf('#');
  const queryIndex = rawUrl.indexOf('?');

  const hashStr = hashIndex !== -1 ? rawUrl.slice(hashIndex + 1) : '';
  const queryStr =
    queryIndex !== -1
      ? rawUrl.slice(
          queryIndex + 1,
          hashIndex !== -1 && hashIndex > queryIndex ? hashIndex : undefined
        )
      : '';

  const hashParams = new URLSearchParams(hashStr);
  const queryParams = new URLSearchParams(queryStr);

  const accessToken =
    hashParams.get('access_token') || queryParams.get('access_token');
  const refreshToken =
    hashParams.get('refresh_token') || queryParams.get('refresh_token');
  const code = queryParams.get('code') || hashParams.get('code');

  if (accessToken && refreshToken) {
    const { error } = await communitySupabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      throw error;
    }
    return true;
  }

  if (code) {
    const { error } = await communitySupabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw error;
    }
    return true;
  }

  return false;
}
