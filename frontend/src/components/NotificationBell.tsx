'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import styles from './NotificationBell.module.css';
import { Bell } from 'lucide-react';

const TYPE_ICONS: Record<string, string> = {
  kyc_approved: '🎉',
  kyc_rejected: '⚠️',
  property_verified: '✅',
  property_rejected: '❌',
  squad_invite: '👥',
  squad_invite_accepted: '🤝',
  squad_invite_rejected: '👋',
  squad_disbanded: '💔',
  property_proposal: '🏠',
  proposal_accepted: '✅',
  proposal_rejected: '❌',
  token_payment_success: '🔒',
  move_in_confirmed: '🏠',
};

export default function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't render for unauthenticated users
  if (!user) return null;

  const recent = notifications.slice(0, 6);

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button
        className={styles.bell}
        onClick={() => setOpen(o => !o)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Bell size={18} style={{ color: 'var(--text-secondary)' }} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownTitle}>Notifications</span>
            {unreadCount > 0 && (
              <button className={styles.markAllBtn} onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className={styles.list}>
            {recent.length === 0 ? (
              <div className={styles.empty}>No notifications yet.</div>
            ) : (
              recent.map(n => (
                <div
                  key={n.id}
                  className={`${styles.item} ${!n.is_read ? styles.unread : ''}`}
                  onClick={() => !n.is_read && markRead(n.id)}
                >
                  <span className={styles.itemIcon} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    {TYPE_ICONS[n.type] || <Bell size={14} />}
                  </span>
                  <div className={styles.itemContent}>
                    <p className={styles.itemMessage}>{n.message || n.title}</p>
                    <span className={styles.itemTime}>
                      {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  {!n.is_read && <div className={styles.unreadDot} />}
                </div>
              ))
            )}
          </div>

          <Link href="/notifications" className={styles.viewAll} onClick={() => setOpen(false)}>
            View all notifications →
          </Link>
        </div>
      )}
    </div>
  );
}
