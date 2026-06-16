'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/lib/auth';
import { getNavItems, isNavActive, type NavRole } from '@/lib/navLinks';
import ThemeToggle from './ThemeToggle';
import styles from './MobileNav.module.css';

/**
 * MobileNav — the mobile (≤768px) navigation.
 *
 * A compact frosted "command pill" floats at bottom-center showing the
 * current page. Tapping it springs a glass panel open upward (grid-row
 * reveal + spring easing) with the role-based links and account controls.
 * Inspired by the iOS 26 dynamic-island expand — it morphs in place rather
 * than sliding a panel in from an edge.
 *
 * Everything is portalled to <body> so the navbar's backdrop-filter (which
 * establishes a containing block) can't trap the fixed-position dock, and so
 * the pill anchors to the real viewport bottom. Visibility is CSS-gated to
 * mobile, so the desktop NavLinks remain the source of nav on wide screens.
 */
export default function MobileNav() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close whenever the route changes (e.g. after tapping a link)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // While open: lock body scroll and allow Escape to close
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Parity with NavLinks — no menu on the admin login page
  if (pathname === '/admin/login') return null;

  // Portalled UI only renders client-side (matches the avatar's hydration guard)
  if (!mounted) return null;

  const role: NavRole = user ? user.role : 'guest';
  const items = getNavItems(role);
  const current = items.find((it) => isNavActive(it.href, pathname, it.match));
  const currentLabel = current?.label ?? 'Menu';

  return createPortal(
    <div className={`${styles.layer} ${open ? styles.layerOpen : ''}`}>
      <div className={styles.backdrop} onClick={() => setOpen(false)} aria-hidden="true" />

      <div className={styles.dock}>
        {/* Expanding panel — collapsed to 0 height until open */}
        <div className={styles.panelWrap}>
          <div
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            aria-hidden={!open}
          >
            <div className={styles.panelInner}>
              <nav className={styles.links}>
                {!loading &&
                  items.map((item, i) => {
                    const active = isNavActive(item.href, pathname, item.match);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.link} ${active ? styles.linkActive : ''}`}
                        style={{ animationDelay: `${0.04 * i + 0.05}s` }}
                        onClick={() => setOpen(false)}
                      >
                        <span>{item.label}</span>
                        {active && (
                          <span className={styles.activeMark} aria-hidden="true">
                            ✦
                          </span>
                        )}
                      </Link>
                    );
                  })}
              </nav>

              <div className={styles.divider} />

              <div className={styles.account}>
                {user ? (
                  <div className={styles.userRow}>
                    <span className={styles.avatar}>{getInitials(user.name)}</span>
                    <span className={styles.userMeta}>
                      <span className={styles.userName}>{user.name}</span>
                      <span className={styles.userRole}>{user.role}</span>
                    </span>
                    <button
                      type="button"
                      className={styles.logoutBtn}
                      onClick={() => {
                        setOpen(false);
                        logout();
                      }}
                      aria-label="Log out"
                      title="Log out"
                    >
                      ↩
                    </button>
                  </div>
                ) : (
                  <div className={styles.authButtons}>
                    <Link href="/login" className="btn-secondary" onClick={() => setOpen(false)}>
                      Log In
                    </Link>
                    <Link href="/signup" className="btn-primary" onClick={() => setOpen(false)}>
                      Sign Up
                    </Link>
                  </div>
                )}

                <div className={styles.themeRow}>
                  <span className={styles.themeLabel}>Appearance</span>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Persistent command pill — trigger + handle */}
        <button
          type="button"
          className={styles.pill}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        >
          <span className={styles.pillDot} aria-hidden="true" />
          <span className={styles.pillLabel}>{open ? 'Navigate' : currentLabel}</span>
          <span className={styles.pillChevron} aria-hidden="true">
            ⌃
          </span>
        </button>
      </div>
    </div>,
    document.body
  );
}
