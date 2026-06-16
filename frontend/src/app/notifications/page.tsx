"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useAuth } from "@/context/AuthContext";
import { isAuthenticated } from "@/lib/auth";
import styles from "./page.module.css";

const TYPE_ICONS: Record<string, string> = {
  kyc_approved: "🎉", kyc_rejected: "⚠️",
  property_verified: "✅", property_rejected: "❌",
  squad_invite: "👥", squad_invite_accepted: "🤝",
  squad_invite_rejected: "👋", squad_disbanded: "💔",
  property_proposal: "🏠", proposal_accepted: "✅",
  proposal_rejected: "❌", token_payment_success: "🔒",
  move_in_confirmed: "🏠",
};

function groupByDate(notifications: Notification[]) {
  const groups: Record<string, Notification[]> = {};
  notifications.forEach(n => {
    const date = new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    if (!groups[date]) groups[date] = [];
    groups[date].push(n);
  });
  return groups;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { notifications, loading, markRead, markAllRead, unreadCount } = useNotifications();

  useEffect(() => {
    if (!isAuthenticated()) router.replace("/login");
  }, [router]);

  if (!user) return null;

  // Guard: ensure notifications is always an array before grouping
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const groups = groupByDate(safeNotifications);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Notifications</h1>
          <p className={styles.subtitle}>Stay up to date with your activity.</p>
        </div>
        {unreadCount > 0 && (
          <button className={styles.markAllBtn} onClick={markAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className={styles.loading}>Loading notifications...</div>
      ) : safeNotifications.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔔</div>
          <h3>All caught up!</h3>
          <p>You have no notifications yet.</p>
        </div>
      ) : (
        <div className={styles.groups}>
          {Object.entries(groups).map(([date, items]) => (
            <div key={date} className={styles.group}>
              <div className={styles.dateLabel}>{date}</div>
              <div className={styles.list}>
                {items.map(n => (
                  <div
                    key={n.id}
                    className={`${styles.item} ${!n.is_read ? styles.unread : ""}`}
                    onClick={() => !n.is_read && markRead(n.id)}
                  >
                    <div className={styles.iconWrapper}>
                      <span className={styles.icon}>{TYPE_ICONS[n.type] || "🔔"}</span>
                    </div>
                    <div className={styles.content}>
                      <p className={styles.message}>{n.message || n.title}</p>
                      <span className={styles.time}>
                        {new Date(n.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {!n.is_read && <div className={styles.dot} />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
