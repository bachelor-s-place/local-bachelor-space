package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"bachelorsSpace/internal/domain/transaction"
	"bachelorsSpace/internal/middleware"
	"bachelorsSpace/internal/pkg/apierror"
	"bachelorsSpace/internal/pkg/respond"

	"github.com/go-chi/chi/v5"
)

type TransactionHandler struct {
	service   *transaction.Service
	jwtSecret string
}

func NewTransactionHandler(service *transaction.Service, jwtSecret string) *TransactionHandler {
	return &TransactionHandler{service: service, jwtSecret: jwtSecret}
}

func (h *TransactionHandler) Routes() chi.Router {
	r := chi.NewRouter()

	// Authenticated routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(h.jwtSecret))
		r.Post("/squads/{squadId}/pay-token", h.PayToken)
		r.Post("/squads/{squadId}/move-in", h.MoveIn)
		r.Get("/history", h.GetHistory)
	})

	// Public webhook endpoint — called by Razorpay, no JWT
	// IMPORTANT: Must read raw body for signature verification
	r.Post("/webhook", h.HandleWebhook)

	return r
}

// PayToken handles POST /api/v1/payments/squads/{squadId}/pay-token
// Initiates a Razorpay order and returns the order details for frontend checkout.
// The squad leader selects the payment model (leader_pays_all | split_evenly) in the request body.
// For PG properties, room_id must also be provided to calculate the token from the room's rent.
func (h *TransactionHandler) PayToken(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	squadID := chi.URLParam(r, "squadId")

	var input transaction.PayTokenInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respond.Error(w, apierror.ValidationError("invalid JSON body"))
		return
	}
	if input.PaymentModel == "" {
		respond.Error(w, apierror.ValidationError("payment_model is required (leader_pays_all or split_evenly)"))
		return
	}

	tx, order, err := h.service.InitiateTokenPayment(r.Context(), userID, squadID, input)
	if err != nil {
		respond.Error(w, apierror.Internal(err.Error()))
		return
	}

	respond.JSON(w, http.StatusCreated, map[string]interface{}{
		"transaction":   tx,
		"gateway_order": order,
		"checkout_info": map[string]interface{}{
			"key_id":      order.KeyID,
			"order_id":    order.ID,
			"amount":      order.Amount,
			"currency":    order.Currency,
			"name":        "BachelorsSpace",
			"description": "Property Token Payment",
		},
	})
}

// HandleWebhook handles POST /api/v1/payments/webhook
// Called by Razorpay — reads raw body for HMAC-SHA256 signature validation.
// Per Razorpay docs: always return 200 even on internal errors to prevent retries.
func (h *TransactionHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	// Read raw body FIRST — needed for signature verification
	rawBody, err := io.ReadAll(r.Body)
	if err != nil {
		respond.JSON(w, http.StatusOK, map[string]string{"status": "error", "message": "could not read body"})
		return
	}

	// Razorpay sends signature in this header
	signature := r.Header.Get("X-Razorpay-Signature")

	if err := h.service.ProcessWebhook(r.Context(), rawBody, signature); err != nil {
		// Transient failures (DB errors during a real capture) return 500 so the
		// gateway retries and the payment isn't silently lost. Permanent failures
		// (bad signature, amount mismatch) return 200 to stop pointless retries.
		var retryErr *transaction.RetryableError
		if errors.As(err, &retryErr) {
			respond.JSON(w, http.StatusInternalServerError, map[string]string{"status": "error", "message": "temporary error, please retry"})
			return
		}
		respond.JSON(w, http.StatusOK, map[string]string{"status": "error", "message": err.Error()})
		return
	}

	respond.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// GetHistory handles GET /api/v1/payments/history
// Returns the authenticated user's transaction history.
func (h *TransactionHandler) GetHistory(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())

	txs, err := h.service.GetTransactionHistory(r.Context(), userID)
	if err != nil {
		respond.Error(w, apierror.Internal(err.Error()))
		return
	}

	if txs == nil {
		txs = []*transaction.Transaction{} // return empty array not null
	}

	respond.JSON(w, http.StatusOK, map[string]interface{}{
		"transactions": txs,
		"count":        len(txs),
	})
}

// MoveIn handles POST /api/v1/payments/squads/{squadId}/move-in
// Confirms the squad has moved in: squad → moved_in, property → occupied, success_fee recorded.
func (h *TransactionHandler) MoveIn(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	squadID := chi.URLParam(r, "squadId")

	if err := h.service.ConfirmMoveIn(r.Context(), userID, squadID); err != nil {
		respond.Error(w, apierror.Internal(err.Error()))
		return
	}

	respond.JSON(w, http.StatusOK, map[string]interface{}{
		"message":  "move-in confirmed successfully",
		"squad_id": squadID,
		"status":   "moved_in",
	})
}
