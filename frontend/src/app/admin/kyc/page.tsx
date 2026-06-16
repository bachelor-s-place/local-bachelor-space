"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

// Matches the backend KYCWithUser struct
type KYCRecord = {
  id: string;
  user_id: string;
  user_name: string;   // joined from users table
  user_email: string;  // joined from users table
  status: "pending" | "verified" | "rejected"; // backend field is 'status', not 'verification_status'
  submitted_at: string;
  verified_at?: string;
};

export default function AdminKYCPage() {
  const [records, setRecords] = useState<KYCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const fetchRecords = async () => {
    try {
      const res = await apiFetch("/admin/kyc/pending");
      setRecords(res.data || []);
    } catch (err) {
      console.error("Failed to load KYC records", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  const handleReview = async (id: string, action: "verified" | "rejected") => {
    setActionLoading(id + action);
    try {
      // Backend expects: PUT /admin/kyc/{id}/review  body: { status: "verified" | "rejected" }
      await apiFetch(`/admin/kyc/${id}/review`, {
        method: "PUT",
        body: JSON.stringify({ status: action }),
      });
      await fetchRecords();
    } catch (err: any) {
      alert(err.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>KYC Review Panel</h1>
          <p className={styles.subtitle}>Approve or reject landlord identity verification submissions.</p>
        </div>
        <div className={styles.stats}>
          <span className={styles.stat}>
            {records.filter(r => r.status === "pending").length} pending
          </span>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading KYC records...</div>
      ) : records.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🛡️</div>
          <h3>No pending KYC submissions</h3>
          <p>All landlord verifications are up to date.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Landlord</th>
                <th>Email</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Rejection Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(rec => (
                <tr key={rec.id} className={styles.row}>
                  <td className={styles.nameCell}>
                    <div className={styles.avatar}>{rec.user_name?.charAt(0).toUpperCase() || "?"}</div>
                    <span className={styles.userName}>{rec.user_name || "—"}</span>
                  </td>
                  <td className={styles.emailCell}>{rec.user_email || "—"}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[rec.status]}`}>
                      {rec.status}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {rec.submitted_at
                      ? new Date(rec.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                  <td>
                    <input
                      className={styles.notesInput}
                      placeholder="Reason for rejection..."
                      value={notes[rec.id] || ""}
                      onChange={(e) => setNotes(prev => ({ ...prev, [rec.id]: e.target.value }))}
                    />
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {rec.status === "pending" ? (
                        <>
                          <button
                            className={styles.btnApprove}
                            disabled={!!actionLoading}
                            onClick={() => handleReview(rec.id, "verified")}
                          >
                            {actionLoading === rec.id + "verified" ? "..." : "✓ Approve"}
                          </button>
                          <button
                            className={styles.btnReject}
                            disabled={!!actionLoading}
                            onClick={() => handleReview(rec.id, "rejected")}
                          >
                            {actionLoading === rec.id + "rejected" ? "..." : "✗ Reject"}
                          </button>
                        </>
                      ) : (
                        <span className={styles.resolved}>
                          {rec.status === "verified" ? "✅ Approved" : "❌ Rejected"}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
