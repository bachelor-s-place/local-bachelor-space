package user

import (
	"sync"
	"time"
)

// loginThrottle is an in-memory, per-account failed-login limiter. It mitigates
// credential stuffing even when an attacker rotates source IPs (which would defeat
// the IP-based HTTP rate limiter). After `max` failures within `window`, the account
// is locked out for `lockout`. A successful login resets the counter.
//
// This is per-process state: it protects a single instance. For a multi-instance
// deployment, back it with a shared store (e.g. Redis); the interface stays the same.
type loginThrottle struct {
	mu      sync.Mutex
	records map[string]*attemptRecord
	max     int
	window  time.Duration
	lockout time.Duration
}

type attemptRecord struct {
	count       int
	windowStart time.Time
	lockedUntil time.Time
}

func newLoginThrottle(max int, window, lockout time.Duration) *loginThrottle {
	return &loginThrottle{
		records: make(map[string]*attemptRecord),
		max:     max,
		window:  window,
		lockout: lockout,
	}
}

// locked reports whether the key is currently locked out.
func (t *loginThrottle) locked(key string) bool {
	now := time.Now()
	t.mu.Lock()
	defer t.mu.Unlock()

	r := t.records[key]
	if r == nil {
		return false
	}
	if now.Before(r.lockedUntil) {
		return true
	}
	// Lock expired or never set; drop stale records to bound memory.
	if now.Sub(r.windowStart) > t.window && now.After(r.lockedUntil) {
		delete(t.records, key)
	}
	return false
}

// fail records a failed attempt and locks the key out once it exceeds the limit.
func (t *loginThrottle) fail(key string) {
	now := time.Now()
	t.mu.Lock()
	defer t.mu.Unlock()

	r := t.records[key]
	if r == nil || now.Sub(r.windowStart) > t.window {
		t.records[key] = &attemptRecord{count: 1, windowStart: now}
		return
	}
	r.count++
	if r.count >= t.max {
		r.lockedUntil = now.Add(t.lockout)
		r.count = 0
		r.windowStart = now
	}
}

// reset clears the record after a successful login.
func (t *loginThrottle) reset(key string) {
	t.mu.Lock()
	delete(t.records, key)
	t.mu.Unlock()
}
