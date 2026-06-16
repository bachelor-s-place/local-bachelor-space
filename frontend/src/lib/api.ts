const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

// Warn loudly if the API URL wasn't configured — otherwise a misconfigured deploy
// silently points every request at localhost (plain HTTP) and fails confusingly.
if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn(
    '[api] NEXT_PUBLIC_API_URL is not set — falling back to http://localhost:8080/api/v1. ' +
    'Set NEXT_PUBLIC_API_URL for any non-local environment.'
  );
}

/**
 * Error thrown by apiFetch for any non-2xx response. Carries the HTTP `status`
 * so callers can branch on it (e.g. 401 vs 404) instead of matching message text.
 */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Custom fetch wrapper to handle Base URL and Authorization token injection.
 * On 401 (expired/invalid token), clears JWT and redirects to /login — except for
 * the auth and bootstrap endpoints below, where the caller handles 401 itself.
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  // Get the token from localStorage if we are in the browser
  const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Endpoints where a 401 must NOT trigger a hard redirect:
  //  - /auth/login, /auth/google: a wrong password is a normal 401, not a dead session.
  //  - /users/me: the auth bootstrap (AuthContext). Letting it redirect here causes a
  //    full-page reload loop and wipes SPA state; AuthContext clears the session instead.
  const noRedirectOn401 =
    endpoint.startsWith('/auth/login') ||
    endpoint.startsWith('/auth/google') ||
    endpoint.startsWith('/users/me');

  if (response.status === 401 && !noRedirectOn401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jwt');
      window.location.href = '/login';
    }
    throw new ApiError(401, 'Session expired. Please log in again.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.error?.message || data?.message || 'An error occurred during the request'
    );
  }

  return data;
}
