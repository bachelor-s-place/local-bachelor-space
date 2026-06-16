package middleware

import (
	"net/http"
	"time"

	"github.com/go-chi/httprate"
)

// RateLimit returns a middleware that limits the number of requests per window.
// It uses the requester's IP address as the identifier.
func RateLimit(requests int, window time.Duration) func(http.Handler) http.Handler {
	return httprate.LimitByIP(requests, window)
}
