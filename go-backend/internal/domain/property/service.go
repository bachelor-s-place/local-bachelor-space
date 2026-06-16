package property

import (
	"context"

	"bachelorsSpace/internal/domain/kyc"
	"bachelorsSpace/internal/domain/user"
	"bachelorsSpace/internal/pkg/apierror"
)

// Repository manages database interaction for properties.
type Repository interface {
	CreateProperty(ctx context.Context, p *Property) (string, error)
	GetPropertyByID(ctx context.Context, id string) (*Property, error)
	SearchProperties(ctx context.Context, filter SearchFilter) ([]Property, error)
	UpdateStatus(ctx context.Context, id string, status string) error
	UpdateProperty(ctx context.Context, p *Property) error
	CreateRoom(ctx context.Context, r *Room) (string, error)
	GetRoomsByProperty(ctx context.Context, propertyID string) ([]Room, error)
	UpdateRoom(ctx context.Context, r *Room) error
	GetRoomByID(ctx context.Context, roomID string) (*Room, error)
}

// Service handles property business logic.
type Service struct {
	repo     Repository
	kycRepo  kyc.Repository
	userRepo user.Repository
}

// NewService creates a new Property Service.
func NewService(repo Repository, kycRepo kyc.Repository, userRepo user.Repository) *Service {
	return &Service{
		repo:     repo,
		kycRepo:  kycRepo,
		userRepo: userRepo,
	}
}

// CreateProperty ensures the landlord has verified KYC before saving the listing.
func (s *Service) CreateProperty(ctx context.Context, ownerID string, input CreatePropertyInput) (string, error) {
	// BR-03: Landlord must have verified KYC to list
	k, err := s.kycRepo.GetKYCByUserID(ctx, ownerID)
	if err != nil {
		if err == kyc.ErrKYCNotFound {
			return "", ErrKYCRequired
		}
		return "", err
	}
	if k.Status != kyc.StatusVerified {
		return "", ErrKYCRequired
	}

	// BR: PG types cannot have a rent amount at the property level.
	if input.PropertyType == "pg" && input.RentAmount != nil {
		return "", ErrInvalidPGConfig
	}

	if input.LifestyleTags == nil {
		input.LifestyleTags = []string{}
	}

	p := &Property{
		OwnerID:         ownerID,
		Title:           input.Title,
		Description:     input.Description,
		PropertyType:    input.PropertyType,
		LocationLat:     input.LocationLat,
		LocationLng:     input.LocationLng,
		AddressText:     input.AddressText,
		City:            input.City,
		Locality:        input.Locality,
		RentAmount:      input.RentAmount,
		DepositAmount:   input.DepositAmount,
		TotalCapacity:   input.TotalCapacity,
		LifestyleTags:   input.LifestyleTags,
		ForGender:       input.ForGender,
		TokenPercentage: input.TokenPercentage,
		Status:          StatusDraft, // Starts as draft until explicitly published or verified
	}

	return s.repo.CreateProperty(ctx, p)
}

// GetProperty retrieves a single property by ID.
func (s *Service) GetProperty(ctx context.Context, id string) (*Property, error) {
	return s.repo.GetPropertyByID(ctx, id)
}

// SearchProperties performs a dynamic map-based search.
//
// Gender segregation: when viewerID is set and the filter does not already pin a
// gender, the allowed listings are derived from the viewer's declared gender so a
// tenant never sees listings restricted to another gender. Pass an empty viewerID
// to skip this (e.g. a landlord viewing their own listings by owner_id).
func (s *Service) SearchProperties(ctx context.Context, viewerID string, filter SearchFilter) ([]Property, error) {
	if viewerID != "" && filter.ForGender == nil {
		if u, err := s.userRepo.GetUserByID(ctx, viewerID); err == nil && u.Gender != nil {
			filter.ForGender = u.Gender
		}
	}
	return s.repo.SearchProperties(ctx, filter)
}

// UpdateProperty updates an existing property. Only the owner can update.
func (s *Service) UpdateProperty(ctx context.Context, ownerID string, id string, input UpdatePropertyInput) error {
	p, err := s.repo.GetPropertyByID(ctx, id)
	if err != nil {
		return err
	}
	if p.OwnerID != ownerID {
		return apierror.Forbidden("only the owner can update this property")
	}

	if input.Title != nil {
		p.Title = *input.Title
	}
	if input.Description != nil {
		p.Description = input.Description
	}
	if input.RentAmount != nil {
		if p.PropertyType == "pg" {
			return ErrInvalidPGConfig
		}
		p.RentAmount = input.RentAmount
	}
	if input.DepositAmount != nil {
		p.DepositAmount = input.DepositAmount
	}
	if input.TotalCapacity != nil {
		p.TotalCapacity = input.TotalCapacity
	}
	if input.LifestyleTags != nil {
		p.LifestyleTags = input.LifestyleTags
	}
	if input.ForGender != nil {
		p.ForGender = *input.ForGender
	}
	if input.TokenPercentage != nil {
		p.TokenPercentage = *input.TokenPercentage
	}

	return s.repo.UpdateProperty(ctx, p)
}

// CreateRoom adds a room to a PG property.
func (s *Service) CreateRoom(ctx context.Context, ownerID string, propertyID string, input CreateRoomInput) (string, error) {
	p, err := s.repo.GetPropertyByID(ctx, propertyID)
	if err != nil {
		return "", err
	}
	if p.OwnerID != ownerID {
		return "", apierror.Forbidden("only the owner can add rooms")
	}
	if p.PropertyType != "pg" {
		return "", apierror.BusinessRuleViolation("rooms can only be added to PG properties")
	}

	room := &Room{
		PropertyID:    propertyID,
		RoomNumber:    input.RoomNumber,
		RoomType:      input.RoomType,
		Capacity:      input.Capacity,
		RentAmount:    input.RentAmount,
		DepositAmount: input.DepositAmount,
		Status:        StatusDraft,
	}

	return s.repo.CreateRoom(ctx, room)
}

// GetRoomsByProperty fetches all rooms for a property.
func (s *Service) GetRoomsByProperty(ctx context.Context, propertyID string) ([]Room, error) {
	return s.repo.GetRoomsByProperty(ctx, propertyID)
}

// UpdateRoom updates a specific room.
func (s *Service) UpdateRoom(ctx context.Context, ownerID string, roomID string, input UpdateRoomInput) error {
	r, err := s.repo.GetRoomByID(ctx, roomID)
	if err != nil {
		return err
	}
	
	// Check ownership
	p, err := s.repo.GetPropertyByID(ctx, r.PropertyID)
	if err != nil {
		return err
	}
	if p.OwnerID != ownerID {
		return apierror.Forbidden("only the owner can update rooms")
	}

	if input.RoomNumber != nil {
		r.RoomNumber = input.RoomNumber
	}
	if input.Capacity != nil {
		if *input.Capacity < r.CurrentOccupancy {
			return apierror.BusinessRuleViolation("capacity cannot be less than current occupancy")
		}
		r.Capacity = *input.Capacity
	}
	if input.RentAmount != nil {
		r.RentAmount = *input.RentAmount
	}
	if input.DepositAmount != nil {
		r.DepositAmount = input.DepositAmount
	}
	if input.Status != nil {
		// Guard (defense-in-depth alongside input validation): the owner can never
		// promote a room to 'verified' directly — that only happens via verification.
		if *input.Status == StatusVerified {
			return apierror.Forbidden("rooms can only be verified through the verification process")
		}
		r.Status = *input.Status
	}

	return s.repo.UpdateRoom(ctx, r)
}
