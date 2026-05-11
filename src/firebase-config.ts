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
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

/** True when the config has been filled in. */
export const FIREBASE_ENABLED = FIREBASE_CONFIG.apiKey.length > 0;
