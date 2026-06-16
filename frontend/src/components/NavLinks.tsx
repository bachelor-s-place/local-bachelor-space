'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import { getNavItems, isNavActive, type NavRole } from '@/lib/navLinks';

/**
 * NavLinks — the desktop navigation links, rendered inline in the navbar.
 * Hidden on mobile (≤768px) via globals.css; the mobile drawer (`MobileNav`)
 * takes over there. Both pull from the same source in `lib/navLinks`.
 */
export default function NavLinks() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Don't render nav links on the admin login page — keep it clean
  if (pathname === '/admin/login') return null;

  // Still hydrating — render nothing to avoid layout shift
  if (loading) return null;

  const role: NavRole = user ? user.role : 'guest';

  return (
    <>
      {getNavItems(role).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-link ${isNavActive(item.href, pathname, item.match) ? 'active' : ''}`}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}
