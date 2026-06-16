"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import { apiFetch } from "@/lib/api";
import { setJWT } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

import { GoogleLogin } from "@react-oauth/google";
import BackgroundPaths from "@/components/BackgroundPaths";

/** Determines where to send the user after a successful login. */
async function getPostLoginRoute(role: string, lifestyleTags?: string[]): Promise<string> {
  if (role === 'admin') return '/admin/verifications';
  if (role === 'landlord') {
    try {
      const kycRes = await apiFetch('/kyc/me');
      // If verified, go to dashboard. Otherwise, onboard them.
      if (kycRes.data?.status === 'verified') {
        return '/landlord/properties';
      }
    } catch (err) {
      // On 404 (not found) or any error, they haven't completed KYC
    }
    return '/landlord/onboarding';
  }
  // tenant — check if onboarding is complete
  return (!lifestyleTags || lifestyleTags.length === 0) ? '/onboarding' : '/dashboard';
}

export default function Login() {
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

      if (token) {
        setJWT(token);
        await refreshUser();
        // Fetch profile to get role + lifestyle_tags for redirect decision
        const profile = await apiFetch('/users/me');
        const role = profile.data?.role;
        const tags = profile.data?.lifestyle_tags;
        router.push(await getPostLoginRoute(role, tags));
      } else {
        setError("Invalid response from server");
      }
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      {/* Premium Floating Back Button */}
      <Link href="/" className={styles.backButton}>
        <span style={{ transition: 'transform 0.2s ease', display: 'inline-block' }}>←</span>
        <span>Back to home</span>
      </Link>

      <BackgroundPaths />
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '420px', zIndex: 1 }}>
        {/* Centered & Separated Brand Logo with Asymmetrical Leaf Glassmorphism */}
        <Link href="/" className={styles.brandContainer}>
          <span className={styles.brandLogo}>BachelorsSpace.</span>
        </Link>

        <div className={styles.loginCard}>
          <div>
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.subtitle}>Enter your details to access your account.</p>
          </div>

        <GoogleLogin
          onSuccess={async (credentialResponse) => {
            setLoading(true);
            setError("");
            try {
              const response = await apiFetch("/auth/google", {
                method: "POST",
                body: JSON.stringify({ id_token: credentialResponse.credential }),
              });

              const token = response.data?.access_token;
              if (token) {
                setJWT(token);
                await refreshUser();
                const profile = await apiFetch('/users/me');
                const role = profile.data?.role;
                const tags = profile.data?.lifestyle_tags;
                router.push(await getPostLoginRoute(role, tags));
              } else {
                setError("Invalid response from server");
              }
            } catch (err: any) {
              setError(err.message || "Google sign-in failed");
            } finally {
              setLoading(false);
            }
          }}
          onError={() => setError("Google sign-in failed")}
        />

        <div className={styles.divider}>or</div>

        {error && <div style={{ color: '#ff5f56', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>}

        <form className={styles.formGroup} style={{ gap: "1rem" }} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address</label>
            <input 
              type="email" 
              className={styles.input} 
              placeholder="keval@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Password</label>
            <input 
              type="password" 
              className={styles.input} 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
          Don't have an account? <Link href="/signup" style={{ color: "var(--text-primary)", fontWeight: 600, textDecoration: "underline" }}>Sign up</Link>
        </div>
        </div>
      </div>
    </main>
  );
}
