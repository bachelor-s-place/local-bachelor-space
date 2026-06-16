package squad

import (
	"context"
	"errors"
	"time"
)

// Domain Errors
var (
	ErrSquadNotFound      = errors.New("squad not found")
	ErrSquadFull          = errors.New("squad has reached maximum capacity")
	ErrAlreadyInSquad     = errors.New("user is already a member of this squad")
	ErrNotSquadLeader     = errors.New("only the squad leader can perform this action")
	ErrLookupNotFound     = errors.New("active squad lookup not found")
	ErrProposalNotFound   = errors.New("property proposal not found")
	ErrProposalResolved   = errors.New("proposal has already been resolved")
	ErrNotInvited         = errors.New("you must be invited to join this squad")
	ErrUnauthorizedAction = errors.New("unauthorized action for this squad")
	// ErrGenderMismatch is returned when an action would put users of different
	// genders in the same squad, or bind a squad to a property restricted to a
	// different gender. Squads are single-gender by invariant.
	ErrGenderMismatch = errors.New("squad members must all be the same gender")
	// ErrGenderRequired is returned when a user has no declared gender and therefore
	// cannot take a gender-segregated action (fail closed).
	ErrGenderRequired = errors.New("you must set your gender before joining or forming a squad")
)

// Squad Status
type Status string

const (
	StatusBrowsing                Status = "browsing" // No property selected yet
	StatusForming                 Status = "forming"  // Property identified; members finalizing
	StatusPendingLandlordApproval Status = "pending_landlord_approval" // Waiting for landlord to accept
	StatusPaymentPending          Status = "payment_pending" // Landlord approved, waiting for token payment
	StatusLocked                  Status = "locked"   // Token paid; property reserved
	StatusMovedIn                 Status = "moved_in" // Move-in confirmed
	StatusDisbanded               Status = "disbanded"
)

// Member Status & Role
type MemberStatus string
type MemberRole string

const (
	MemberStatusInvited  MemberStatus = "invited"
	MemberStatusAccepted MemberStatus = "accepted"
	MemberStatusRejected MemberStatus = "rejected"
	MemberStatusLeft     MemberStatus = "left"

	MemberRoleLeader MemberRole = "leader"
	MemberRoleMember MemberRole = "member"
)

// Payment Model
type PaymentModel string

const (
	PaymentModelLeaderPaysAll PaymentModel = "leader_pays_all"
	PaymentModelSplitEvenly   PaymentModel = "split_evenly"
)

// Squad represents a group of 2-5 bachelors renting together.
type Squad struct {
	ID                   string       `json:"id"`
	PropertyID           *string      `json:"property_id,omitempty"` // NULL when browsing
	RoomID               *string      `json:"room_id,omitempty"`
	Name                 string       `json:"name"`
	Status               Status       `json:"status"`
	PaymentModel         PaymentModel `json:"payment_model"`
	MaxSize              int          `json:"max_size"`
	CurrentMemberCount   int          `json:"current_member_count"`
	CreatedBy            string       `json:"created_by"`
	TotalDepositCollected float64     `json:"total_deposit_collected"`
	TokenPaidAt          *time.Time   `json:"token_paid_at,omitempty"`
	CreatedAt            time.Time    `json:"created_at"`
	UpdatedAt            time.Time    `json:"updated_at"`
}

// SquadMember represents a user's membership in a squad.
type SquadMember struct {
	ID          string       `json:"id"`
	SquadID     string       `json:"squad_id"`
	UserID      string       `json:"user_id"`
	UserName    string       `json:"user_name,omitempty"` // For UI lists
	Gender      *string      `json:"gender,omitempty"`    // member's gender (squads are single-gender)
	Role        MemberRole   `json:"role"`
	Status      MemberStatus `json:"status"`
	ShareAmount *float64     `json:"share_amount"`
	JoinedAt    *time.Time   `json:"joined_at,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
}

// SquadLookup represents a tenant's intent to find a squad.
type SquadLookup struct {
	ID                 string    `json:"id"`
	UserID             string    `json:"user_id"`
	PropertyID         *string   `json:"property_id,omitempty"` // NULL = squad-first flow
	LocalityPreference string    `json:"locality_preference,omitempty"`
	BudgetMin          *float64  `json:"budget_min"`
	BudgetMax          *float64  `json:"budget_max"`
	Status             string    `json:"status"` // active | matched | inactive
	CreatedAt          time.Time `json:"created_at"`
	ExpiresAt          time.Time `json:"expires_at"`
}

// MatchResult represents a compatible user found via pgvector similarity.
type MatchResult struct {
	UserID            string   `json:"user_id"`
	Name              string   `json:"name"`
	Gender            *string  `json:"gender,omitempty"`
	LifestyleTags     []string `json:"lifestyle_tags"`
	Bio               string   `json:"bio"`
	CompatibilityScore float64  `json:"compatibility_score"`
}

// Repository interface for squad data access.
type Repository interface {
	// Lookups
	CreateLookup(ctx context.Context, lookup *SquadLookup) (string, error)
	GetActiveLookup(ctx context.Context, userID string) (*SquadLookup, error)
	UpdateActiveLookup(ctx context.Context, lookup *SquadLookup) error
	DeleteLookup(ctx context.Context, userID string) error
	
	// Matching (The pgvector core)
	FindMatches(ctx context.Context, userID string, limit int, offset int) ([]MatchResult, error)

	// Gender helpers for single-gender squad enforcement.
	// GetUserGender returns a user's declared gender (nil = not disclosed).
	GetUserGender(ctx context.Context, userID string) (*string, error)
	// GetPropertyForGender returns a property's gender preference ('male'|'female'|'any').
	GetPropertyForGender(ctx context.Context, propertyID string) (string, error)

	// Squads
	CreateSquad(ctx context.Context, squad *Squad, leaderID string) (string, error)
	GetSquadByID(ctx context.Context, id string) (*Squad, error)
	GetMySquad(ctx context.Context, userID string) (*Squad, error)
	GetMyInvites(ctx context.Context, userID string) ([]map[string]interface{}, error)
	GetMembers(ctx context.Context, squadID string) ([]SquadMember, error)
	
	// Invites & Membership
	AddMember(ctx context.Context, squadID, userID string, role MemberRole, status MemberStatus) error
	JoinSquad(ctx context.Context, squadID, userID string) error
	// AcceptInvite atomically converts a pending invite to an accepted membership,
	// enforcing capacity under a row lock. Returns ErrNotInvited / ErrAlreadyInSquad /
	// ErrSquadFull / ErrSquadNotFound as appropriate.
	AcceptInvite(ctx context.Context, squadID, userID string) error
	UpdateMemberStatus(ctx context.Context, squadID, userID string, status MemberStatus) error
	RemoveMember(ctx context.Context, squadID, userID string) error

	// Proposals
	CreateProposal(ctx context.Context, squadID, userID, propertyID string, roomID *string) (string, error)
	GetProposals(ctx context.Context, squadID string) ([]map[string]interface{}, error)
	// GetProposalSquadLeader returns, for a proposal: the squad id, the squad leader's
	// user id, the proposal's current status, the proposed property's for_gender, and
	// the leader's gender — used to enforce leader-only resolution AND that the property
	// is gender-compatible with the (single-gender) squad.
	GetProposalSquadLeader(ctx context.Context, proposalID string) (squadID, leaderID, status, propForGender string, leaderGender *string, err error)
	ResolveProposal(ctx context.Context, proposalID string, status string) error
	GetLandlordContact(ctx context.Context, propertyID string) (map[string]string, error)
	// Landlord Applications
	GetLandlordApplications(ctx context.Context, landlordID string) ([]map[string]interface{}, error)
	ResolveLandlordApplication(ctx context.Context, squadID string, landlordID string, accept bool) error
	
	UpdateTotalDeposit(ctx context.Context, squadID string, amount float64) error
	SetStatusLocked(ctx context.Context, squadID string) error
	SetStatusMovedIn(ctx context.Context, squadID string) error
}
