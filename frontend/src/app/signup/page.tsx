'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '@/app/login/page.module.css';
import { apiFetch } from '@/lib/api';
import { setJWT } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';

import { GoogleLogin } from '@react-oauth/google';
import BackgroundPaths from '@/components/BackgroundPaths';

export default function Signup() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'tenant' | 'landlord'>('tenant');
  const [gender, setGender] = useState<'' | 'male' | 'female' | 'prefer_not_to_say'>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (role === 'tenant' && !gender) {
        setError('Please select your gender.');
        setLoading(false);
        return;
      }

      const payload: any = { name, email, password, role };
      if (role === 'tenant') {
        payload.gender = gender;
      }

      // 1. Register the account
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // 2. Auto-login with the same credentials
      const loginRes = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const token = loginRes.data?.access_token;
      if (token) {
        setJWT(token);
        await refreshUser();
        // Route based on role
        if (role === 'landlord') {
          router.push('/landlord/onboarding');
        } else {
          router.push('/onboarding');
        }
      } else {
        setError('Registration succeeded but login failed. Please log in manually.');
        router.push('/login');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
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
            <h1 className={styles.title}>Create Account</h1>
            <p className={styles.subtitle}>
              {role === 'tenant' ? "Join BachelorsSpace today — it's free for tenants." : "List your space and find great tenants."}
            </p>
          </div>

          <div className={styles.tabs}>
            <div 
              className={`${styles.tab} ${role === 'tenant' ? styles.active : ''}`}
              onClick={() => setRole('tenant')}
            >
              Tenant
            </div>
            <div 
              className={`${styles.tab} ${role === 'landlord' ? styles.active : ''}`}
              onClick={() => setRole('landlord')}
            >
              Home Owner
            </div>
          </div>

        <div style={{ marginTop: '0.5rem', width: '100%' }}>
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              setLoading(true);
              setError("");
              try {
                const response = await apiFetch("/auth/google", {
                  method: "POST",
                  body: JSON.stringify({ id_token: credentialResponse.credential, role }),
                });
                
                const token = response.data?.access_token;
                if (token) {
                  setJWT(token);
                  await refreshUser();
                  const profile = await apiFetch('/users/me');
                  const userRole = profile.data?.role || role;
                  const tags = profile.data?.lifestyle_tags;
                  
                  if (userRole === 'admin') {
                    router.push('/admin/verifications');
                  } else if (userRole === 'landlord') {
                    try {
                      const kycRes = await apiFetch('/kyc/me');
                      if (kycRes.data?.status === 'verified') {
                        router.push('/landlord/properties');
                        return;
                      }
                    } catch (err) {}
                    router.push('/landlord/onboarding');
                  } else {
                    if (!tags || tags.length === 0) {
                      router.push('/onboarding');
                    } else {
                      router.push('/dashboard');
                    }
                  }
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
        </div>

        <div className={styles.divider}>or continue with email</div>

        {error && (
          <div style={{ color: '#ff5f56', fontSize: '0.85rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form className={styles.formGroup} style={{ gap: '1rem', marginTop: '0.5rem' }} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Full Name</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Keval Parmar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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
              minLength={6}
            />
          </div>

          {role === 'tenant' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Gender</label>
              <select
                className={styles.input}
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                required
              >
                <option value="" disabled>Select gender…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'underline' }}>
            Sign in
          </Link>
        </div>
        </div>
      </div>
    </main>
  );
}
