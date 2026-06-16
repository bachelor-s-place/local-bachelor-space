package payment

import (
	"context"
	"fmt"
	"time"
)

// DisabledGateway is used when PAYMENTS_ENABLED=false.
// CreateOrder returns a synthetic mock order so the full payment flow can be
// exercised in development without real Razorpay credentials.
type DisabledGateway struct{}

func NewDisabledGateway() *DisabledGateway {
	return &DisabledGateway{}
}

func (g *DisabledGateway) GatewayName() string {
	return "razorpay" // keeps DB enum valid
}

func (g *DisabledGateway) CreateOrder(_ context.Context, amount float64, currency string, metadata map[string]string) (*Order, error) {
	// Return a fake order so the backend responds with 200 and the frontend
	// can exercise the Razorpay mock path (shows alert + redirects to squad page).
	mockID := fmt.Sprintf("mock_order_%d", time.Now().UnixMilli())
	return &Order{
		ID:       mockID,
		Amount:   amount,
		Currency: currency,
	}, nil
}

func (g *DisabledGateway) VerifyWebhook(_ []byte, _ string) (bool, error) {
	return false, fmt.Errorf("payments are currently disabled")
}

