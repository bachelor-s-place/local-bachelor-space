// Package user contains the User domain model, input types, domain errors,
// and the error-to-APIError mapping function.
// No database imports belong in this package.
package user

import (
	"errors"
	"time"

	"bachelorsSpace/internal/pkg/apierror"
)

// Role constants mirror the user_role ENUM defined in the database schema.
const (
	RoleTenant   = "tenant"
	RoleLandlord = "landlord"
	RoleAdmin    = "admin"
)

// User represents a platform user as stored in the database.
// Fields tagged json:"-" are never serialised into API responses.
type User struct {
	ID                  string     `json:"id"`
	Name                string     `json:"name"`
	Email               string     `json:"email"`
	PasswordHash        string     `json:"-"` // bcrypt hash — never expose
	PhoneEncrypted      *string    `json:"-"` // AES-256 — never expose raw
	Role                string     `json:"role"`
	Gender              *string    `json:"gender,omitempty"` // 'male' | 'female' | 'prefer_not_to_say' | nil
	LifestyleTags       []string   `json:"lifestyle_tags"`
	Bio                 *string    `json:"bio,omitempty"`
	BudgetMin           *float64   `json:"budget_min,omitempty"`
	BudgetMax           *float64   `json:"budget_max,omitempty"`
	PreferredLocalities []string   `json:"preferred_localities"`
	PendingEmbeddings   bool       `json:"-"`
	IsActive            bool       `json:"is_active"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
	DeletedAt           *time.Time `json:"-"`
}

// UpdateProfileInput is the validated request body for PUT /api/v1/users/me/profile.
type UpdateProfileInput struct {
	Gender              *string  `json:"gender,omitempty"       validate:"omitempty,oneof=male female prefer_not_to_say"`
	LifestyleTags       []string `json:"lifestyle_tags"         validate:"max=10,dive,min=2,max=30"`
	Bio                 *string  `json:"bio,omitempty"          validate:"omitempty,max=500"`
	BudgetMin           *float64 `json:"budget_min,omitempty"   validate:"omitempty,min=0"`
	BudgetMax           *float64 `json:"budget_max,omitempty"   validate:"omitempty,min=0,gtefield=BudgetMin"`
	PreferredLocalities []string `json:"preferred_localities"   validate:"max=5,dive,min=2,max=100"`
}

// RegisterInput is the validated request body for POST /api/v1/auth/register.
type RegisterInput struct {
	Name     string  `json:"name"     validate:"required,min=2,max=100"`
	Email    string  `json:"email"    validate:"required,email"`
	Password string  `json:"password" validate:"required,min=8"`
	// Gender is mandatory for tenants (required for single-gender squad matching),
	// optional for landlords.
	Gender   *string `json:"gender"   validate:"required_if=Role tenant,oneof=male female prefer_not_to_say"`
	// BR-02: role cannot be admin via self-registration
	Role string `json:"role" validate:"required,oneof=tenant landlord"`
}

// LoginInput is the validated request body for POST /api/v1/auth/login.
type LoginInput struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// RefreshInput is the validated request body for POST /api/v1/auth/refresh.
type RefreshInput struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// GoogleLoginInput is the validated request body for POST /api/v1/auth/google.
type GoogleLoginInput struct {
	IDToken string `json:"id_token" validate:"required"`
	// Role is optional — used only when creating a new user via Google OAuth.
	// If omitted, defaults to 'tenant'. Ignored for existing users.
	Role string `json:"role" validate:"omitempty,oneof=tenant landlord"`
}

// AuthResponse is returned by the login and refresh endpoints.
type AuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"` // seconds until access token expires
	Role         string `json:"role"`
}

// RegisterResponse is returned after a successful registration.
type RegisterResponse struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

// Domain errors. The service layer returns these; handlers must not inspect
// DB errors directly. ToAPIError maps them to HTTP-aware apierror types.
var (
	ErrEmailAlreadyExists = errors.New("user: email already registered")
	ErrInvalidCredentials = errors.New("user: invalid email or password")
	ErrUserNotFound       = errors.New("user: user not found")
	ErrAccountInactive    = errors.New("user: account is inactive")
	ErrInvalidRole        = errors.New("user: role must be tenant or landlord")
	ErrTooManyAttempts    = errors.New("user: too many failed login attempts")
	ErrGenderRequired     = errors.New("user: gender is required for tenants")
)

// ToAPIError maps domain errors to apierror types for handler use.
// Any unrecognised error falls back to 500 Internal Server Error.
func ToAPIError(err error) *apierror.APIError {
	switch {
	case errors.Is(err, ErrEmailAlreadyExists):
		return apierror.Conflict("an account with this email address already exists")
	case errors.Is(err, ErrInvalidCredentials):
		return apierror.Unauthorized("invalid email or password")
	case errors.Is(err, ErrUserNotFound):
		return apierror.NotFound("user not found")
	case errors.Is(err, ErrAccountInactive):
		return apierror.Forbidden("this account has been deactivated")
	case errors.Is(err, ErrInvalidRole):
		return apierror.ValidationError("role must be tenant or landlord")
	case errors.Is(err, ErrGenderRequired):
		return apierror.ValidationError("gender is required for tenants")
	case errors.Is(err, ErrTooManyAttempts):
		return apierror.TooManyRequests("too many failed login attempts; please try again later")
	default:
		return apierror.Internal("an unexpected error occurred")
	}
}
