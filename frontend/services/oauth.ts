import { makeRedirectUri } from 'expo-auth-session';
import type { Provider } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export function getOAuthRedirectUrl() {
  return makeRedirectUri({
    scheme: process.env.EXPO_PUBLIC_APP_SCHEME || 'snapsplit',
    path: process.env.EXPO_PUBLIC_AUTH_REDIRECT_PATH || 'auth/callback',
  });
}

export function extractSessionFromUrl(url: string) {
  const fragment = url.split('#')[1] || url.split('?')[1] || '';
  const params = new URLSearchParams(fragment);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const errorDescription = params.get('error_description') || params.get('error');

  return {
    accessToken,
    refreshToken,
    errorDescription,
  };
}

export async function signInWithOAuthProvider(provider: Provider) {
  const redirectUrl = getOAuthRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error('Missing OAuth redirect URL');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

  if (result.type !== 'success') {
    throw new Error('OAuth sign-in was cancelled before completion');
  }

  const { accessToken, refreshToken, errorDescription } = extractSessionFromUrl(result.url);

  if (errorDescription) {
    throw new Error(errorDescription);
  }

  if (!accessToken || !refreshToken) {
    throw new Error('Missing session tokens in OAuth callback');
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError) {
    throw sessionError;
  }
}