'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getInitials, isAuthenticated } from '@/lib/auth';
import styles from './NavbarAuth.module.css';

export default function NavbarAuth() {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Loading state ───────────────────────────────────────────────────
  // Prevent hydration mismatch: never access localStorage on the server or
  // during the first client render.
  if (!mounted || loading) {
    return (mounted && isAuthenticated()) ? (
      <div
        className={styles.avatarBtn}
        style={{ opacity: 0.45, cursor: 'default', pointerEvents: 'none' }}
        aria-hidden="true"
      >
        {'…'}
      </div>
    ) : null;
  }

  // ── Logged In ──────────────────────────────────────────────────────
  if (user) {
    return (
      <div ref={wrapperRef} className={styles.avatarWrapper}>
        <button
          className={styles.avatarBtn}
          onClick={() => setOpen((o) => !o)}
          aria-label="Open account menu"
          aria-expanded={open}
        >
          {getInitials(user.name)}
        </button>

        {open && (
          <div className={styles.dropdown} role="menu">
            {/* User info */}
            <div className={styles.dropdownUser}>
              <div className={styles.dropdownName}>{user.name}</div>
              <div className={styles.dropdownRole}>{user.role}</div>
            </div>

            <div className={styles.dropdownDivider} />

            <Link
              href="/dashboard"
              className={styles.dropdownItem}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              ✦ Dashboard
            </Link>

            <button
              className={`${styles.dropdownItem} ${styles.danger}`}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logout();
              }}
            >
              ↩ Log Out
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Logged Out ─────────────────────────────────────────────────────
  return (
    <>
      <Link href="/login" className="btn-secondary">Log In</Link>
      <Link href="/signup" className="btn-primary">Sign Up</Link>
    </>
  );
}
