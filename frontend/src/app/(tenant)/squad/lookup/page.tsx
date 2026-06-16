'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import styles from './page.module.css';
import { Info } from 'lucide-react';

export default function SquadLookupPage() {
  useAuthGuard();
  const router = useRouter();
  const [formData, setFormData] = useState({ locality_preference: '', budget_min: '', budget_max: '' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [hasActiveLookup, setHasActiveLookup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/squad-lookups/mine')
      .then(res => {
        if (res.data) {
          setHasActiveLookup(true);
          setFormData({
            locality_preference: res.data.locality_preference || '',
            budget_min: res.data.budget_min?.toString() || '',
            budget_max: res.data.budget_max?.toString() || ''
          });
        }
      })
      .catch(() => {
        // Ignored, probably 404 (no active lookup)
      })
      .finally(() => {
        setFetching(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/squad-lookups', {
        method: 'POST',
        body: JSON.stringify({
          locality_preference: formData.locality_preference,
          budget_min: parseFloat(formData.budget_min),
          budget_max: parseFloat(formData.budget_max),
        }),
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to register squad lookup');
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Find Your Squad</h1>
        <p className={styles.subtitle}>
          Tell us your preferences. Our AI will match you with compatible roommates.
        </p>
        {fetching ? (
          <div className={styles.centerState}>Loading...</div>
        ) : (
          <>
            {hasActiveLookup && (
              <div className={styles.warningBanner} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(243,156,18,0.1)', color: '#f39c12', borderRadius: '8px', border: '1px solid rgba(243,156,18,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={18} style={{ color: '#f39c12', flexShrink: 0 }} />
                <span>You already have an active search running. Submitting this form will update your existing search preferences.</span>
              </div>
            )}
            {error && <div className={styles.errorBanner}>{error}</div>}
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Preferred Locality</label>
                <input
                  type="text" className={styles.input} required
                  placeholder="e.g. Navrangpura, SG Highway"
                  value={formData.locality_preference}
                  onChange={(e) => setFormData({ ...formData, locality_preference: e.target.value })}
                />
              </div>
              <div className={styles.budgetRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Min Budget (₹)</label>
                  <input type="number" className={styles.input} required min="1000"
                    value={formData.budget_min}
                    onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Max Budget (₹)</label>
                  <input type="number" className={styles.input} required min="1000"
                    value={formData.budget_max}
                    onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Finding Matches...' : 'Start Matchmaking'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
