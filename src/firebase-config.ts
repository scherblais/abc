/**
 * Firebase web app configuration.
 *
 * Paste the config object Firebase gives you (Project settings → General →
 * Your apps → SDK setup and configuration → Config) in place of the
 * placeholder values below. The values are not secret — they identify your
 * project to the SDK — but you must restrict access at the Firestore
 * security-rules and Auth-authorized-domains layers.
 *
 * Leaving the apiKey empty disables sign-in/sync and the app falls back to
 * pure local-only behaviour (legacy localStorage).
 */
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDiP7sPz6ohktbjUoVC1R6zLwehY7Tm9Iw',
  authDomain: 'lum-abc.firebaseapp.com',
  projectId: 'lum-abc',
  storageBucket: 'lum-abc.firebasestorage.app',
  messagingSenderId: '342261144181',
  appId: '1:342261144181:web:0ad03a81b6f7c929fff63c',
};

/** True when the config has been filled in. */
export const FIREBASE_ENABLED = FIREBASE_CONFIG.apiKey.length > 0;
