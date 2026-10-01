import { Redirect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

/**
 * OAuth redirect target for the Spotify connection. On Android the auth
 * session intercepts the redirect itself; this route only closes the web
 * popup and makes a stray deep link land somewhere sensible.
 */
WebBrowser.maybeCompleteAuthSession();

export default function SpotifyAuthRedirect() {
  return <Redirect href="/" />;
}
