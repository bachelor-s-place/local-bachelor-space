"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

type Verification = {
  id: string;
  property_id: string;
  property_title: string;
  type: "ai_photo" | "manual" | "virtual_tour" | "physical";
  status: "pending" | "approved" | "rejected";
  created_at: string;
  notes?: string;
};

export default function VerificationQueuePage() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const fetchQueue = async () => {
    try {
      const res = await apiFetch("/admin/verifications");
      setVerifications(res.data || []);
    } catch (err) {
      console.error("Failed to load verification queue", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueue(); }, []);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setActionLoading(id + action);
    try {
      // Backend: PUT /admin/verifications/{id} with body { status, notes }
      await apiFetch(`/admin/verifications/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: action === "approve" ? "approved" : "rejected",
          notes: notes[id] ? notes[id] : undefined,
        }),
      });

      await fetchQueue();
    } catch (err: any) {
      alert(err.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const triggerAICheck = async (propertyId: string) => {
    setActionLoading("ai-" + propertyId);
    try {
      await apiFetch(`/admin/verifications/${propertyId}/ai`, { method: "POST" });
      await fetchQueue();
    } catch (err: any) {
      alert(err.message || "AI check failed");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Verification Queue</h1>
          <p className={styles.subtitle}>Review and approve property verification submissions.</p>
        </div>
        <div className={styles.stats}>
          <span className={styles.stat}>
            {verifications.filter(v => v.status === "pending").length} pending
          </span>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading queue...</div>
      ) : verifications.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✅</div>
          <h3>Queue is clear</h3>
          <p>No pending verifications at the moment.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Property</th>
                <th>Type</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {verifications.map(v => (
                <tr key={v.id} className={styles.row}>
                  <td className={styles.propertyCell}>
                    <span className={styles.propertyTitle}>{v.property_title || v.property_id.slice(0, 8) + "..."}</span>
                  </td>
                  <td>
                    <span className={`${styles.typeBadge} ${styles[v.type]}`}>
                      {v.type.replace("_", " ")}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[v.status]}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(v.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td>
                    <input
                      className={styles.notesInput}
                      placeholder="Rejection reason..."
                      value={notes[v.id] || ""}
                      onChange={(e) => setNotes(prev => ({ ...prev, [v.id]: e.target.value }))}
                    />
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {v.type === "ai_photo" && v.status === "pending" && (
                        <button
                          className={styles.btnAI}
                          disabled={!!actionLoading}
                          onClick={() => triggerAICheck(v.property_id)}
                        >
                          {actionLoading === "ai-" + v.property_id ? "..." : "🤖 AI"}
                        </button>
                      )}
                      {v.status === "pending" && (
                        <>
                          <button
                            className={styles.btnApprove}
                            disabled={!!actionLoading}
                            onClick={() => handleAction(v.id, "approve")}
                          >
                            {actionLoading === v.id + "approve" ? "..." : "✓"}
                          </button>
                          <button
                            className={styles.btnReject}
                            disabled={!!actionLoading}
                            onClick={() => handleAction(v.id, "reject")}
                          >
                            {actionLoading === v.id + "reject" ? "..." : "✗"}
                          </button>
                        </>
                      )}
                      {v.status !== "pending" && (
                        <span className={styles.resolved}>Resolved</span>
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
