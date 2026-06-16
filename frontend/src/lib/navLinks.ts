/**
 * Single source of truth for the primary navigation links.
 *
 * Both the desktop nav (`NavLinks`) and the mobile drawer (`MobileNav`)
 * consume this so the two never drift apart. Add/rename a destination here
 * and it updates everywhere.
 */

export type NavRole = 'guest' | 'tenant' | 'landlord' | 'admin';

export interface NavItem {
  href: string;
  label: string;
  /**
   * When false, the link never gets the active state (used for in-page
   * hash anchors like `/#features` that don't map to a route).
   * Defaults to true.
   */
  match?: boolean;
}

export function getNavItems(role: NavRole): NavItem[] {
  switch (role) {
    case 'admin':
      return [
        { href: '/', label: 'Home' },
        { href: '/admin/verifications', label: 'Verification Queue' },
        { href: '/admin/kyc', label: 'KYC Review' },
      ];

    case 'landlord':
      return [
        { href: '/', label: 'Home' },
        { href: '/landlord/properties', label: 'My Properties' },
        { href: '/landlord/applications', label: 'Applications' },
        { href: '/landlord/properties/new', label: '+ Add Property' },
        { href: '/landlord/kyc', label: 'KYC Status' },
      ];

    case 'tenant':
      return [
        { href: '/', label: 'Home' },
        { href: '/properties', label: 'Find a Place' },
        { href: '/dashboard', label: 'Matchmaking' },
        { href: '/squad', label: 'My Squad' },
      ];

    default: // guest (unauthenticated) — public marketing links
      return [
        { href: '/', label: 'Home' },
        { href: '/#features', label: 'Features', match: false },
        { href: '/properties', label: 'Find a Place' },
        { href: '/#locations', label: 'Locations', match: false },
      ];
  }
}

/**
 * Mirrors the original `isActive` logic: the home link matches only the exact
 * root path, every other route matches by prefix, and `match: false` items
 * (hash anchors) are never active.
 */
export function isNavActive(href: string, pathname: string, match: boolean = true): boolean {
  if (!match) return false;
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}
