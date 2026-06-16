package user

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/api/idtoken"
)

const (
	accessTokenDuration  = 24 * time.Hour
	refreshTokenDuration = 7 * 24 * time.Hour
	bcryptCost           = 12
)

// Repository defines the database operations required by the user Service.
// Implemented by *repository.UserRepo — the service depends on this interface,
// not the concrete type, keeping the domain layer decoupled from the DB layer.
type Repository interface {
	CreateUser(ctx context.Context, u *User) (string, error)
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	GetUserByID(ctx context.Context, id string) (*User, error)
	UpdateProfile(ctx context.Context, userID string, input UpdateProfileInput) error
}

// Service handles all user and authentication business logic.
type Service struct {
	repo           Repository
	jwtSecret      []byte
	googleClientID string
	loginThrottle  *loginThrottle
}

func NewService(repo Repository, jwtSecret, googleClientID string) *Service {
	return &Service{
		repo:           repo,
		jwtSecret:      []byte(jwtSecret),
		googleClientID: googleClientID,
		// Lock an account after 5 failed logins within 15 minutes, for 15 minutes.
		loginThrottle: newLoginThrottle(5, 15*time.Minute, 15*time.Minute),
	}
}

// Register creates a new tenant or landlord account.
// BR-02: admin registration via this endpoint is forbidden.
func (s *Service) Register(ctx context.Context, input RegisterInput) (*RegisterResponse, error) {
	if input.Role == RoleAdmin {
		return nil, ErrInvalidRole
	}

	// Tenants must declare a gender so they can be placed in single-gender squads.
	if input.Role == RoleTenant && (input.Gender == nil || *input.Gender == "") {
		return nil, ErrGenderRequired
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcryptCost)
	if err != nil {
		return nil, fmt.Errorf("user service: failed to hash password: %w", err)
	}

	u := &User{
		Name:                input.Name,
		Email:               input.Email,
		PasswordHash:        string(hash),
		Role:                input.Role,
		Gender:              input.Gender,
		LifestyleTags:       []string{},
		PreferredLocalities: []string{},
	}

	id, err := s.repo.CreateUser(ctx, u)
	if err != nil {
		return nil, err // ErrEmailAlreadyExists bubbles up as-is
	}

	return &RegisterResponse{UserID: id, Role: input.Role}, nil
}

// Login validates credentials and returns an access + refresh token pair.
// Email enumeration is avoided: ErrUserNotFound is mapped to ErrInvalidCredentials.
func (s *Service) Login(ctx context.Context, input LoginInput) (*AuthResponse, error) {
	// Per-account lockout: blocks credential stuffing even if the attacker rotates IPs.
	key := strings.ToLower(strings.TrimSpace(input.Email))
	if s.loginThrottle.locked(key) {
		return nil, ErrTooManyAttempts
	}

	u, err := s.repo.GetUserByEmail(ctx, input.Email)
	if err != nil {
		// Do NOT distinguish "no user" from "wrong password" — prevents email enumeration
		s.loginThrottle.fail(key)
		return nil, ErrInvalidCredentials
	}

	if !u.IsActive {
		return nil, ErrAccountInactive
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(input.Password)); err != nil {
		s.loginThrottle.fail(key)
		return nil, ErrInvalidCredentials
	}

	s.loginThrottle.reset(key)
	return s.generateTokenPair(u.ID, u.Role)
}

// LoginWithGoogle validates a Google ID token, finds or creates the user, and returns a token pair.
func (s *Service) LoginWithGoogle(ctx context.Context, input GoogleLoginInput) (*AuthResponse, error) {
	// Verify Google Token
	payload, err := idtoken.Validate(ctx, input.IDToken, s.googleClientID)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	email, ok := payload.Claims["email"].(string)
	if !ok {
		return nil, fmt.Errorf("user service: email not found in google token")
	}
	name, _ := payload.Claims["name"].(string)

	u, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		// User doesn't exist — create a new one.
		// Use provided role if valid; otherwise default to tenant.
		role := RoleTenant
		if input.Role == RoleLandlord {
			role = RoleLandlord
		}

		// Generate random password hash since they won't use password login
		hash, _ := bcrypt.GenerateFromPassword([]byte(email+name+time.Now().String()), bcryptCost)

		u = &User{
			Name:                name,
			Email:               email,
			PasswordHash:        string(hash),
			Role:                role,
			LifestyleTags:       []string{},
			PreferredLocalities: []string{},
		}

		id, createErr := s.repo.CreateUser(ctx, u)
		if createErr != nil {
			return nil, createErr
		}
		u.ID = id
		u.Role = role
		u.IsActive = true
	}

	if !u.IsActive {
		return nil, ErrAccountInactive
	}

	return s.generateTokenPair(u.ID, u.Role)
}


// RefreshToken validates a refresh JWT and issues a new access + refresh token pair.
// It reloads the user from the database so that a deactivated account or a changed
// role cannot keep minting access tokens off a still-valid (7-day) refresh token,
// and so the new tokens always carry the user's CURRENT role — not the token's stale one.
func (s *Service) RefreshToken(ctx context.Context, input RefreshInput) (*AuthResponse, error) {
	claims, err := s.parseToken(input.RefreshToken, "refresh")
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	u, err := s.repo.GetUserByID(ctx, claims.userID)
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	if !u.IsActive {
		return nil, ErrAccountInactive
	}

	return s.generateTokenPair(u.ID, u.Role)
}

// GetUserByID is exposed for use by other domain services and handlers.
func (s *Service) GetUserByID(ctx context.Context, id string) (*User, error) {
	return s.repo.GetUserByID(ctx, id)
}

// UpdateProfile updates the user's lifestyle profile and triggers background embedding generation.
func (s *Service) UpdateProfile(ctx context.Context, userID string, input UpdateProfileInput) error {
	// Let repo handle setting pending_embeddings = TRUE
	return s.repo.UpdateProfile(ctx, userID, input)
}

// --- private helpers --------------------------------------------------------

func (s *Service) generateTokenPair(userID, role string) (*AuthResponse, error) {
	accessToken, err := s.signToken(userID, role, "access", accessTokenDuration)
	if err != nil {
		return nil, fmt.Errorf("user service: failed to sign access token: %w", err)
	}
	refreshToken, err := s.signToken(userID, role, "refresh", refreshTokenDuration)
	if err != nil {
		return nil, fmt.Errorf("user service: failed to sign refresh token: %w", err)
	}
	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int(accessTokenDuration.Seconds()),
		Role:         role,
	}, nil
}

func (s *Service) signToken(userID, role, tokenType string, duration time.Duration) (string, error) {
	claims := jwt.MapClaims{
		"user_id":    userID,
		"role":       role,
		"token_type": tokenType, // "access" | "refresh" — prevents token misuse
		"exp":        time.Now().Add(duration).Unix(),
		"iat":        time.Now().Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.jwtSecret)
}

type parsedClaims struct {
	userID string
	role   string
}

func (s *Service) parseToken(tokenStr, expectedType string) (*parsedClaims, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return s.jwtSecret, nil
	}, jwt.WithValidMethods([]string{"HS256"}), jwt.WithExpirationRequired())
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid or expired token")
	}

	mc, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims format")
	}
	if tt, _ := mc["token_type"].(string); tt != expectedType {
		return nil, fmt.Errorf("wrong token type: expected %s", expectedType)
	}

	// Use safe type assertions — a malformed token must not panic the request.
	userID, _ := mc["user_id"].(string)
	role, _ := mc["role"].(string)
	if userID == "" {
		return nil, fmt.Errorf("invalid token claims: missing user_id")
	}

	return &parsedClaims{
		userID: userID,
		role:   role,
	}, nil
}
