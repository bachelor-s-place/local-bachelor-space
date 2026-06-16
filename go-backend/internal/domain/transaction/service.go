package transaction

import (
	"context"
	"fmt"
	"strings"

	"bachelorsSpace/internal/domain/squad"
	"bachelorsSpace/internal/pkg/money"
	"bachelorsSpace/internal/pkg/payment"
)

// NotificationService is the interface the transaction service needs for event notifications.
type NotificationService interface {
	TokenPaymentSuccess(ctx context.Context, userID, squadID, propertyID string)
	MoveInConfirmed(ctx context.Context, userID, squadID, propertyID string)
}

type Service struct {
	repo         Repository
	squadRepo    SquadRepository
	propertyRepo PropertyRepository
	gateway      payment.Gateway
	notifier     NotificationService
}

func NewService(
	repo Repository,
	squadRepo SquadRepository,
	propertyRepo PropertyRepository,
	gateway payment.Gateway,
	notifier NotificationService,
) *Service {
	return &Service{
		repo:         repo,
		squadRepo:    squadRepo,
		propertyRepo: propertyRepo,
		gateway:      gateway,
		notifier:     notifier,
	}
}

// InitiateTokenPayment starts the payment process for a squad.
// The squad leader selects the payment model (leader_pays_all | split_evenly) at this point.
// Token amount is derived from: rent_amount × property.token_percentage / 100.
// For PG properties, input.RoomID must be provided to resolve the room's rent.
// BR-09: Transaction record is ALWAYS created before the gateway call.
func (s *Service) InitiateTokenPayment(ctx context.Context, userID, squadID string, input PayTokenInput) (*Transaction, *payment.Order, error) {
	sq, err := s.squadRepo.GetSquadByID(ctx, squadID)
	if err != nil {
		return nil, nil, err
	}

	// Only the squad leader can initiate token payment
	if userID != sq.CreatedBy {
		return nil, nil, fmt.Errorf("only the squad leader can initiate the token payment")
	}

	// Don't allow a new token order once the squad is already paid/locked — prevents
	// a second charge for a squad whose token has already been collected.
	if sq.Status == squad.StatusLocked || sq.Status == squad.StatusMovedIn {
		return nil, nil, fmt.Errorf("token has already been paid for this squad")
	}

	if sq.PropertyID == nil {
		return nil, nil, fmt.Errorf("squad has no property selected")
	}

	prop, err := s.propertyRepo.GetPropertyByID(ctx, *sq.PropertyID)
	if err != nil {
		return nil, nil, err
	}

	// Final gender gate before money moves: the property's gender preference must
	// allow this (single-gender) squad, represented by its leader. Fail closed.
	leaderGender, err := s.squadRepo.GetUserGender(ctx, sq.CreatedBy)
	if err != nil {
		return nil, nil, err
	}
	if prop.ForGender != "any" && (leaderGender == nil || *leaderGender != prop.ForGender) {
		return nil, nil, fmt.Errorf("this property's gender preference does not match the squad")
	}

	// Determine the applicable rent amount:
	// For PG properties, rent lives at the room level — RoomID is required.
	// For all other types, rent is at the property level.
	var rentAmount float64
	if prop.PropertyType == "pg" {
		if input.RoomID == nil {
			return nil, nil, fmt.Errorf("room_id is required for PG properties")
		}
		room, err := s.propertyRepo.GetRoomByID(ctx, *input.RoomID)
		if err != nil {
			return nil, nil, fmt.Errorf("room not found: %w", err)
		}
		rentAmount = room.RentAmount
	} else {
		if prop.RentAmount == nil {
			return nil, nil, fmt.Errorf("property has no rent amount configured")
		}
		rentAmount = *prop.RentAmount
	}

	// Token amount = rent × token_percentage / 100, computed in exact integer paise
	// so the value stored, charged at the gateway, and verified in the webhook all
	// agree to the paise (no floating-point drift).
	tokenAmount := money.ToRupees(money.PercentOf(money.ToPaise(rentAmount), prop.TokenPercentage))

	// BR-09: Create the DB record first before calling gateway
	tx := &Transaction{
		SquadID:    &squadID,
		UserID:     userID,
		PropertyID: *sq.PropertyID,
		Type:       TypeTokenPayment,
		Amount:     tokenAmount,
		Currency:   "INR",
		Status:     StatusInitiated,
	}
	if err := s.repo.Create(ctx, tx); err != nil {
		return nil, nil, err
	}

	// Create order on gateway
	metadata := map[string]string{
		"transaction_id": tx.ID,
		"squad_id":       squadID,
		"payment_model":  input.PaymentModel,
	}
	order, err := s.gateway.CreateOrder(ctx, tokenAmount, "INR", metadata)
	if err != nil {
		// Record stays 'initiated' — can be retried
		return nil, nil, err
	}

	// Persist gateway reference — use gateway.GatewayName() (NOT hardcoded string)
	if err := s.repo.UpdateGatewayInfo(ctx, tx.ID, order.ID, s.gateway.GatewayName()); err != nil {
		return nil, nil, err
	}

	tx.GatewayReferenceID = &order.ID
	return tx, order, nil
}

// RetryableError marks a webhook failure that the gateway SHOULD retry — a transient
// problem (e.g. a DB error during a legitimate capture). Permanent failures (bad
// signature, amount mismatch, unparseable body) are returned as plain errors and must
// NOT be retried. The handler uses this to choose the HTTP status it returns to Razorpay.
type RetryableError struct{ Err error }

func (e *RetryableError) Error() string { return e.Err.Error() }
func (e *RetryableError) Unwrap() error { return e.Err }

// retryable wraps an error as transient so the webhook is retried by the gateway.
func retryable(err error) error {
	if err == nil {
		return nil
	}
	return &RetryableError{Err: err}
}

// successEvents are the only gateway events that represent money actually captured.
// Any other event (payment.failed, payment.authorized, refund.*, etc.) must NOT
// mark a transaction as paid.
var successEvents = map[string]bool{
	"payment.captured": true,
	"order.paid":       true,
}

// ProcessWebhook handles a verified callback from the payment gateway.
// The handler is responsible for passing the raw body and signature header.
// BR: Webhook handler always returns 200 to the gateway to prevent retries — caller must handle that.
func (s *Service) ProcessWebhook(ctx context.Context, rawBody []byte, signature string) error {
	// 1. Verify signature (HMAC-SHA256 for Razorpay). Fails closed in production.
	ok, err := s.gateway.VerifyWebhook(rawBody, signature)
	if err != nil || !ok {
		return fmt.Errorf("invalid webhook signature")
	}

	// 2. Parse the normalized event (event type, order_id, amount, status).
	evt, err := parseWebhook(rawBody)
	if err != nil {
		return fmt.Errorf("webhook: could not parse: %w", err)
	}

	// 3. Only act on events that represent captured money. Ignore everything else
	//    (failed/authorized/refund events) so they can never lock a squad.
	if !successEvents[evt.Event] {
		return nil
	}

	// 4. Look up our transaction by the order_id we stored at order creation.
	tx, err := s.repo.GetByGatewayRef(ctx, evt.OrderID)
	if err != nil {
		// Transient lookup failure — let the gateway retry rather than dropping the payment.
		return retryable(err)
	}

	// 5. Verify the paid amount and currency match what we charged. A mismatch
	//    means a tampered/partial payment — never credit it. Comparison is in exact
	//    integer paise.
	expectedPaise := money.ToPaise(tx.Amount)
	if evt.AmountPaise != expectedPaise {
		return fmt.Errorf("webhook: amount mismatch for tx %s: expected %d paise, got %d", tx.ID, expectedPaise, evt.AmountPaise)
	}
	if evt.Currency != "" && !strings.EqualFold(evt.Currency, tx.Currency) {
		return fmt.Errorf("webhook: currency mismatch for tx %s: expected %s, got %s", tx.ID, tx.Currency, evt.Currency)
	}

	// 6. Atomically claim the transaction: flip initiated -> success only if it is
	//    not already success. This is the idempotency boundary — concurrent/replayed
	//    deliveries lose the race and return here without double-crediting.
	gatewayStatus := evt.Status
	if gatewayStatus == "" {
		gatewayStatus = "paid"
	}
	claimed, err := s.repo.MarkSuccessIfPending(ctx, tx.ID, gatewayStatus)
	if err != nil {
		return retryable(err)
	}
	if !claimed {
		return nil // already processed — idempotent
	}

	// 7. A successful token payment locks the squad (FR-6.1 / squad_status: "locked =
	//    token paid"). The full token is charged in a single order and step 5 already
	//    verified the paid amount equals it, so a successful token payment means the
	//    token is fully paid — there is NO separate deposit collection (the property's
	//    deposit_amount is display-only metadata). We record the collected token
	//    (total_deposit_collected is a misnomer that actually holds the token total)
	//    from the authoritative sum of successful token payments, then lock.
	if tx.SquadID != nil && tx.Type == TypeTokenPayment {
		tokenCollected, err := s.repo.GetTotalPaidForSquad(ctx, *tx.SquadID)
		if err != nil {
			return retryable(err)
		}
		if err := s.squadRepo.SetTotalDeposit(ctx, *tx.SquadID, tokenCollected); err != nil {
			return retryable(err)
		}

		// LockSquadIfPending only transitions a not-yet-locked squad, so the success
		// notification fires exactly once even across retried/duplicate webhooks.
		locked, err := s.squadRepo.LockSquadIfPending(ctx, *tx.SquadID)
		if err != nil {
			return retryable(err)
		}
		if locked && s.notifier != nil {
			s.notifier.TokenPaymentSuccess(ctx, tx.UserID, *tx.SquadID, tx.PropertyID)
		}
	}

	return nil
}

// GetTransactionHistory returns all transactions for a user (newest first).
func (s *Service) GetTransactionHistory(ctx context.Context, userID string) ([]*Transaction, error) {
	return s.repo.GetByUserID(ctx, userID)
}

// ConfirmMoveIn is called by the squad leader to confirm the squad has physically moved in.
// It transitions the squad to 'moved_in', marks the property as 'occupied',
// and creates a success_fee transaction record for future landlord payout processing.
func (s *Service) ConfirmMoveIn(ctx context.Context, userID, squadID string) error {
	sq, err := s.squadRepo.GetSquadByID(ctx, squadID)
	if err != nil {
		return err
	}

	// Only the leader can confirm move-in
	if userID != sq.CreatedBy {
		return fmt.Errorf("only the squad leader can confirm move-in")
	}

	// Squad must be locked (token paid) before move-in can be confirmed
	if sq.Status != squad.StatusLocked {
		return fmt.Errorf("squad must be in 'locked' status to confirm move-in (current: %s)", sq.Status)
	}

	if sq.PropertyID == nil {
		return fmt.Errorf("squad has no property associated")
	}

	// 1. Create a success_fee transaction record (for future payout processing)
	successFeeTx := &Transaction{
		SquadID:    &squadID,
		UserID:     userID,
		PropertyID: *sq.PropertyID,
		Type:       TypeSuccessFee,
		Amount:     0, // Amount set when admin processes the payout
		Currency:   "INR",
		Status:     StatusInitiated,
	}
	if err := s.repo.Create(ctx, successFeeTx); err != nil {
		return fmt.Errorf("failed to create success_fee record: %w", err)
	}

	// 2. Transition squad → moved_in
	if err := s.squadRepo.SetStatusMovedIn(ctx, squadID); err != nil {
		return err
	}

	// 3. Mark property → occupied
	if err := s.propertyRepo.SetPropertyOccupied(ctx, *sq.PropertyID); err != nil {
		return err
	}

	// Notify the leader — move-in confirmed
	if s.notifier != nil {
		s.notifier.MoveInConfirmed(ctx, userID, squadID, *sq.PropertyID)
	}

	return nil
}
