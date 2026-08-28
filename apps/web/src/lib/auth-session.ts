const SESSION_COOKIE = 'clinicos_session';

type SessionHint = { permissions?: string[]; isPlatformAdmin?: boolean };

function readCookie(name: string): string | null {
  if (typeof window === 'undefined') return null;
  const entry = document.cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  if (!entry) return null;
  try {
    return decodeURIComponent(entry.slice(name.length + 1));
  } catch {
    return null;
  }
}

function sessionHint(): SessionHint | null {
  const encoded = readCookie(SESSION_COOKIE);
  if (!encoded) return null;
  try {
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))) as SessionHint;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  // Remove browser-readable tokens saved by older app versions.
  window.localStorage.removeItem('clinicos.accessToken');
  window.localStorage.removeItem('token');
  return readCookie(SESSION_COOKIE) ? 'cookie-session' : null;
}

export function setAccessToken(): void {
  if (typeof window === 'undefined') return;
  // The real session is an HttpOnly cookie created by the API.
  window.localStorage.removeItem('clinicos.accessToken');
  window.localStorage.removeItem('token');
}

export function clearAccessToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('clinicos.accessToken');
  window.localStorage.removeItem('token');
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function signOut(): void {
  if (typeof window === 'undefined') return;
  void fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'same-origin' }).finally(() => {
    clearAccessToken();
    window.location.replace('/login?loggedOut=1');
  });
}

export async function authenticatedFetch(path: string, init: Parameters<typeof fetch>[1] = {}): Promise<Response> {
  return fetch(path, { ...init, credentials: 'same-origin' });
}

export function hasSessionPermission(permission: string): boolean {
  return sessionHint()?.permissions?.includes(permission) === true;
}

export function isPlatformAdminSession(): boolean {
  return sessionHint()?.isPlatformAdmin === true;
}
