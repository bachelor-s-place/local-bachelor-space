package property

import (
	"errors"
	"time"

	"bachelorsSpace/internal/pkg/apierror"
)

const (
	StatusDraft               = "draft"
	StatusPendingVerification = "pending_verification"
	StatusVerified            = "verified"
	StatusOccupied            = "occupied"
	StatusDelisted            = "delisted"
)

// Property represents a rentable unit or PG building.
type Property struct {
	ID              string     `json:"id"`
	OwnerID         string     `json:"owner_id"`
	Title           string     `json:"title"`
	Description     *string    `json:"description,omitempty"`
	PropertyType    string     `json:"property_type"`
	LocationLat     float64    `json:"location_lat"`
	LocationLng     float64    `json:"location_lng"`
	AddressText     *string    `json:"address_text,omitempty"`
	City            *string    `json:"city,omitempty"`
	Locality        *string    `json:"locality,omitempty"`
	RentAmount      *float64   `json:"rent_amount,omitempty"`
	DepositAmount   *float64   `json:"deposit_amount,omitempty"`
	TotalCapacity   *int       `json:"total_capacity,omitempty"`
	LifestyleTags   []string   `json:"lifestyle_tags"`
	ForGender       string     `json:"for_gender"`        // 'male' | 'female' | 'any'
	TokenPercentage float64    `json:"token_percentage"` // 0–15%; token = rent × pct / 100
	Status          string     `json:"status"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// Room represents a rentable room within a PG property.
type Room struct {
	ID               string    `json:"id"`
	PropertyID       string    `json:"property_id"`
	RoomNumber       *string   `json:"room_number,omitempty"`
	RoomType         string    `json:"room_type"`
	Capacity         int       `json:"capacity"`
	CurrentOccupancy int       `json:"current_occupancy"`
	RentAmount       float64   `json:"rent_amount"`
	DepositAmount    *float64  `json:"deposit_amount,omitempty"`
	Status           string    `json:"status"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// CreatePropertyInput validates landlord input.
type CreatePropertyInput struct {
	Title           string   `json:"title"            validate:"required,min=5,max=100"`
	Description     *string  `json:"description"      validate:"omitempty,max=1000"`
	PropertyType    string   `json:"property_type"    validate:"required,oneof=room flat pg studio"`
	LocationLat     float64  `json:"location_lat"     validate:"required,latitude"`
	LocationLng     float64  `json:"location_lng"     validate:"required,longitude"`
	AddressText     *string  `json:"address_text"     validate:"omitempty,max=500"`
	City            *string  `json:"city"             validate:"omitempty,max=100"`
	Locality        *string  `json:"locality"         validate:"omitempty,max=100"`
	RentAmount      *float64 `json:"rent_amount"      validate:"omitempty,min=0"`
	DepositAmount   *float64 `json:"deposit_amount"   validate:"omitempty,min=0"`
	TotalCapacity   *int     `json:"total_capacity"   validate:"omitempty,min=1"`
	LifestyleTags   []string `json:"lifestyle_tags"   validate:"omitempty,max=10,dive,min=2,max=30"`
	ForGender       string   `json:"for_gender"       validate:"required,oneof=male female any"`
	TokenPercentage float64  `json:"token_percentage" validate:"required,min=0,max=15"`
}

// UpdatePropertyInput validates landlord input for updates.
type UpdatePropertyInput struct {
	Title           *string   `json:"title"            validate:"omitempty,min=5,max=100"`
	Description     *string   `json:"description"      validate:"omitempty,max=1000"`
	RentAmount      *float64  `json:"rent_amount"      validate:"omitempty,min=0"`
	DepositAmount   *float64  `json:"deposit_amount"   validate:"omitempty,min=0"`
	TotalCapacity   *int      `json:"total_capacity"   validate:"omitempty,min=1"`
	LifestyleTags   []string  `json:"lifestyle_tags"   validate:"omitempty,max=10,dive,min=2,max=30"`
	ForGender       *string   `json:"for_gender"       validate:"omitempty,oneof=male female any"`
	TokenPercentage *float64  `json:"token_percentage" validate:"omitempty,min=0,max=15"`
}

// CreateRoomInput validates room creation.
type CreateRoomInput struct {
	RoomNumber    *string  `json:"room_number"    validate:"omitempty,max=50"`
	RoomType      string   `json:"room_type"      validate:"required,oneof=single double triple dormitory"`
	Capacity      int      `json:"capacity"       validate:"required,min=1"`
	RentAmount    float64  `json:"rent_amount"    validate:"required,min=0"`
	DepositAmount *float64 `json:"deposit_amount" validate:"omitempty,min=0"`
}

// UpdateRoomInput validates room updates.
type UpdateRoomInput struct {
	RoomNumber    *string  `json:"room_number"    validate:"omitempty,max=50"`
	Capacity      *int     `json:"capacity"       validate:"omitempty,min=1"`
	RentAmount    *float64 `json:"rent_amount"    validate:"omitempty,min=0"`
	DepositAmount *float64 `json:"deposit_amount" validate:"omitempty,min=0"`
	// 'verified' is intentionally excluded: a room becomes verified only through the
	// admin verification pipeline, never by the owner editing the room directly.
	Status        *string  `json:"status"         validate:"omitempty,oneof=draft delisted"`
}

// SearchFilter represents dynamic query params for map search.
type SearchFilter struct {
	Lat       *float64
	Lng       *float64
	RadiusKm  *float64
	City      *string
	Locality  *string
	MinRent   *float64
	MaxRent   *float64
	OwnerID   *string
	ForGender *string // derived from the requesting tenant's gender; nil = no filter
}

var (
	ErrKYCRequired      = errors.New("property: verified KYC required")
	ErrPropertyNotFound = errors.New("property: not found")
	ErrInvalidPGConfig  = errors.New("property: PG types cannot have a property-level rent_amount")
)

// ToAPIError maps domain errors to apierror.APIError.
func ToAPIError(err error) *apierror.APIError {
	switch {
	case errors.Is(err, ErrKYCRequired):
		return apierror.Forbidden("a verified KYC is required to list properties")
	case errors.Is(err, ErrPropertyNotFound):
		return apierror.NotFound("property not found")
	case errors.Is(err, ErrInvalidPGConfig):
		return apierror.BusinessRuleViolation("PG properties must have rent set at the room level, not property level")
	default:
		return apierror.Internal("an unexpected error occurred")
	}
}
