'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './NavbarAuth.module.css';
import sidebarStyles from './NavbarLandlordMenu.module.css';
import { ShieldCheck, Building, ClipboardList, PlusCircle, Home, LogOut } from 'lucide-react';

interface NavbarLandlordMenuProps {
  /** 
   * "dropdown" — renders a compact "Landlord ▾" button for the top navbar (default).
   * "sidebar"  — renders a full vertical nav list for the landlord layout sidebar.
   */
  mode?: 'dropdown' | 'sidebar';
}

const LANDLORD_LINKS = [
  { href: '/landlord/kyc', icon: ShieldCheck, label: 'KYC Verification' },
  { href: '/landlord/properties', icon: Building, label: 'My Properties' },
  { href: '/landlord/applications', icon: ClipboardList, label: 'Applications' },
  { href: '/landlord/properties/new', icon: PlusCircle, label: 'Add Property' },
  { href: '/', icon: Home, label: 'Back to Home' },
];

export default function NavbarLandlordMenu({ mode = 'dropdown' }: NavbarLandlordMenuProps) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!mounted || loading) return null;

  const isLandlord = user?.role === 'landlord';

  // ── Sidebar mode — full vertical nav for the landlord layout ─────────────────
  if (mode === 'sidebar') {
    return (
      <div className={sidebarStyles.sidebarNav}>
        {isLandlord ? (
          <>
            <nav className={sidebarStyles.navLinks}>
              {LANDLORD_LINKS.map(link => {
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href} className={sidebarStyles.navLink}>
                    <span className={sidebarStyles.navIcon} style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <Icon size={18} />
                    </span>
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className={sidebarStyles.sidebarFooter}>
              <div className={sidebarStyles.userInfo}>
                <div className={sidebarStyles.userAvatar}>
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className={sidebarStyles.userDetails}>
                  <span className={sidebarStyles.userName}>{user.name}</span>
                  <span className={sidebarStyles.userRole}>Landlord</span>
                </div>
              </div>
              <button onClick={logout} className={sidebarStyles.logoutBtn} title="Log out" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogOut size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className={sidebarStyles.accessDenied}>
            <p>This area is for verified landlords only.</p>
            <button onClick={() => router.push('/')} className="btn-secondary">
              Go Home
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Dropdown mode — compact button in the top navbar ─────────────────────────
  return (
    <div ref={wrapperRef} className={styles.avatarWrapper}>
      <button
        className="nav-link"
        onClick={() => setOpen(o => !o)}
        aria-label="Open landlord menu"
        aria-expanded={open}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}
      >
        Landlord ▾
      </button>

      {open && (
        <div className={styles.dropdown} role="menu">
          {isLandlord ? (
            <>
              <div className={styles.dropdownUser}>
                <div className={styles.dropdownName}>Landlord Portal</div>
              </div>
              <div className={styles.dropdownDivider} />
              {LANDLORD_LINKS.map(link => {
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href} className={styles.dropdownItem} onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Icon size={16} style={{ color: 'var(--text-secondary)' }} /> {link.label}
                  </Link>
                );
              })}
            </>
          ) : (
            <>
              <div className={styles.dropdownUser}>
                <div className={styles.dropdownName}>Partner with us</div>
              </div>
              <div className={styles.dropdownDivider} />
              <Link href="/signup" className={styles.dropdownItem} onClick={() => setOpen(false)}>
                Sign up as Landlord
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
