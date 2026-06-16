/**
 * Auth utility helpers.
 * These are plain functions — no React dependency.
 * Components should use useAuth() from AuthContext instead.
 */

const JWT_KEY = 'jwt';

export function getJWT(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(JWT_KEY);
}

export function setJWT(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(JWT_KEY, token);
  }
}

export function clearJWT(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(JWT_KEY);
  }
}

export function isAuthenticated(): boolean {
  return !!getJWT();
}

/**
 * Extract initials from a full name (up to 2 characters).
 * e.g. "Keval Parmar" → "KP"
 *      "Rahul"       → "R"
 *      "" / null      → "?"
 */
export function getInitials(name?: string | null): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  return trimmed
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
