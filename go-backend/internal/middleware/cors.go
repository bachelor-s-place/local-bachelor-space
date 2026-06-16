package middleware

import (
	"net/http"
	"strings"
)

// CORS returns a middleware that sets CORS headers based on an explicit allow-list.
// Only origins present in allowedOrigins receive CORS headers; a request from any
// other origin gets no Access-Control-Allow-Origin and is blocked by the browser.
//
// Passing a list containing "*" allows all origins (development only). In production
// the allow-list must enumerate the exact frontend origins — never "*", because this
// is a bearer-token API and a wildcard lets any site issue authenticated requests.
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	allowAll := false
	allowed := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		o = strings.TrimSpace(o)
		if o == "*" {
			allowAll = true
		}
		if o != "" {
			allowed[o] = true
		}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" && (allowAll || allowed[origin]) {
				if allowAll {
					w.Header().Set("Access-Control-Allow-Origin", "*")
				} else {
					// Echo the specific allowed origin and vary on it for correct caching.
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Add("Vary", "Origin")
				}
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-Id")
				w.Header().Set("Access-Control-Max-Age", "86400")
			}

			// Handle preflight requests and stop the chain.
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
