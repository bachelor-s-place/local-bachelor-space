"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

type KYCStatus = {
  status: "pending" | "verified" | "rejected" | "none";
  notes?: string;
  submitted_at?: string;
};

export default function KYCPage() {
  const [kyc, setKyc] = useState<KYCStatus>({ status: "none" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [aadhaar, setAadhaar] = useState("");
  const [pan, setPan] = useState("");

  useEffect(() => {
    fetchKYCStatus();
  }, []);

  const fetchKYCStatus = async () => {
    try {
      const data = await apiFetch("/kyc/me");
      setKyc(data.data ?? { status: "none" });
    } catch (err: any) {
      // 404 means no KYC submitted yet — that's fine
      const errMsg = err.message?.toLowerCase() || "";
      if (!errMsg.includes("404") && !errMsg.includes("not found")) {
        console.error("Failed to fetch KYC", err);
      }
      setKyc({ status: "none" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await apiFetch("/kyc", {
        method: "POST",
        body: JSON.stringify({ aadhaar, pan }),
      });
      await fetchKYCStatus();
    } catch (err: any) {
      setError(err.message || "Failed to submit KYC");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className={styles.container}><div className={styles.loading}>Loading...</div></div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>KYC Verification</h1>
        <p className={styles.subtitle}>
          Secure your identity to start listing properties. Your data is encrypted and kept private.
        </p>
      </div>

      <div className={styles.card}>
        {kyc.status === "verified" && (
          <div className={`${styles.statusBanner} ${styles.success}`}>
            <span className={styles.icon}>✅</span>
            <div>
              <h3>KYC Verified</h3>
              <p>Your identity has been verified. You can now list properties.</p>
            </div>
          </div>
        )}

        {kyc.status === "pending" && (
          <div className={`${styles.statusBanner} ${styles.warning}`}>
            <span className={styles.icon}>⏳</span>
            <div>
              <h3>Verification Pending</h3>
              <p>Your documents are currently under review by our admin team. This usually takes 24 hours.</p>
              {kyc.submitted_at && <span className={styles.date}>Submitted: {new Date(kyc.submitted_at).toLocaleDateString()}</span>}
            </div>
          </div>
        )}

        {kyc.status === "rejected" && (
          <div className={`${styles.statusBanner} ${styles.error}`}>
            <span className={styles.icon}>❌</span>
            <div>
              <h3>Verification Rejected</h3>
              <p>Unfortunately, your verification was rejected.</p>
              {kyc.notes && <p className={styles.notes}>Reason: {kyc.notes}</p>}
            </div>
          </div>
        )}

        {(kyc.status === "none" || kyc.status === "rejected") && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <h3 className={styles.formTitle}>Submit Documents</h3>
            {error && <div className={styles.errorMessage}>{error}</div>}

            <div className={styles.inputGroup}>
              <label>Aadhaar Number</label>
              <input
                type="text"
                placeholder="12-digit Aadhaar Number"
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value)}
                required
                pattern="\d{12}"
                title="12 digit Aadhaar number"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>PAN Number</label>
              <input
                type="text"
                placeholder="10-character PAN"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                required
                pattern="[A-Za-z]{5}\d{4}[A-Za-z]{1}"
                title="Valid PAN format (e.g. ABCDE1234F)"
              />
            </div>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit for Verification"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
