import React, { useState } from 'react';
import styles from './ProposalList.module.css';
import { PropertyProposal } from '@/types/squad';
import { apiFetch } from '@/lib/api';
import { Home } from 'lucide-react';

interface ProposalListProps {
  proposals: PropertyProposal[];
  isLeader: boolean;
  onUpdate: () => void;
}

export default function ProposalList({ proposals, isLeader, onUpdate }: ProposalListProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAction = async (proposalId: string, action: 'accept' | 'reject') => {
    setProcessingId(proposalId);
    try {
      await apiFetch(`/squads/proposals/${proposalId}`, {
        method: 'PUT',
        body: JSON.stringify({ action })
      });
      onUpdate();
    } catch (err: any) {
      alert(err.message || `Failed to ${action} proposal`);
    } finally {
      setProcessingId(null);
    }
  };

  if (proposals.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
          <Home size={40} style={{ color: 'var(--accent-blue)', opacity: 0.8 }} />
        </span>
        <p>No properties proposed yet.</p>
        <span className={styles.emptySub}>Browse properties and propose one to your squad!</span>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {proposals.map(proposal => (
        <div key={proposal.id} className={styles.card}>
          <div className={styles.details}>
            <div className={styles.header}>
              <h4 className={styles.title}>{proposal.property_title || 'Unknown Property'}</h4>
              <span className={`${styles.status} ${styles[proposal.status]}`}>
                {proposal.status.toUpperCase()}
              </span>
            </div>
            
            <p className={styles.meta}>
              Proposed by <span className={styles.proposer}>{proposal.proposer_name || 'Someone'}</span>
              {' • '}
              {new Date(proposal.created_at).toLocaleDateString()}
            </p>
          </div>

          {isLeader && proposal.status === 'pending' && (
            <div className={styles.actions}>
              <button 
                className={styles.rejectBtn}
                onClick={() => handleAction(proposal.id, 'reject')}
                disabled={processingId === proposal.id}
              >
                Reject
              </button>
              <button 
                className={styles.acceptBtn}
                onClick={() => handleAction(proposal.id, 'accept')}
                disabled={processingId === proposal.id}
              >
                Accept & Lock
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
