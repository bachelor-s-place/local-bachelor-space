'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, string>;
};

const POLL_INTERVAL_MS = 90_000; // 90 seconds — reduced from 30s to ease server load

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated()) return;
    // Skip fetch if tab is not visible — saves server round-trips
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    try {
      const res = await apiFetch('/notifications');
      // Backend returns: { success: true, data: { notifications: [...], total: N } }
      const data: Notification[] = res.data?.notifications || [];
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch {
      // Silently fail — notifications are non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  const markRead = useCallback(async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  }, []);

  return { notifications, unreadCount, loading, markRead, markAllRead, refresh: fetchNotifications };
}
