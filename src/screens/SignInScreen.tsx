import { useEffect, useState } from 'react';
import { signInWithGoogle } from '../lib/firebase';

export function SignInScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the previous attempt was a redirect that failed, getRedirectResult
  // logged it to sessionStorage. Surface it so the user sees what broke.
  useEffect(() => {
    try {
      const stashed = sessionStorage.getItem('lensbook.auth.lastError');
      if (stashed) {
        setError(stashed);
        sessionStorage.removeItem('lensbook.auth.lastError');
      }
    } catch {
      // ignore
    }
  }, []);

  const onSignIn = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? `${e.name}: ${e.message}` : 'Sign-in failed');
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-full flex-col items-stretch justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-[360px]">
        <h1 className="text-center text-[24px] font-semibold tracking-tightish text-neutral-900 dark:text-neutral-100">
          Lensbook
        </h1>
        <p className="mt-2 text-center text-[13.5px] leading-relaxed text-neutral-500 dark:text-neutral-400">
          Sign in to sync your bookings, invoices, and clients across devices.
        </p>

        <button
          type="button"
          onClick={onSignIn}
          disabled={busy}
          className="tap mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-neutral-900 dark:bg-neutral-100 px-5 py-3.5 text-[15px] font-medium text-white dark:text-neutral-900 hover:bg-black dark:hover:bg-neutral-200 disabled:opacity-60"
        >
          <GoogleIcon />
          {busy ? 'Signing in…' : 'Continue with Google'}
        </button>

        {error && (
          <p className="mt-4 text-center text-[12.5px] leading-snug text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-[11.5px] leading-relaxed text-neutral-500 dark:text-neutral-400">
          Your data lives in your Firestore project. Local data already on this
          device migrates the first time you sign in.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#EA4335"
        d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z"
      />
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#FBBC05"
        d="M3.88 10.78A5.54 5.54 0 0 1 3.58 9c0-.62.11-1.22.29-1.78L.96 4.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.57-5.12-3.74L.97 13.04C2.45 15.98 5.48 18 9 18z"
      />
    </svg>
  );
}
