package payment

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"time"
)

const razorpayOrdersURL = "https://api.razorpay.com/v1/orders"

// RazorpayGateway implements Gateway using the Razorpay REST API.
// No external SDK — uses raw HTTP + standard library only.
type RazorpayGateway struct {
	keyID         string
	keySecret     string
	webhookSecret string
	httpClient    *http.Client

	// allowInsecureWebhook permits skipping signature verification when no
	// webhook secret is configured. This must ONLY be true in local development.
	allowInsecureWebhook bool
}

// NewRazorpayGateway creates a production-ready Razorpay gateway.
// allowInsecureWebhook should be set to !cfg.IsProduction(): when true and no
// webhook secret is configured, signature verification is skipped (dev only).
// In production it MUST be false so that unsigned webhooks are rejected.
func NewRazorpayGateway(keyID, keySecret, webhookSecret string, allowInsecureWebhook bool) *RazorpayGateway {
	return &RazorpayGateway{
		keyID:                keyID,
		keySecret:            keySecret,
		webhookSecret:        webhookSecret,
		httpClient:           &http.Client{Timeout: 15 * time.Second},
		allowInsecureWebhook: allowInsecureWebhook,
	}
}

func (g *RazorpayGateway) GatewayName() string {
	return "razorpay"
}

// CreateOrder calls POST /v1/orders and returns a Razorpay order.
// Amount is converted from INR (float64) to paise (int64) as Razorpay requires.
func (g *RazorpayGateway) CreateOrder(ctx context.Context, amount float64, currency string, metadata map[string]string) (*Order, error) {
	// Razorpay requires amount in smallest currency unit (paise for INR)
	amountInPaise := int64(math.Round(amount * 100))

	receiptID := metadata["transaction_id"]
	if len(receiptID) > 40 {
		receiptID = receiptID[:40] // Razorpay receipt max length is 40
	}

	payload := map[string]interface{}{
		"amount":   amountInPaise,
		"currency": currency,
		"receipt":  receiptID,
		"notes":    metadata,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("razorpay: failed to marshal order payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, razorpayOrdersURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("razorpay: failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth(g.keyID, g.keySecret)

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("razorpay: HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("razorpay: failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("razorpay: API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		ID       string `json:"id"`
		Amount   int64  `json:"amount"`
		Currency string `json:"currency"`
		Status   string `json:"status"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("razorpay: failed to parse response: %w", err)
	}

	return &Order{
		ID:       result.ID,
		Amount:   float64(result.Amount) / 100, // convert back to INR
		Currency: result.Currency,
		Status:   result.Status,
		KeyID:    g.keyID, // returned so frontend can open Razorpay checkout
		MetaData: metadata,
	}, nil
}

// VerifyWebhook validates the X-Razorpay-Signature header using HMAC-SHA256.
// Razorpay signs the raw request body with the webhook secret.
// See: https://razorpay.com/docs/webhooks/validate-test/
//
// Fail-closed: if no webhook secret is configured, the webhook is rejected
// UNLESS allowInsecureWebhook is set (local development only). Never trust an
// unsigned webhook in production — doing so lets anyone mark a payment as captured.
func (g *RazorpayGateway) VerifyWebhook(payload []byte, signature string) (bool, error) {
	if g.webhookSecret == "" {
		if g.allowInsecureWebhook {
			// Local dev only: no secret configured, signature checks skipped.
			return true, nil
		}
		return false, fmt.Errorf("razorpay: webhook secret not configured; refusing to process unsigned webhook")
	}

	if signature == "" {
		return false, nil
	}

	mac := hmac.New(sha256.New, []byte(g.webhookSecret))
	mac.Write(payload)
	expected := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(expected), []byte(signature)) {
		return false, nil
	}
	return true, nil
}
