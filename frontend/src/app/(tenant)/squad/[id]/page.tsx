'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Squad, SquadMember, PropertyProposal } from '@/types/squad';
import SquadMemberCard from '@/components/SquadMemberCard';
import ProposalList from '@/components/ProposalList';
import { AlertTriangle, Hourglass, Sparkles, MessageSquare, Share2 } from 'lucide-react';

interface SquadDetailsResponse {
  squad: Squad;
  members: SquadMember[];
  proposals: PropertyProposal[];
}

function SquadDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const squadId = params.id as string;

  const [data, setData] = useState<SquadDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const showPaymentBanner = searchParams.get('payment') === 'success';

  const fetchSquadDetails = async () => {
    try {
      const response = await apiFetch(`/squads/${squadId}`);
      setData(response.data as SquadDetailsResponse);
    } catch (err: any) {
      setError(err.message || 'Failed to load squad details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (squadId) fetchSquadDetails();
  }, [squadId]);

  if (loading) {
    return (
      <div className={styles.centerState}>
        <div className={styles.spinner}></div>
        <p>Loading squad details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.centerState}>
        <div className={styles.errorIcon} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={48} style={{ color: '#ffb732' }} />
        </div>
        <h2>Oops!</h2>
        <p>{error || 'Squad not found'}</p>
        <button className={styles.backBtn} onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const { squad, members, proposals } = data;
  const isLeader = members.some(m => m.user_id === user?.id && m.role === 'leader');

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/squad/join/${squadId}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      alert('Invite link copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy invite link.');
    });
  };

  const renderActionBanner = () => {
    if (squad.status === 'pending_landlord_approval') {
      return (
        <div className={styles.warningBanner} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Hourglass size={16} style={{ color: '#ffb732', flexShrink: 0 }} />
          <span>Awaiting Landlord Approval. The landlord is currently reviewing your squad profile.</span>
        </div>
      );
    }
    if (squad.status === 'payment_pending') {
      return (
        <div className={styles.successBanner} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} style={{ color: '#ffbd2e', flexShrink: 0 }} />
            <span>Landlord Approved! Pay the token amount to lock the property.</span>
          </span>
          {isLeader && (
            <button 
              className={styles.primaryBtn} 
              onClick={() => router.push(`/squad/${squadId}/payment`)}
            >
              Pay Token
            </button>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        {/* Payment Success Banner */}
        {showPaymentBanner && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(108,99,255,0.25), rgba(72,199,142,0.2))',
            border: '1px solid rgba(72,199,142,0.4)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#fff',
          }}>
            <span style={{ fontSize: '1.5rem' }}>🔒</span>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>Property Secured!</div>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>Your token payment was successful. The property is now reserved for your squad.</div>
            </div>
          </div>
        )}

        {renderActionBanner()}
        
        {/* Header Section */}
        <div className={styles.headerCard}>
          <div className={styles.headerContent}>
            <div>
              <div className={styles.statusBadge}>{squad.status.toUpperCase()}</div>
              <h1 className={styles.title}>{squad.name}</h1>
              <p className={styles.meta}>
                Payment Model: <strong>{squad.payment_model.replace('_', ' ')}</strong> • 
                Created on {new Date(squad.created_at).toLocaleDateString()}
              </p>
            </div>
            
            <div className={styles.statsRow}>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Members</span>
                <span className={styles.statValue}>{squad.current_member_count} / {squad.max_size}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Deposit Collected</span>
                <span className={styles.statValue}>₹{squad.total_deposit_collected.toLocaleString()}</span>
              </div>
              <div className={styles.statBox} style={{ justifyContent: 'center', background: 'transparent', border: 'none', padding: 0, gap: '0.75rem' }}>
                <button 
                  className={styles.chatBtn}
                  onClick={() => router.push(`/squad/${squadId}/chat`)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <MessageSquare size={16} />
                  <span>Open Squad Chat</span>
                </button>
                <button 
                  className={styles.secondaryBtn}
                  onClick={copyInviteLink}
                  style={{ margin: 0, padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Share2 size={14} />
                  <span>Copy Invite Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className={styles.grid}>
          {/* Members Column */}
          <div className={styles.column}>
            <h2 className={styles.sectionTitle}>Squad Members</h2>
            <div className={styles.memberList}>
              {members.map(member => (
                <SquadMemberCard 
                  key={member.id} 
                  type="member" 
                  data={member} 
                  isLeader={isLeader} 
                />
              ))}
            </div>
          </div>

          {/* Proposals Column */}
          <div className={styles.column}>
            <h2 className={styles.sectionTitle}>Property Proposals</h2>
            <ProposalList 
              proposals={proposals || []} 
              isLeader={isLeader} 
              onUpdate={fetchSquadDetails}
            />
          </div>
        </div>

      </div>
    </main>
  );
}

export default function SquadDetailsPage() {
  return (
    <Suspense fallback={
      <div className={styles.centerState}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    }>
      <SquadDetailsContent />
    </Suspense>
  );
}
