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

/** Page-background colours, also used to drive the mobile browser chrome. */
const BG_LIGHT = '#fafaf9';
const BG_DARK = '#0a0a0a';

export function applyTheme(mode: ThemeMode) {
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;

  // Drive the mobile browser's chrome / status bar with the resolved theme.
  // Keying off the user's app choice (not OS prefers-color-scheme) means the
  // bar follows the toggle in Settings, not the OS.
  const color = resolved === 'dark' ? BG_DARK : BG_LIGHT;
  const metas = document.head.querySelectorAll('meta[name="theme-color"]');
  if (metas.length === 0) {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', color);
    document.head.appendChild(meta);
  } else {
    metas.forEach((m, i) => {
      // Strip any prefers-color-scheme media queries — they'd override our
      // app-driven choice when the OS preference doesn't match.
      m.removeAttribute('media');
      if (i === 0) m.setAttribute('content', color);
      else m.parentNode?.removeChild(m);
    });
  }
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
