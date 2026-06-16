'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { MatchResult } from '@/types/squad';
import SquadMemberCard from '@/components/SquadMemberCard';
import InviteModal from '@/components/InviteModal';
import { Search, AlertCircle, Inbox, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  useAuthGuard(); // redirects to /login if not authenticated

  const router = useRouter();
  const { user } = useAuth();
  
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Invites
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const [mySquadId, setMySquadId] = useState<string | null>(null);
  
  interface Invite { squad_id: string; squad_name: string; leader_name: string; invited_at: string; }
  const [invites, setInvites] = useState<Invite[]>([]);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);

  // Show banner if the profile isn't filled yet
  const profileIncomplete = user && !user.bio && (!user.lifestyle_tags || user.lifestyle_tags.length === 0);

  const fetchMatches = useCallback(async (pageNum: number, isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    
    try {
      // Squad matching uses the user's active lookup intent.
      // If they haven't submitted a lookup yet, the backend returns a 404 for the active lookup,
      // or returns an empty array.
      const res = await apiFetch(`/squad-lookups/matches?page=${pageNum}&per_page=10`);
      const newMatches = (res.data as MatchResult[]) || [];
      
      if (newMatches.length < 10) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      if (isInitial) {
        setMatches(newMatches);
      } else {
        setMatches(prev => [...prev, ...newMatches]);
      }
    } catch (err: any) {
      // If the user has no active lookup, the backend might return 404 lookup not found
      if (err.message?.toLowerCase().includes('not found')) {
        setMatches([]);
        setHasMore(false);
      } else {
        setError(err.message || 'Failed to fetch matches.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches(1, true);
    fetchInvites();
  }, [fetchMatches]);

  const fetchInvites = () => {
    apiFetch('/squads/invites/mine')
      .then((res) => { if (res.data) setInvites(res.data); })
      .catch(() => {});
  };

  useEffect(() => {
    apiFetch('/squads/mine')
      .then((res) => { if (res.data) setMySquadId(res.data.id); })
      .catch(() => {});
  }, []);

  const handleInviteResponse = async (squadId: string, action: 'accept' | 'reject') => {
    setProcessingInviteId(squadId);
    try {
      await apiFetch(`/squads/${squadId}/members/me`, {
        method: 'PUT',
        body: JSON.stringify({ action })
      });
      // Refresh invites
      fetchInvites();
      if (action === 'accept') {
        router.push(`/squad/${squadId}`);
      }
    } catch (err: any) {
      alert(err.message || `Failed to ${action} invite`);
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMatches(nextPage, false);
    }
  };

  const handleInviteClick = (userId: string) => {
    const match = matches.find(m => m.user_id === userId);
    if (match) {
      setSelectedMatch(match);
      setInviteModalOpen(true);
    }
  };

  return (
    <main className={styles.container}>

      {/* ── Profile Incomplete Banner ──────────────────────────────────── */}
      {profileIncomplete && (
        <div className={styles.profileBanner}>
          <div>
            <div className={styles.bannerTitle}>Complete your profile to get matched</div>
            <div className={styles.bannerDesc}>
              Add your lifestyle preferences so our AI can find compatible roommates for you.
            </div>
          </div>
          <Link href="/onboarding">
            <button className="btn-primary" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
              Complete Profile →
            </button>
          </Link>
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <section className={styles.mainContent}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Your AI Matches</h1>
            <p className={styles.subtitle}>Discover roommates perfectly aligned with your lifestyle.</p>
          </div>
          
          <button 
            className={styles.newSearchBtn}
            onClick={() => router.push('/squad/lookup')}
          >
            Start New Search
          </button>
        </header>

        {error && (
          <div className={styles.errorState} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} style={{ color: 'var(--accent-error)', flexShrink: 0 }} />
            <p>{error}</p>
            <button onClick={() => fetchMatches(1, true)} className={styles.retryBtn}>Retry</button>
          </div>
        )}

        {/* Incoming Invites */}
        {invites.length > 0 && (
          <div className={styles.invitesSection}>
            <h2 className={styles.invitesSectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Inbox size={20} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
              <span>Pending Invitations</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {invites.map(invite => (
                <div key={invite.squad_id} className={styles.inviteItem}>
                  <div>
                    <div className={styles.inviteName}>{invite.squad_name}</div>
                    <div className={styles.inviteBy}>Invited by {invite.leader_name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button 
                      className={styles.secondaryBtn}
                      onClick={() => handleInviteResponse(invite.squad_id, 'reject')}
                      disabled={processingInviteId === invite.squad_id}
                      style={{ borderColor: 'var(--accent-error)', color: 'var(--accent-error)' }}
                    >
                      Decline
                    </button>
                    <button 
                      className={styles.primaryBtn}
                      onClick={() => handleInviteResponse(invite.squad_id, 'accept')}
                      disabled={processingInviteId === invite.squad_id}
                    >
                      {processingInviteId === invite.squad_id ? 'Accepting...' : 'Accept Invite'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && !mySquadId && matches.length > 0 && (
          <div className={styles.profileBanner} style={{ marginBottom: '1.5rem', background: 'rgba(255, 189, 46, 0.1)', border: '1px solid rgba(255, 189, 46, 0.3)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
            <div>
              <div className={styles.bannerTitle} style={{ color: '#ffbd2e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} style={{ color: '#ffbd2e', flexShrink: 0 }} />
                <span>You need a Squad to send invites</span>
              </div>
              <div className={styles.bannerDesc}>
                The "Invite to Squad" buttons are disabled because you aren't in a squad yet. Create one first!
              </div>
            </div>
            <Link href="/squad">
              <button className={styles.secondaryBtn} style={{ flexShrink: 0, whiteSpace: 'nowrap', borderColor: 'rgba(255, 189, 46, 0.3)', color: '#ffbd2e' }}>
                Create Squad →
              </button>
            </Link>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && !error && (
          <div className={styles.matchesGrid}>
            {[1, 2, 3].map(i => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonHeader}>
                  <div className={styles.skeletonAvatar}></div>
                  <div className={styles.skeletonTextContainer}>
                    <div className={styles.skeletonText} style={{ width: '60%' }}></div>
                    <div className={styles.skeletonText} style={{ width: '40%' }}></div>
                  </div>
                </div>
                <div className={styles.skeletonText} style={{ width: '100%', marginTop: '1rem' }}></div>
                <div className={styles.skeletonText} style={{ width: '80%' }}></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State (No Matches or No Intent) */}
        {!loading && !error && matches.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <Search size={48} style={{ color: 'var(--accent-blue)', opacity: 0.8 }} />
            </div>
            <h2>No matches found</h2>
            <p>You haven't started a search or there are no compatible roommates in your area.</p>
            <button 
              className={styles.primaryActionBtn}
              onClick={() => router.push('/squad/lookup')}
            >
              Find Roommates
            </button>
          </div>
        )}

        {/* Matches Grid */}
        {!loading && !error && matches.length > 0 && (
          <>
            <div className={styles.matchesGrid}>
              {matches.map((person) => (
                <SquadMemberCard 
                  key={person.user_id}
                  type="match"
                  data={person}
                  onInvite={handleInviteClick}
                  inviteDisabled={!mySquadId}
                />
              ))}
            </div>

            {/* Load More Pagination */}
            {hasMore && (
              <div className={styles.paginationContainer}>
                <button 
                  className={styles.loadMoreBtn}
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : 'Load More Matches'}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Invite Modal */}
      {selectedMatch && (
        <InviteModal 
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          squadId={mySquadId || ''}
          userId={selectedMatch.user_id}
          userName={selectedMatch.name}
        />
      )}

    </main>
  );
}
