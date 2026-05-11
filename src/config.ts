/**
 * Hard-coded app config.
 *
 * The Google Maps key below ends up in the built JavaScript bundle, so it's
 * effectively public. The protection is the referrer restriction set in the
 * Google Cloud Console (Credentials → API key → Application restrictions →
 * HTTP referrers, allow `https://scherblais.github.io/*`).
 *
 * Replace the empty string with your key, commit, and the next deploy picks
 * it up. Leave it empty to fall back to OpenStreetMap geocoding + straight-
 * line distance.
 */
export const GOOGLE_API_KEY = 'AIzaSyBHVKXumR6FYTx8rCwFO1N5IAR0TsWw5F0';
