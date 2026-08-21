const ACCESS_TOKEN_KEY = 'clinicos.accessToken';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(accessToken: string): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  // Remove the legacy key so a stale token cannot be used by an older page.
  window.localStorage.removeItem('token');
}

export function clearAccessToken(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem('token');
}

export async function authenticatedFetch(path: string, init: Parameters<typeof fetch>[1] = {}): Promise<Response> {
  const accessToken = getAccessToken();
  const headers = new Headers(init.headers);

  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  return fetch(path, { ...init, headers });
}

export function hasSessionPermission(permission: string): boolean {
  const accessToken = getAccessToken();
  if (!accessToken) return false;

  try {
    const payload = accessToken.split('.')[1];
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(window.atob(normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=')));
    return Array.isArray(decoded.permissions) && decoded.permissions.includes(permission);
  } catch {
    return false;
  }
}
