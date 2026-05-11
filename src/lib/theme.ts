/**
 * Theme manager.
 *
 * Three modes: 'system' (default), 'light', 'dark'. The chosen mode is
 * persisted in localStorage. When the mode is 'system', we follow the OS
 * preference and listen for changes. The applied class on <html> is either
 * 'dark' or no class.
 */

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'lensbook.theme.v1';

function isThemeMode(v: unknown): v is ThemeMode {
  return v === 'system' || v === 'light' || v === 'dark';
}

export function readStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isThemeMode(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

export function writeStoredTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return prefersDark() ? 'dark' : 'light';
  return mode;
}

export function applyTheme(mode: ThemeMode) {
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

/**
 * Listen for OS preference changes — only effective while the user's stored
 * mode is 'system'. Returns a cleanup function.
 */
export function installSystemListener(getMode: () => ThemeMode): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    if (getMode() === 'system') applyTheme('system');
  };
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
