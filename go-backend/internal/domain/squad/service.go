package squad

import (
	"context"
	"errors"
	"net/http"

	"bachelorsSpace/internal/pkg/apierror"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// RegisterLookup starts (or refreshes) a matching intent for a tenant.
func (s *Service) RegisterLookup(ctx context.Context, lookup *SquadLookup) (string, error) {
	// If the user already has an active lookup, update it with the newly submitted
	// criteria instead of silently discarding them and returning the stale lookup.
	existing, err := s.repo.GetActiveLookup(ctx, lookup.UserID)
	if err == nil && existing != nil {
		if err := s.repo.UpdateActiveLookup(ctx, lookup); err != nil {
			return "", apierror.Internal("failed to update lookup")
		}
		return existing.ID, nil
	}

	id, err := s.repo.CreateLookup(ctx, lookup)
	if err != nil {
		return "", apierror.Internal("failed to register lookup")
	}
	return id, nil
}

func (s *Service) GetActiveLookup(ctx context.Context, userID string) (*SquadLookup, error) {
	lookup, err := s.repo.GetActiveLookup(ctx, userID)
	if err != nil {
		if err == ErrLookupNotFound {
			return nil, apierror.New(http.StatusNotFound, "NOT_FOUND", "no active lookup found")
		}
		return nil, apierror.Internal("failed to get active lookup")
	}
	return lookup, nil
}

func (s *Service) GetMatches(ctx context.Context, userID string, page, perPage int) ([]MatchResult, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 50 {
		perPage = 10
	}
	offset := (page - 1) * perPage

	matches, err := s.repo.FindMatches(ctx, userID, perPage, offset)
	if err != nil {
		return nil, apierror.Internal("failed to fetch matches")
	}
	return matches, nil
}

func (s *Service) CreateSquad(ctx context.Context, name string, leaderID string, propertyID, roomID *string, paymentModel PaymentModel) (string, error) {
	if paymentModel == "" {
		paymentModel = PaymentModelLeaderPaysAll
	}

	newSquad := &Squad{
		Name:         name,
		Status:       StatusBrowsing,
		PaymentModel: paymentModel,
		MaxSize:      5,
		CreatedBy:    leaderID,
		PropertyID:   propertyID,
		RoomID:       roomID,
	}

	if propertyID != nil {
		newSquad.Status = StatusForming
	}

	id, err := s.repo.CreateSquad(ctx, newSquad, leaderID)
	if err != nil {
		return "", apierror.Internal("failed to create squad")
	}
	return id, nil
}

// gendersEqual reports whether two declared genders are both set and identical.
func gendersEqual(a, b *string) bool {
	return a != nil && b != nil && *a == *b
}

// propertyAllowsGender reports whether a user of the given gender may occupy a property
// with the given for_gender preference. Fails closed on an undisclosed user gender.
func propertyAllowsGender(forGender string, userGender *string) bool {
	if userGender == nil {
		return false
	}
	if forGender == "any" {
		return true
	}
	return *userGender == forGender
}

func (s *Service) InviteMember(ctx context.Context, senderID, squadID, targetUserID string) error {
	sq, err := s.repo.GetSquadByID(ctx, squadID)
	if err != nil {
		return apierror.New(http.StatusNotFound, "NOT_FOUND", "squad not found")
	}

	// Only members can invite
	members, err := s.repo.GetMembers(ctx, squadID)
	if err != nil {
		return apierror.Internal("failed to fetch squad members")
	}

	isMember := false
	for _, m := range members {
		if m.UserID == senderID && m.Status == MemberStatusAccepted {
			isMember = true
		}
		if m.UserID == targetUserID && (m.Status == MemberStatusInvited || m.Status == MemberStatusAccepted) {
			return apierror.New(http.StatusConflict, "ALREADY_EXISTS", "user is already a member or invited to this squad")
		}
	}

	if !isMember {
		return apierror.New(http.StatusForbidden, "FORBIDDEN", "only active members can invite others")
	}

	// Check capacity (BR-05)
	if sq.CurrentMemberCount >= sq.MaxSize {
		return apierror.New(http.StatusUnprocessableEntity, "SQUAD_FULL", "squad has reached maximum capacity")
	}

	// Single-gender invariant: the invitee must be the same gender as the squad
	// (defined by its creator). Fail closed if either gender is undisclosed.
	leaderGender, err := s.repo.GetUserGender(ctx, sq.CreatedBy)
	if err != nil {
		return apierror.Internal("failed to verify squad gender")
	}
	targetGender, err := s.repo.GetUserGender(ctx, targetUserID)
	if err != nil {
		return apierror.Internal("failed to verify member gender")
	}
	if targetGender == nil {
		return apierror.New(http.StatusUnprocessableEntity, "GENDER_REQUIRED", "the invited user has not set their gender")
	}
	if !gendersEqual(leaderGender, targetGender) {
		return apierror.New(http.StatusUnprocessableEntity, "GENDER_MISMATCH", "you can only invite members of the same gender as the squad")
	}

	err = s.repo.AddMember(ctx, squadID, targetUserID, MemberRoleMember, MemberStatusInvited)
	if err != nil {
		return apierror.Internal("failed to send invitation")
	}
	return nil
}

// JoinSquad lets an invited user accept their invitation and join. A user MUST
// already have a pending invite — joining is not open to arbitrary users.
func (s *Service) JoinSquad(ctx context.Context, userID, squadID string) error {
	return s.acceptInvite(ctx, userID, squadID)
}

// RespondToInvite accepts or rejects a pending invite. Accepting goes through the
// same capacity-guarded, invite-checked atomic path as JoinSquad.
func (s *Service) RespondToInvite(ctx context.Context, userID, squadID string, accept bool) error {
	if accept {
		return s.acceptInvite(ctx, userID, squadID)
	}

	if err := s.repo.UpdateMemberStatus(ctx, squadID, userID, MemberStatusRejected); err != nil {
		return apierror.Internal("failed to update invitation response")
	}
	return nil
}

// acceptInvite is the shared, authorization- and capacity-checked accept path.
func (s *Service) acceptInvite(ctx context.Context, userID, squadID string) error {
	err := s.repo.AcceptInvite(ctx, squadID, userID)
	switch {
	case err == nil:
		return nil
	case errors.Is(err, ErrSquadNotFound):
		return apierror.New(http.StatusNotFound, "NOT_FOUND", "squad not found")
	case errors.Is(err, ErrAlreadyInSquad):
		return apierror.New(http.StatusConflict, "ALREADY_MEMBER", "you are already in this squad")
	case errors.Is(err, ErrNotInvited):
		return apierror.New(http.StatusForbidden, "NOT_INVITED", "you must be invited to join this squad")
	case errors.Is(err, ErrSquadFull):
		return apierror.New(http.StatusUnprocessableEntity, "SQUAD_FULL", "squad has reached maximum capacity")
	case errors.Is(err, ErrGenderRequired):
		return apierror.New(http.StatusUnprocessableEntity, "GENDER_REQUIRED", "you must set your gender before joining a squad")
	case errors.Is(err, ErrGenderMismatch):
		return apierror.New(http.StatusUnprocessableEntity, "GENDER_MISMATCH", "you can only join a squad of your own gender")
	default:
		return apierror.Internal("failed to join squad")
	}
}

func (s *Service) ProposeProperty(ctx context.Context, userID, squadID, propertyID string, roomID *string) (string, error) {
	// Check if user is in squad
	members, err := s.repo.GetMembers(ctx, squadID)
	if err != nil {
		return "", apierror.Internal("failed to fetch squad members")
	}

	isMember := false
	for _, m := range members {
		if m.UserID == userID && m.Status == MemberStatusAccepted {
			isMember = true
			break
		}
	}
	if !isMember {
		return "", apierror.New(http.StatusForbidden, "FORBIDDEN", "only squad members can propose a property")
	}

	// Gender guard: the property's gender preference must allow this (single-gender)
	// squad. The proposer is an accepted member, so their gender represents the squad.
	forGender, err := s.repo.GetPropertyForGender(ctx, propertyID)
	if err != nil {
		return "", apierror.Internal("failed to load property")
	}
	proposerGender, err := s.repo.GetUserGender(ctx, userID)
	if err != nil {
		return "", apierror.Internal("failed to verify gender")
	}
	if !propertyAllowsGender(forGender, proposerGender) {
		return "", apierror.New(http.StatusUnprocessableEntity, "GENDER_MISMATCH", "this property's gender preference does not match your squad")
	}

	id, err := s.repo.CreateProposal(ctx, squadID, userID, propertyID, roomID)
	if err != nil {
		return "", apierror.Internal("failed to create proposal")
	}
	return id, nil
}

// ResolveProposal accepts or rejects a property proposal. BR-13: only the squad
// leader may resolve a proposal, and only while it is still pending.
func (s *Service) ResolveProposal(ctx context.Context, leaderID, proposalID string, accept bool) error {
	_, squadLeaderID, propStatus, propForGender, leaderGender, err := s.repo.GetProposalSquadLeader(ctx, proposalID)
	if err != nil {
		if errors.Is(err, ErrProposalNotFound) {
			return apierror.New(http.StatusNotFound, "NOT_FOUND", "proposal not found")
		}
		return apierror.Internal("failed to load proposal")
	}

	// BR-13: leader-only.
	if leaderID != squadLeaderID {
		return apierror.New(http.StatusForbidden, "FORBIDDEN", "only the squad leader can resolve proposals")
	}

	// Only a pending proposal can be resolved.
	if propStatus != "pending" {
		return apierror.New(http.StatusConflict, "ALREADY_RESOLVED", "this proposal has already been resolved")
	}

	status := "rejected"
	if accept {
		// Gender guard at the binding point: the property must allow the squad's gender.
		if !propertyAllowsGender(propForGender, leaderGender) {
			return apierror.New(http.StatusUnprocessableEntity, "GENDER_MISMATCH", "the proposed property's gender preference does not match the squad")
		}
		status = "accepted"
	}

	if err := s.repo.ResolveProposal(ctx, proposalID, status); err != nil {
		return apierror.Internal("failed to resolve proposal")
	}
	return nil
}

func (s *Service) GetSquadDetails(ctx context.Context, userID, squadID string) (map[string]interface{}, error) {
	sq, err := s.repo.GetSquadByID(ctx, squadID)
	if err != nil {
		return nil, apierror.New(http.StatusNotFound, "NOT_FOUND", "squad not found")
	}

	members, err := s.repo.GetMembers(ctx, squadID)
	if err != nil {
		return nil, apierror.Internal("failed to fetch squad members")
	}

	// Access control: only members can see full details
	isMember := false
	for _, m := range members {
		if m.UserID == userID {
			isMember = true
			break
		}
	}

	if !isMember {
		return nil, apierror.New(http.StatusForbidden, "FORBIDDEN", "you are not a member of this squad")
	}

	proposals, _ := s.repo.GetProposals(ctx, squadID)

	response := map[string]interface{}{
		"squad":     sq,
		"members":   members,
		"proposals": proposals,
	}

	// BR-06: Reveal landlord phone only if locked or moved_in
	if sq.Status == StatusLocked || sq.Status == StatusMovedIn {
		if sq.PropertyID != nil {
			contact, err := s.repo.GetLandlordContact(ctx, *sq.PropertyID)
			if err == nil {
				response["landlord_contact"] = contact
			}
		}
	}

	return response, nil
}

// GetMySquad returns the active squad the user belongs to, or nil if none.
// nil means the user is not in any squad — not an error.
func (s *Service) GetMySquad(ctx context.Context, userID string) (*Squad, error) {
	sq, err := s.repo.GetMySquad(ctx, userID)
	if err != nil {
		return nil, apierror.Internal("failed to fetch user's squad")
	}
	return sq, nil
}

// GetMyInvites returns the user's pending incoming squad invitations.
func (s *Service) GetMyInvites(ctx context.Context, userID string) ([]map[string]interface{}, error) {
	invites, err := s.repo.GetMyInvites(ctx, userID)
	if err != nil {
		return nil, apierror.Internal("failed to fetch user's invites")
	}
	return invites, nil
}

// GetLandlordApplications fetches all squads applying for the landlord's properties.
func (s *Service) GetLandlordApplications(ctx context.Context, landlordID string) ([]map[string]interface{}, error) {
	apps, err := s.repo.GetLandlordApplications(ctx, landlordID)
	if err != nil {
		return nil, apierror.Internal("failed to fetch landlord applications")
	}
	return apps, nil
}

// ResolveLandlordApplication accepts or rejects a squad's application to a property.
func (s *Service) ResolveLandlordApplication(ctx context.Context, squadID string, landlordID string, accept bool) error {
	err := s.repo.ResolveLandlordApplication(ctx, squadID, landlordID, accept)
	if err != nil {
		if err.Error() == "unauthorized" || err.Error() == "application not found or unauthorized" {
			return apierror.New(http.StatusForbidden, "FORBIDDEN", "you do not have permission to resolve this application")
		}
		return apierror.Internal("failed to resolve application")
	}
	return nil
}
