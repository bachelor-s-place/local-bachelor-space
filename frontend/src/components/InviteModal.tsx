import React, { useState } from 'react';
import styles from './InviteModal.module.css';
import { apiFetch } from '@/lib/api';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  squadId: string;
  userId: string;
  userName: string;
}

export default function InviteModal({ isOpen, onClose, squadId, userId, userName }: InviteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInvite = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/squads/${squadId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId })
      });
      alert(`Invitation sent to ${userName}!`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 className={styles.title}>Invite to Squad</h2>
        <p className={styles.text}>
          Are you sure you want to invite <strong>{userName}</strong> to join your squad?
        </p>
        
        {error && <div className={styles.error}>{error}</div>}
        
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className={styles.confirmBtn} onClick={handleInvite} disabled={loading}>
            {loading ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}
