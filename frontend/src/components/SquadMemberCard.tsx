import React from 'react';
import styles from './SquadMemberCard.module.css';
import { MatchResult, SquadMember } from '@/types/squad';
import { Crown } from 'lucide-react';

interface MatchCardProps {
  type: 'match';
  data: MatchResult;
  onInvite?: (userId: string) => void;
  inviteDisabled?: boolean;
}

interface MemberCardProps {
  type: 'member';
  data: SquadMember;
  isLeader?: boolean;
}

type SquadMemberCardProps = MatchCardProps | MemberCardProps;

function genderLabel(g?: string): string | null {
  if (g === 'male') return 'Male';
  if (g === 'female') return 'Female';
  if (g === 'prefer_not_to_say') return 'Prefer not to say';
  return null;
}

const genderPillStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.7)',
  background: 'rgba(255,255,255,0.08)',
  borderRadius: '999px',
  padding: '2px 8px',
  marginTop: '4px',
  display: 'inline-block',
};

export default function SquadMemberCard(props: SquadMemberCardProps) {
  if (props.type === 'match') {
    const { data, onInvite } = props;

    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.avatar}>
            {data.name.charAt(0).toUpperCase()}
          </div>
          <div className={styles.info}>
            <h3 className={styles.name}>{data.name}</h3>
            <div className={styles.scoreBadge}>
              {(data.compatibility_score * 100).toFixed(0)}% Match
            </div>
            {genderLabel(data.gender) && (
              <span style={genderPillStyle}>{genderLabel(data.gender)}</span>
            )}
          </div>
        </div>

        <p className={styles.bio}>{data.bio}</p>

        <div className={styles.tagsContainer}>
          {data.lifestyle_tags.slice(0, 3).map(tag => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
          {data.lifestyle_tags.length > 3 && (
            <span className={styles.tagMore}>+{data.lifestyle_tags.length - 3}</span>
          )}
        </div>

        {onInvite && (
          <button
            className={styles.inviteBtn}
            onClick={() => onInvite(data.user_id)}
            disabled={props.inviteDisabled}
            title={props.inviteDisabled ? 'Create or join a squad first' : 'Invite to your squad'}
          >
            Invite to Squad
          </button>
        )}
      </div>
    );
  }

  // Member View
  const { data, isLeader } = props;

  return (
    <div className={`${styles.card} ${styles.memberCard}`}>
      <div className={styles.header}>
        <div className={styles.avatar}>
          {data.user_name ? data.user_name.charAt(0).toUpperCase() : '?'}
        </div>
        <div className={styles.info}>
          <h3 className={styles.name}>
            {data.user_name || 'Unknown User'}
            {data.role === 'leader' && (
              <span className={styles.leaderBadge} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'middle' }}>
                <Crown size={12} style={{ color: '#ffbd2e', fill: '#ffbd2e' }} /> Leader
              </span>
            )}
          </h3>
          <div className={`${styles.statusBadge} ${styles[data.status]}`}>
            {data.status.toUpperCase()}
          </div>
          {genderLabel(data.gender) && (
            <span style={genderPillStyle}>{genderLabel(data.gender)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
