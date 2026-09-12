export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('token');
}

export function clearAuthAndRedirect(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('token');
  window.location.replace('/login');
}

/**
 * Keep the saved session for transient API/network errors. Only an explicit
 * 401 means that the token is invalid or expired and should end the session.
 */
export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  if (!token) {
    clearAuthAndRedirect();
    throw new Error('Authentication required');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export function handleUnauthorized(response: Response): void {
  if (response.status === 401) clearAuthAndRedirect();
}
