'use client';

import { useState, useEffect } from 'react';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { apiFetch } from '@/lib/api';
import styles from './page.module.css';

interface Application {
  squad_id: string;
  squad_name: string;
  max_size: number;
  current_member_count: number;
  property_id: string;
  property_title: string;
  applied_at: string;
}

export default function LandlordApplicationsPage() {
  useAuthGuard();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchApplications = async () => {
    try {
      const res = await apiFetch('/squads/applications');
      setApplications(res.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleResolve = async (squadId: string, action: 'approve' | 'reject') => {
    setProcessingId(squadId);
    try {
      await apiFetch(`/squads/${squadId}/application_status`, {
        method: 'PUT',
        body: JSON.stringify({ action }),
      });
      // Remove from list or refresh
      await fetchApplications();
    } catch (err: any) {
      alert(err.message || `Failed to ${action} application`);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <main className={styles.container}>
        <div className={styles.centerState}>
          <div className={styles.spinner} />
          <p>Loading applications...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Squad Applications</h1>
      <p className={styles.subtitle}>Review and approve tenants interested in your properties.</p>

      {error ? (
        <div className={styles.centerState}>
          <p>⚠️ {error}</p>
        </div>
      ) : applications.length === 0 ? (
        <div className={styles.centerState}>
          <div className={styles.emptyIcon}>📭</div>
          <h2>No Applications Yet</h2>
          <p>When a squad applies to your property, it will appear here.</p>
        </div>
      ) : (
        <div className={styles.applicationsGrid}>
          {applications.map((app) => (
            <div key={app.squad_id} className={styles.card}>
              <div className={styles.propertyTag}>📍 {app.property_title}</div>
              <h3 className={styles.squadName}>{app.squad_name}</h3>
              <p className={styles.meta}>
                👥 {app.current_member_count} of {app.max_size} members
              </p>
              <p className={styles.meta} style={{ marginBottom: '1.5rem' }}>
                ⏱️ Applied {new Date(app.applied_at).toLocaleDateString()}
              </p>
              
              <div className={styles.actions}>
                <button 
                  className={styles.rejectBtn}
                  onClick={() => handleResolve(app.squad_id, 'reject')}
                  disabled={processingId === app.squad_id}
                >
                  Reject
                </button>
                <button 
                  className={styles.acceptBtn}
                  onClick={() => handleResolve(app.squad_id, 'approve')}
                  disabled={processingId === app.squad_id}
                >
                  Approve Squad
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
