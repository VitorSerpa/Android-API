import { exchangeCodeAsync, makeRedirectUri, useAuthRequest } from 'expo-auth-session';

import { secureStorage } from '@/lib/storage';

/**
 * Spotify account connection (RF-56), OAuth 2.0 Authorization Code + PKCE, so
 * no client secret ships in the app. Create an app at developer.spotify.com,
 * add the redirect URI printed in Perfil and set `EXPO_PUBLIC_SPOTIFY_CLIENT_ID`.
 */

export const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';
export const spotifyConfigured = SPOTIFY_CLIENT_ID.length > 0;

const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export const spotifyRedirectUri = makeRedirectUri({ scheme: 'androidapi', path: 'spotify-auth' });

const tokenKey = (userId: string) => `mente.spotify.${userId.replace(/[^A-Za-z0-9._-]/g, '_')}`;

export function useSpotifyAuthRequest() {
  return useAuthRequest(
    {
      clientId: SPOTIFY_CLIENT_ID || 'not-configured',
      scopes: ['user-read-private'],
      usePKCE: true,
      redirectUri: spotifyRedirectUri,
    },
    discovery,
  );
}

/** Exchanges the authorization code, keeps the tokens in secure storage and returns the account name. */
export async function completeSpotifyLogin(userId: string, code: string, codeVerifier: string): Promise<string> {
  const tokens = await exchangeCodeAsync(
    { clientId: SPOTIFY_CLIENT_ID, code, redirectUri: spotifyRedirectUri, extraParams: { code_verifier: codeVerifier } },
    discovery,
  );
  await secureStorage.set(
    tokenKey(userId),
    JSON.stringify({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, issuedAt: tokens.issuedAt, expiresIn: tokens.expiresIn }),
  );
  const response = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
  if (!response.ok) return 'Conta Spotify';
  const me = (await response.json()) as { display_name?: string; id?: string };
  return me.display_name || me.id || 'Conta Spotify';
}

export async function disconnectSpotify(userId: string) {
  await secureStorage.set(tokenKey(userId), null);
}
