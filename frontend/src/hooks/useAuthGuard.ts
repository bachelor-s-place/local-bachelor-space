'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

/**
 * useAuthGuard — redirects to /login if the user is not authenticated.
 * Use this at the top of any protected page component.
 *
 * @example
 * export default function DashboardPage() {
 *   useAuthGuard();
 *   ...
 * }
 */
export function useAuthGuard() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    }
  }, [router]);
}
