'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './NavbarTenantMenu.module.css';
import { Sparkles, Users, Compass, Home, LogOut } from 'lucide-react';

const TENANT_LINKS = [
  { href: '/dashboard', icon: Sparkles, label: 'Matchmaking' },
  { href: '/squad', icon: Users, label: 'My Squad' },
  { href: '/properties', icon: Compass, label: 'Properties' },
  { href: '/', icon: Home, label: 'Back to Home' },
];

export default function NavbarTenantMenu() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || loading) return null;

  return (
    <div className={styles.sidebarNav}>
      <div className={styles.sidebarHeader}>
        <span className={styles.headerIcon} style={{ display: 'inline-flex', alignItems: 'center' }}>
          <Compass size={20} style={{ color: 'var(--accent-blue)' }} />
        </span>
        <span className={styles.headerTitle}>Tenant Portal</span>
      </div>
      <nav className={styles.navLinks}>
        {TENANT_LINKS.map(link => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className={styles.navLink}>
              <span className={styles.navIcon} style={{ display: 'inline-flex', alignItems: 'center' }}>
                <Icon size={18} />
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {user?.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className={styles.userDetails}>
            <span className={styles.userName}>{user?.name || '—'}</span>
            <span className={styles.userRole}>Tenant</span>
          </div>
        </div>
        <button onClick={logout} className={styles.logoutBtn} title="Log out" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}
