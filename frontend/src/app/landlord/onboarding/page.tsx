'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import styles from '@/app/login/page.module.css';

export default function LandlordOnboarding() {
  useAuthGuard();
  const { user } = useAuth();

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 4rem)' }}>
      <div className={styles.loginCard} style={{ textAlign: 'center', padding: '3rem 2.5rem' }}>
        <h1 className={styles.title}>Welcome, {user?.name}!</h1>
        <p className={styles.subtitle} style={{ marginBottom: '2rem' }}>
          To start listing your properties and finding great tenants, we need to verify your identity.
        </p>

        <Link href="/landlord/kyc" className={styles.submitBtn} style={{ display: 'inline-block', textDecoration: 'none' }}>
          Complete KYC Now
        </Link>

        <Link
          href="/landlord/properties"
          style={{ display: 'block', marginTop: '1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', textDecoration: 'none', transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
        >
          Skip for now →
        </Link>
      </div>
    </div>

  );
}
