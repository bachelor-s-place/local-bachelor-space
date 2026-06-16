'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import styles from './page.module.css';

export default function JoinSquadPage() {
  useAuthGuard(); // Must be logged in to join

  const params = useParams();
  const router = useRouter();
  const squadId = params.id as string;

  const [squadName, setSquadName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch squad details just to get the name and verify it exists
    apiFetch(`/squads/${squadId}`)
      .then(res => {
        setSquadName(res.data.squad.name);
      })
      .catch(err => {
        setError(err.message || 'Squad not found or access denied.');
      })
      .finally(() => setLoading(false));
  }, [squadId]);

  const handleJoin = async () => {
    setJoining(true);
    setError(null);
    try {
      await apiFetch(`/squads/${squadId}/join`, {
        method: 'POST'
      });
      // Redirect to the squad page on success
      router.push(`/squad/${squadId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to join squad.');
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.desc}>Loading invitation details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>✉️</div>
        <h1 className={styles.title}>You've been invited!</h1>
        
        {squadName ? (
          <p className={styles.desc}>
            You have been invited to join <span className={styles.squadName}>{squadName}</span>.
            Would you like to join this squad?
          </p>
        ) : (
          <p className={styles.desc}>You have been invited to join a squad.</p>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.btnGroup}>
          <button 
            className={styles.joinBtn} 
            onClick={handleJoin} 
            disabled={joining || !!error}
          >
            {joining ? 'Joining...' : 'Join Squad'}
          </button>
          <button 
            className={styles.cancelBtn} 
            onClick={() => router.push('/dashboard')}
            disabled={joining}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
