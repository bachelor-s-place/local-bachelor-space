'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { apiFetch } from '@/lib/api';
import styles from './page.module.css';

export default function SquadHubPage() {
  useAuthGuard();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [squadName, setSquadName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/squads/mine')
      .then((res) => {
        if (res.data) {
          router.replace(`/squad/${res.data.id}`);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [router]);

  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!squadName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await apiFetch('/squads', {
        method: 'POST',
        body: JSON.stringify({ name: squadName.trim(), payment_model: 'leader_pays_all' }),
      });
      router.push(`/squad/${res.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create squad');
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.centerState}>
        <div className={styles.spinner} />
        <p>Checking your squad status...</p>
      </div>
    );
  }

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <div className={styles.heroCard}>
          <div className={styles.heroIcon}>🏠</div>
          <h1 className={styles.title}>Your Squad Hub</h1>
          <p className={styles.subtitle}>
            You're not in a squad yet. Find compatible roommates or start your own.
          </p>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <div className={styles.actionsGrid}>
          <div className={styles.actionCard}>
            <div className={styles.actionIcon}>🔍</div>
            <h2 className={styles.actionTitle}>Find Roommates</h2>
            <p className={styles.actionDesc}>
              Register your preferences and let our AI match you with compatible people.
            </p>
            <button className={styles.primaryBtn} onClick={() => router.push('/squad/lookup')}>
              Start Matchmaking
            </button>
          </div>

          <div className={styles.actionCard}>
            <div className={styles.actionIcon}>✨</div>
            <h2 className={styles.actionTitle}>Create a Squad</h2>
            <p className={styles.actionDesc}>
              Already know your crew? Create a squad and invite them directly.
            </p>
            {!showCreateForm ? (
              <button className={styles.secondaryBtn} onClick={() => setShowCreateForm(true)}>
                Create Squad
              </button>
            ) : (
              <form onSubmit={handleCreateSquad} className={styles.createForm}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Squad name (e.g. The Navrangpura Crew)"
                  value={squadName}
                  onChange={(e) => setSquadName(e.target.value)}
                  maxLength={80}
                  required
                />
                <button type="submit" className={styles.primaryBtn} disabled={creating}>
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
