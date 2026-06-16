export type SquadStatus = 'browsing' | 'forming' | 'pending_landlord_approval' | 'payment_pending' | 'locked' | 'moved_in' | 'disbanded';
export type MemberStatus = 'invited' | 'accepted' | 'rejected' | 'left';
export type MemberRole = 'leader' | 'member';
export type PaymentModel = 'leader_pays_all' | 'split_evenly';

export interface Squad {
  id: string;
  property_id?: string;
  room_id?: string;
  name: string;
  status: SquadStatus;
  payment_model: PaymentModel;
  max_size: number;
  current_member_count: number;
  created_by: string;
  total_deposit_collected: number;
  token_paid_at?: string;
  created_at: string;
  updated_at: string;
}

export type Gender = 'male' | 'female' | 'prefer_not_to_say';

export interface SquadMember {
  id: string;
  squad_id: string;
  user_id: string;
  user_name?: string;
  gender?: Gender;
  role: MemberRole;
  status: MemberStatus;
  share_amount?: number;
  joined_at?: string;
  created_at: string;
}

export interface SquadLookup {
  id: string;
  user_id: string;
  property_id?: string;
  locality_preference?: string;
  budget_min?: number;
  budget_max?: number;
  status: string; // 'active' | 'matched' | 'inactive'
  created_at: string;
  expires_at: string;
}

export interface MatchResult {
  user_id: string;
  name: string;
  gender?: Gender;
  lifestyle_tags: string[];
  bio: string;
  compatibility_score: number;
}

export interface PropertyProposal {
  id: string;
  squad_id: string;
  proposed_by: string;
  property_id: string;
  room_id?: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  // Included by the backend GetProposals handler
  property_title?: string;
  proposer_name?: string;
}
