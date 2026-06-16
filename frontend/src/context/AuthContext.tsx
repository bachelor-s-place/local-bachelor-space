'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { clearJWT, isAuthenticated } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'tenant' | 'landlord' | 'admin';
  gender?: 'male' | 'female' | 'prefer_not_to_say';
  lifestyle_tags?: string[];
  bio?: string;
  budget_min?: number;
  budget_max?: number;
  preferred_localities?: string[];
  is_active?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
  refreshUser: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    if (!isAuthenticated()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await apiFetch('/users/me');
      setUser(response.data ?? null);
    } catch (err: any) {
      // Only clear the session on a real auth failure (expired/invalid token).
      // For network errors, 500s, etc. — keep the user logged in to prevent
      // the Login/Signup flash while the backend is momentarily unavailable.
      if (err.status === 401) {
        clearJWT();
        setUser(null);
      }
      // Otherwise: leave user state as-is (null on first load, or stale data — acceptable)
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = useCallback(() => {
    clearJWT();
    setUser(null);
    router.push('/');
  }, [router]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  return useContext(AuthContext);
}
