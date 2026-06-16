"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { setJWT } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import styles from "./page.module.css";

export default function AdminLogin() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const token = response.data?.access_token;
      const role = response.data?.role;

      if (!token) {
        setError("Invalid response from server.");
        return;
      }

      // Security: only accept admin accounts on this page
      if (role !== "admin") {
        setError("Access denied. This login page is for administrators only.");
        return;
      }

      setJWT(token);
      await refreshUser(); // <--- Critical: populates the context before redirecting
      router.push("/admin/verifications");
    } catch (err: any) {
      setError(err.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.badge}>ADMIN</div>
          <h1 className={styles.title}>Admin Console</h1>
          <p className={styles.subtitle}>BachelorsSpace internal administration portal</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              className={styles.input}
              placeholder="admin@bachelorsspace.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              className={styles.input}
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Authenticating..." : "Sign In to Console"}
          </button>
        </form>

        <p className={styles.disclaimer}>
          This is a restricted area. Unauthorised access is prohibited and monitored.
        </p>
      </div>
    </main>
  );
}
