package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Config holds all application configuration loaded from environment variables.
// One instance is created at startup and passed explicitly — no global state.
type Config struct {
	// Server
	Port string
	Env  string

	// CORS — explicit allow-list of browser origins. Comma-separated in
	// CORS_ALLOWED_ORIGINS. Never "*" in production.
	AllowedOrigins []string

	// TrustProxy controls whether the client IP is taken from X-Forwarded-For /
	// X-Real-IP headers (true: only safe behind a trusted load balancer that sets
	// them) or from the raw TCP peer address (false: spoof-proof for direct exposure).
	// Rate limiting keys on this IP, so trusting spoofable headers would let an
	// attacker bypass the limiter by rotating the header. Default: false.
	TrustProxy bool

	// Database
	DatabaseURL string

	// JWT (HS256, stateless — no DB storage for refresh tokens)
	JWTSecret string

	// AES-256 encryption for PII fields (phone, Aadhaar, PAN)
	// Must be a 64-character hex string (= 32 bytes)
	EncryptionKey string

	// Google Maps (geocoding on property creation)
	GoogleMapsAPIKey string

	// Google Sign-In (OAuth)
	GoogleClientID string

	// OpenAI (async personality embedding generation)
	OpenAIAPIKey string

	// Razorpay (wired in Module 8)
	RazorpayKeyID         string
	RazorpayKeySecret     string
	RazorpayWebhookSecret string

	// Payments feature toggle — set to true in production only
	// When false, all payment endpoints return SERVICE_UNAVAILABLE
	PaymentsEnabled bool

	// Email / SMTP (wired in Module 10)
	SMTPHost  string
	SMTPPort  int
	SMTPUser  string
	SMTPPass  string
	EmailFrom string
}

// Load reads environment variables and returns a populated Config.
// Returns an error if any required variable is missing or invalid.
func Load() (*Config, error) {
	smtpPort, err := strconv.Atoi(getEnv("SMTP_PORT", "587"))
	if err != nil {
		return nil, fmt.Errorf("config: SMTP_PORT must be a number: %w", err)
	}

	env := getEnv("ENV", "development")

	cfg := &Config{
		Port:              getEnv("PORT", "8080"),
		Env:               env,
		AllowedOrigins:    parseAllowedOrigins(os.Getenv("CORS_ALLOWED_ORIGINS"), env),
		TrustProxy:        os.Getenv("TRUST_PROXY") == "true",
		DatabaseURL:       os.Getenv("DATABASE_URL"),
		JWTSecret:         os.Getenv("JWT_SECRET"),
		EncryptionKey:     os.Getenv("ENCRYPTION_KEY"),
		GoogleMapsAPIKey:  os.Getenv("GOOGLE_MAPS_API_KEY"),
		GoogleClientID:    os.Getenv("GOOGLE_CLIENT_ID"),
		OpenAIAPIKey:      os.Getenv("OPENAI_API_KEY"),
		RazorpayKeyID:         os.Getenv("RAZORPAY_KEY_ID"),
		RazorpayKeySecret:     os.Getenv("RAZORPAY_KEY_SECRET"),
		RazorpayWebhookSecret: os.Getenv("RAZORPAY_WEBHOOK_SECRET"),
		PaymentsEnabled:       os.Getenv("PAYMENTS_ENABLED") == "true",
		SMTPHost:          os.Getenv("SMTP_HOST"),
		SMTPPort:          smtpPort,
		SMTPUser:          os.Getenv("SMTP_USER"),
		SMTPPass:          os.Getenv("SMTP_PASS"),
		EmailFrom:         getEnv("EMAIL_FROM", "noreply@bachelorsspace.in"),
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// IsProduction returns true when running in production mode.
func (c *Config) IsProduction() bool {
	return c.Env == "production"
}

// validate checks that all required config values are present and valid.
func (c *Config) validate() error {
	required := map[string]string{
		"DATABASE_URL":   c.DatabaseURL,
		"JWT_SECRET":     c.JWTSecret,
		"ENCRYPTION_KEY": c.EncryptionKey,
	}
	for key, val := range required {
		if val == "" {
			return fmt.Errorf("config: required environment variable %q is not set", key)
		}
	}
	if len(c.EncryptionKey) != 64 {
		return fmt.Errorf("config: ENCRYPTION_KEY must be 64 hex characters (32 bytes), got %d", len(c.EncryptionKey))
	}
	return nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// parseAllowedOrigins splits a comma-separated origin list. When unset, it falls
// back to the local dev frontend in non-production environments and to an empty
// (deny cross-origin) list in production, so a missing config never opens a wildcard.
func parseAllowedOrigins(raw, env string) []string {
	if strings.TrimSpace(raw) == "" {
		if env == "production" {
			return nil
		}
		return []string{"http://localhost:3000"}
	}
	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			origins = append(origins, p)
		}
	}
	return origins
}
