package transaction

import (
	"context"
	"time"

	"bachelorsSpace/internal/domain/property"
	"bachelorsSpace/internal/domain/squad"
)

type TransactionType string

const (
	TypeTokenPayment TransactionType = "token_payment"
	TypeSuccessFee   TransactionType = "success_fee"
	TypeRefund       TransactionType = "refund"
	TypePayout       TransactionType = "payout"
)

type TransactionStatus string

const (
	StatusInitiated TransactionStatus = "initiated"
	StatusSuccess   TransactionStatus = "success"
	StatusFailed    TransactionStatus = "failed"
	StatusRefunded  TransactionStatus = "refunded"
)

type Transaction struct {
	ID                 string            `json:"id"`
	SquadID            *string           `json:"squad_id,omitempty"`
	UserID             string            `json:"user_id"`
	PropertyID         string            `json:"property_id"`
	Type               TransactionType   `json:"type"`
	Amount             float64           `json:"amount"`
	Currency           string            `json:"currency"`
	Gateway            *string           `json:"gateway,omitempty"`
	GatewayReferenceID *string           `json:"gateway_reference_id,omitempty"`
	GatewayStatus      *string           `json:"gateway_status,omitempty"`
	Status             TransactionStatus `json:"status"`
	CreatedAt          time.Time         `json:"created_at"`
	SettledAt          *time.Time        `json:"settled_at,omitempty"`
}

// Repository defines the interface for transaction data operations.
type Repository interface {
	Create(ctx context.Context, tx *Transaction) error
	UpdateGatewayInfo(ctx context.Context, id string, refID string, gateway string) error
	GetByGatewayRef(ctx context.Context, refID string) (*Transaction, error)
	GetByUserID(ctx context.Context, userID string) ([]*Transaction, error)
	MarkSuccess(ctx context.Context, id string, rawStatus string) error
	// MarkSuccessIfPending atomically flips a transaction to 'success' only if it is
	// not already 'success'. Returns true if this call performed the transition.
	MarkSuccessIfPending(ctx context.Context, id string, rawStatus string) (bool, error)
	GetTotalPaidForSquad(ctx context.Context, squadID string) (float64, error)
}

// Cross-domain interfaces needed by the transaction service.
type SquadRepository interface {
	GetSquadByID(ctx context.Context, id string) (*squad.Squad, error)
	// GetUserGender returns a user's declared gender (nil = undisclosed) — used to
	// enforce the property's gender preference before a squad locks it.
	GetUserGender(ctx context.Context, userID string) (*string, error)
	UpdateTotalDeposit(ctx context.Context, squadID string, amount float64) error
	// SetTotalDeposit sets the collected deposit to an absolute (recomputed) value.
	SetTotalDeposit(ctx context.Context, squadID string, amount float64) error
	SetStatusLocked(ctx context.Context, squadID string) error
	// LockSquadIfPending transitions a not-yet-locked squad to 'locked'. Returns
	// true only if this call performed the transition (so side-effects fire once).
	LockSquadIfPending(ctx context.Context, squadID string) (bool, error)
	SetStatusMovedIn(ctx context.Context, squadID string) error
}

type PropertyRepository interface {
	GetPropertyByID(ctx context.Context, id string) (*property.Property, error)
	SetPropertyOccupied(ctx context.Context, propertyID string) error
	GetRoomByID(ctx context.Context, roomID string) (*property.Room, error)
}

// PayTokenInput is the request body for POST /api/v1/payments/squads/{squadId}/pay-token.
// The leader selects the payment model at the time of initiating the token payment.
type PayTokenInput struct {
	// PaymentModel determines how the token amount is split among squad members.
	// 'leader_pays_all': leader pays the full token in one Razorpay transaction.
	// 'split_evenly': split is tracked internally; leader still makes the single Razorpay payment
	//                after members settle externally.
	PaymentModel string `json:"payment_model" validate:"required,oneof=leader_pays_all split_evenly"`

	// RoomID is required for PG properties where rent is set per room.
	// The token amount is calculated from that room's rent_amount.
	RoomID *string `json:"room_id,omitempty"`
}
