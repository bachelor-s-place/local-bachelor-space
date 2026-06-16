package transaction

import (
	"encoding/json"
	"fmt"
)

// razorpayWebhookPayload is the structure of a Razorpay webhook body.
// Razorpay sends: {"entity":"event","event":"payment.captured","payload":{"payment":{"entity":{...}}}}
type razorpayWebhookPayload struct {
	Event   string `json:"event"`
	Payload struct {
		Payment struct {
			Entity struct {
				ID       string `json:"id"`
				OrderID  string `json:"order_id"`
				Amount   int64  `json:"amount"` // in the smallest currency unit (paise for INR)
				Currency string `json:"currency"`
				Status   string `json:"status"`
			} `json:"entity"`
		} `json:"payment"`
	} `json:"payload"`
}

// webhookEvent is the parsed, normalized view of a gateway webhook the service acts on.
type webhookEvent struct {
	Event       string // e.g. "payment.captured", "payment.failed"
	OrderID     string // stored as our gateway_reference_id
	PaymentID   string
	AmountPaise int64  // amount actually paid, in paise
	Currency    string
	Status      string // payment entity status, e.g. "captured"
}

// parseWebhook parses the raw Razorpay webhook body into a normalized event.
// It validates that the essential fields needed to match and verify a payment
// (event, order_id) are present.
func parseWebhook(body []byte) (*webhookEvent, error) {
	var p razorpayWebhookPayload
	if err := json.Unmarshal(body, &p); err != nil {
		return nil, fmt.Errorf("could not parse webhook body: %w", err)
	}

	e := &webhookEvent{
		Event:       p.Event,
		OrderID:     p.Payload.Payment.Entity.OrderID,
		PaymentID:   p.Payload.Payment.Entity.ID,
		AmountPaise: p.Payload.Payment.Entity.Amount,
		Currency:    p.Payload.Payment.Entity.Currency,
		Status:      p.Payload.Payment.Entity.Status,
	}

	if e.Event == "" {
		return nil, fmt.Errorf("webhook: missing event type")
	}
	if e.OrderID == "" {
		return nil, fmt.Errorf("webhook: order_id not found in payload")
	}
	return e, nil
}
