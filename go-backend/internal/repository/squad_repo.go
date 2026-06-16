package repository

import (
	"context"
	"errors"
	"time"

	"bachelorsSpace/internal/domain/squad"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SquadRepo struct {
	pool *pgxpool.Pool
}

func NewSquadRepo(pool *pgxpool.Pool) *SquadRepo {
	return &SquadRepo{pool: pool}
}

// CreateLookup registers a tenant's intent to find a squad.
func (r *SquadRepo) CreateLookup(ctx context.Context, l *squad.SquadLookup) (string, error) {
	const query = `
		INSERT INTO squad_lookups (
			user_id, property_id, locality_preference, budget_min, budget_max, status
		) VALUES ($1, $2, $3, $4, $5, 'active')
		RETURNING id`

	var id string
	err := r.pool.QueryRow(ctx, query,
		l.UserID, l.PropertyID, l.LocalityPreference, l.BudgetMin, l.BudgetMax,
	).Scan(&id)

	return id, err
}

// UpdateActiveLookup refreshes the criteria of a user's existing active lookup so a
// re-submission updates (rather than silently discards) the new budget/locality/property.
func (r *SquadRepo) UpdateActiveLookup(ctx context.Context, l *squad.SquadLookup) error {
	const query = `
		UPDATE squad_lookups
		SET property_id = $2, locality_preference = $3, budget_min = $4, budget_max = $5
		WHERE user_id = $1 AND status = 'active' AND deleted_at IS NULL`
	_, err := r.pool.Exec(ctx, query,
		l.UserID, l.PropertyID, l.LocalityPreference, l.BudgetMin, l.BudgetMax,
	)
	return err
}

func (r *SquadRepo) GetActiveLookup(ctx context.Context, userID string) (*squad.SquadLookup, error) {
	const query = `
		SELECT id, user_id, property_id, locality_preference, budget_min, budget_max, status, created_at, expires_at
		FROM   squad_lookups
		WHERE  user_id = $1 AND status = 'active' AND deleted_at IS NULL`

	var l squad.SquadLookup
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&l.ID, &l.UserID, &l.PropertyID, &l.LocalityPreference, &l.BudgetMin, &l.BudgetMax,
		&l.Status, &l.CreatedAt, &l.ExpiresAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, squad.ErrLookupNotFound
		}
		return nil, err
	}
	return &l, nil
}

func (r *SquadRepo) DeleteLookup(ctx context.Context, userID string) error {
	const query = `UPDATE squad_lookups SET status = 'inactive', deleted_at = NOW() WHERE user_id = $1 AND status = 'active'`
	_, err := r.pool.Exec(ctx, query, userID)
	return err
}

// FindMatches uses pgvector cosine similarity to find compatible users.
// Only returns users with a similarity score >= 0.7.
//
// Uses EXISTS (not a JOIN) against squad_lookups so a user with several active
// lookups appears once, and guards against the requesting user having no embedding
// yet (which would otherwise make every comparison NULL).
//
// Gender segregation: only same-gender candidates are returned. If the requester has
// no declared gender, the `me.g IS NOT NULL` guard yields zero matches (fail closed).
func (r *SquadRepo) FindMatches(ctx context.Context, userID string, limit int, offset int) ([]squad.MatchResult, error) {
	const query = `
		WITH me AS (
			SELECT personality_embedding AS emb, gender AS g FROM users WHERE id = $1
		)
		SELECT
			u.id, u.name, u.gender,
			COALESCE(u.lifestyle_tags, '{}') AS lifestyle_tags,
			COALESCE(u.bio, '')              AS bio,
			1 - (u.personality_embedding <=> (SELECT emb FROM me)) AS compatibility_score
		FROM users u
		WHERE u.id != $1
		  AND u.deleted_at IS NULL
		  AND u.personality_embedding IS NOT NULL
		  AND (SELECT emb FROM me) IS NOT NULL
		  AND (SELECT g FROM me) IS NOT NULL
		  AND u.gender = (SELECT g FROM me)
		  AND EXISTS (
			SELECT 1 FROM squad_lookups sl
			WHERE sl.user_id = u.id AND sl.status = 'active' AND sl.deleted_at IS NULL
		  )
		  AND 1 - (u.personality_embedding <=> (SELECT emb FROM me)) >= 0.7
		ORDER BY compatibility_score DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var matches []squad.MatchResult
	for rows.Next() {
		var m squad.MatchResult
		if err := rows.Scan(&m.UserID, &m.Name, &m.Gender, &m.LifestyleTags, &m.Bio, &m.CompatibilityScore); err != nil {
			return nil, err
		}
		matches = append(matches, m)
	}
	return matches, nil
}

// CreateSquad creates a new squad and adds the creator as the leader.
func (r *SquadRepo) CreateSquad(ctx context.Context, s *squad.Squad, leaderID string) (string, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	const squadQuery = `
		INSERT INTO squads (property_id, room_id, name, status, payment_model, max_size, current_member_count, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, 1, $7)
		RETURNING id`

	var squadID string
	err = tx.QueryRow(ctx, squadQuery,
		s.PropertyID, s.RoomID, s.Name, s.Status, s.PaymentModel, s.MaxSize, s.CreatedBy,
	).Scan(&squadID)
	if err != nil {
		return "", err
	}

	const memberQuery = `
		INSERT INTO squad_members (squad_id, user_id, role, status, joined_at)
		VALUES ($1, $2, 'leader', 'accepted', NOW())`

	_, err = tx.Exec(ctx, memberQuery, squadID, leaderID)
	if err != nil {
		return "", err
	}

	return squadID, tx.Commit(ctx)
}

func (r *SquadRepo) GetSquadByID(ctx context.Context, id string) (*squad.Squad, error) {
	const query = `
		SELECT id, property_id, room_id, name, status, payment_model, max_size, current_member_count, created_by, total_deposit_collected, token_paid_at, created_at, updated_at
		FROM   squads
		WHERE  id = $1 AND deleted_at IS NULL`

	var s squad.Squad
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&s.ID, &s.PropertyID, &s.RoomID, &s.Name, &s.Status, &s.PaymentModel, &s.MaxSize, &s.CurrentMemberCount,
		&s.CreatedBy, &s.TotalDepositCollected, &s.TokenPaidAt, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, squad.ErrSquadNotFound
		}
		return nil, err
	}
	return &s, nil
}

func (r *SquadRepo) GetMembers(ctx context.Context, squadID string) ([]squad.SquadMember, error) {
	const query = `
		SELECT sm.id, sm.squad_id, sm.user_id, u.name, u.gender, sm.role, sm.status, sm.share_amount, sm.joined_at, sm.created_at
		FROM   squad_members sm
		JOIN   users u ON sm.user_id = u.id
		WHERE  sm.squad_id = $1 AND sm.deleted_at IS NULL`

	rows, err := r.pool.Query(ctx, query, squadID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []squad.SquadMember
	for rows.Next() {
		var m squad.SquadMember
		if err := rows.Scan(
			&m.ID, &m.SquadID, &m.UserID, &m.UserName, &m.Gender, &m.Role, &m.Status, &m.ShareAmount, &m.JoinedAt, &m.CreatedAt,
		); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, nil
}

func (r *SquadRepo) AddMember(ctx context.Context, squadID, userID string, role squad.MemberRole, status squad.MemberStatus) error {
	// If the user previously left or was rejected, reactivate that row instead of
	// inserting a duplicate (there is no unique constraint on squad_id+user_id, so a
	// blind INSERT would create a second membership row and corrupt counts).
	const reactivate = `
		UPDATE squad_members
		SET role = $3, status = $4, deleted_at = NULL
		WHERE squad_id = $1 AND user_id = $2 AND status <> 'accepted'`
	tag, err := r.pool.Exec(ctx, reactivate, squadID, userID, role, status)
	if err != nil {
		return err
	}
	if tag.RowsAffected() > 0 {
		return nil
	}

	const insert = `
		INSERT INTO squad_members (squad_id, user_id, role, status)
		VALUES ($1, $2, $3, $4)`
	_, err = r.pool.Exec(ctx, insert, squadID, userID, role, status)
	return err
}

func (r *SquadRepo) JoinSquad(ctx context.Context, squadID, userID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	const insertQuery = `
		INSERT INTO squad_members (squad_id, user_id, role, status, joined_at)
		VALUES ($1, $2, 'member', 'accepted', NOW())`
	_, err = tx.Exec(ctx, insertQuery, squadID, userID)
	if err != nil {
		return err
	}

	const updateCount = `UPDATE squads SET current_member_count = current_member_count + 1 WHERE id = $1`
	_, err = tx.Exec(ctx, updateCount, squadID)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// GetUserGender returns a user's declared gender, or nil if not disclosed.
func (r *SquadRepo) GetUserGender(ctx context.Context, userID string) (*string, error) {
	var gender *string
	err := r.pool.QueryRow(ctx, `SELECT gender FROM users WHERE id = $1`, userID).Scan(&gender)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, squad.ErrSquadNotFound
	}
	return gender, err
}

// GetPropertyForGender returns a property's gender preference ('male'|'female'|'any').
func (r *SquadRepo) GetPropertyForGender(ctx context.Context, propertyID string) (string, error) {
	var forGender string
	err := r.pool.QueryRow(ctx, `SELECT for_gender FROM properties WHERE id = $1`, propertyID).Scan(&forGender)
	return forGender, err
}

// AcceptInvite atomically turns a pending invite into an accepted membership.
// It locks the squad row (FOR UPDATE) so concurrent joins cannot overflow capacity,
// only transitions a row whose status is 'invited', and increments the count once.
func (r *SquadRepo) AcceptInvite(ctx context.Context, squadID, userID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Serialize concurrent joins for this squad and read current capacity.
	var maxSize, currentCount int
	err = tx.QueryRow(ctx,
		`SELECT max_size, current_member_count FROM squads WHERE id = $1 FOR UPDATE`,
		squadID,
	).Scan(&maxSize, &currentCount)
	if errors.Is(err, pgx.ErrNoRows) {
		return squad.ErrSquadNotFound
	}
	if err != nil {
		return err
	}

	// Already an accepted member?
	var alreadyAccepted bool
	if err := tx.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM squad_members WHERE squad_id = $1 AND user_id = $2 AND status = 'accepted')`,
		squadID, userID,
	).Scan(&alreadyAccepted); err != nil {
		return err
	}
	if alreadyAccepted {
		return squad.ErrAlreadyInSquad
	}

	if currentCount >= maxSize {
		return squad.ErrSquadFull
	}

	// Single-gender invariant (defense-in-depth, also catches stale invites created
	// before gender enforcement): the joiner's gender must match the squad's, which is
	// defined by its creator. Fail closed if either gender is undisclosed.
	var creatorGender, joinerGender *string
	if err := tx.QueryRow(ctx,
		`SELECT (SELECT gender FROM users WHERE id = s.created_by), (SELECT gender FROM users WHERE id = $2)
		 FROM squads s WHERE s.id = $1`,
		squadID, userID,
	).Scan(&creatorGender, &joinerGender); err != nil {
		return err
	}
	if joinerGender == nil {
		return squad.ErrGenderRequired
	}
	if creatorGender == nil || *creatorGender != *joinerGender {
		return squad.ErrGenderMismatch
	}

	// Only a pending invite can be accepted.
	tag, err := tx.Exec(ctx,
		`UPDATE squad_members
		 SET status = 'accepted', joined_at = COALESCE(joined_at, NOW())
		 WHERE squad_id = $1 AND user_id = $2 AND status = 'invited'`,
		squadID, userID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return squad.ErrNotInvited
	}

	if _, err := tx.Exec(ctx,
		`UPDATE squads SET current_member_count = current_member_count + 1, updated_at = NOW() WHERE id = $1`,
		squadID,
	); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *SquadRepo) UpdateMemberStatus(ctx context.Context, squadID, userID string, status squad.MemberStatus) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var joinedAt *time.Time
	if status == squad.MemberStatusAccepted {
		now := time.Now()
		joinedAt = &now
	}

	const updateMember = `
		UPDATE squad_members 
		SET    status = $1, joined_at = COALESCE(joined_at, $2)
		WHERE  squad_id = $3 AND user_id = $4`

	_, err = tx.Exec(ctx, updateMember, status, joinedAt, squadID, userID)
	if err != nil {
		return err
	}

	// If accepted, increment member count
	if status == squad.MemberStatusAccepted {
		const updateCount = `UPDATE squads SET current_member_count = current_member_count + 1 WHERE id = $1`
		_, err = tx.Exec(ctx, updateCount, squadID)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *SquadRepo) RemoveMember(ctx context.Context, squadID, userID string) error {
	const query = `UPDATE squad_members SET status = 'left', deleted_at = NOW() WHERE squad_id = $1 AND user_id = $2`
	_, err := r.pool.Exec(ctx, query, squadID, userID)
	return err
}

func (r *SquadRepo) CreateProposal(ctx context.Context, squadID, userID, propertyID string, roomID *string) (string, error) {
	const query = `
		INSERT INTO squad_property_proposals (squad_id, proposed_by, property_id, room_id, status)
		VALUES ($1, $2, $3, $4, 'pending')
		RETURNING id`
	var id string
	err := r.pool.QueryRow(ctx, query, squadID, userID, propertyID, roomID).Scan(&id)
	return id, err
}

func (r *SquadRepo) GetProposals(ctx context.Context, squadID string) ([]map[string]interface{}, error) {
	const query = `
		SELECT spp.id, spp.property_id, p.title, spp.proposed_by, u.name as proposer_name, spp.status, spp.proposed_at
		FROM   squad_property_proposals spp
		JOIN   properties p ON spp.property_id = p.id
		JOIN   users u ON spp.proposed_by = u.id
		WHERE  spp.squad_id = $1 AND spp.deleted_at IS NULL`

	rows, err := r.pool.Query(ctx, query, squadID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		var id, propID, propTitle, propBy, propByName, status string
		var proposedAt time.Time
		if err := rows.Scan(&id, &propID, &propTitle, &propBy, &propByName, &status, &proposedAt); err != nil {
			return nil, err
		}
		results = append(results, map[string]interface{}{
			"id":             id,
			"property_id":    propID,
			"property_title": propTitle,
			"proposed_by":    propBy,
			"proposer_name":  propByName,
			"status":         status,
			"created_at":     proposedAt,
		})
	}
	return results, nil
}

// GetProposalSquadLeader returns the squad id, the squad's leader (created_by), and the
// proposal's current status. Used to enforce that only the leader resolves a proposal.
func (r *SquadRepo) GetProposalSquadLeader(ctx context.Context, proposalID string) (string, string, string, string, *string, error) {
	const query = `
		SELECT spp.squad_id, s.created_by, spp.status, p.for_gender, u.gender
		FROM   squad_property_proposals spp
		JOIN   squads s ON s.id = spp.squad_id
		JOIN   properties p ON p.id = spp.property_id
		JOIN   users u ON u.id = s.created_by
		WHERE  spp.id = $1 AND spp.deleted_at IS NULL`
	var squadID, leaderID, status, propForGender string
	var leaderGender *string
	err := r.pool.QueryRow(ctx, query, proposalID).Scan(&squadID, &leaderID, &status, &propForGender, &leaderGender)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", "", "", "", nil, squad.ErrProposalNotFound
	}
	return squadID, leaderID, status, propForGender, leaderGender, err
}

func (r *SquadRepo) ResolveProposal(ctx context.Context, proposalID string, status string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	const updateProp = `UPDATE squad_property_proposals SET status = $1, resolved_at = NOW() WHERE id = $2 RETURNING squad_id, property_id, room_id`
	var squadID, propertyID string
	var roomID *string
	err = tx.QueryRow(ctx, updateProp, status, proposalID).Scan(&squadID, &propertyID, &roomID)
	if err != nil {
		return err
	}

	if status == "accepted" {
		// Update squad status and property
		const updateSquad = `UPDATE squads SET status = 'pending_landlord_approval', property_id = $1, room_id = $2 WHERE id = $3`
		_, err = tx.Exec(ctx, updateSquad, propertyID, roomID, squadID)
		if err != nil {
			return err
		}

		// Reject all other pending proposals for this squad (FR-4.4)
		const rejectOthers = `UPDATE squad_property_proposals SET status = 'rejected', resolved_at = NOW() WHERE squad_id = $1 AND id != $2 AND status = 'pending'`
		_, err = tx.Exec(ctx, rejectOthers, squadID, proposalID)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}
func (r *SquadRepo) UpdateTotalDeposit(ctx context.Context, squadID string, amount float64) error {
	const query = `UPDATE squads SET total_deposit_collected = total_deposit_collected + $1, updated_at = NOW() WHERE id = $2`
	_, err := r.pool.Exec(ctx, query, amount, squadID)
	return err
}

func (r *SquadRepo) SetStatusLocked(ctx context.Context, squadID string) error {
	const query = `UPDATE squads SET status = 'locked', token_paid_at = NOW(), updated_at = NOW() WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, squadID)
	return err
}

// SetTotalDeposit sets total_deposit_collected to an absolute (recomputed) value.
// Used by the webhook flow which derives the total from successful transactions,
// avoiding the double-counting of an incremental add.
func (r *SquadRepo) SetTotalDeposit(ctx context.Context, squadID string, amount float64) error {
	const query = `UPDATE squads SET total_deposit_collected = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.pool.Exec(ctx, query, amount, squadID)
	return err
}

// LockSquadIfPending transitions a squad to 'locked' only if it is not already
// locked or moved_in. Returns true if this call performed the transition, so the
// caller can fire the success notification exactly once.
func (r *SquadRepo) LockSquadIfPending(ctx context.Context, squadID string) (bool, error) {
	const query = `
		UPDATE squads
		SET status = 'locked', token_paid_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND status NOT IN ('locked', 'moved_in')`
	tag, err := r.pool.Exec(ctx, query, squadID)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
}

func (r *SquadRepo) SetStatusMovedIn(ctx context.Context, squadID string) error {
	const query = `UPDATE squads SET status = 'moved_in', move_in_confirmed_at = NOW(), updated_at = NOW() WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, squadID)
	return err
}

func (r *SquadRepo) GetLandlordContact(ctx context.Context, propertyID string) (map[string]string, error) {
	const query = `
		SELECT u.name, u.phone_encrypted
		FROM   properties p
		JOIN   users u ON p.owner_id = u.id
		WHERE  p.id = $1`
	
	var name, phone string
	err := r.pool.QueryRow(ctx, query, propertyID).Scan(&name, &phone)
	if err != nil {
		return nil, err
	}

	return map[string]string{
		"name":  name,
		"phone": phone,
	}, nil
}

// GetMySquad returns the active squad the user is currently an accepted member of.
// Returns nil, nil if the user has no active squad (not an error).
func (r *SquadRepo) GetMySquad(ctx context.Context, userID string) (*squad.Squad, error) {
	const query = `
		SELECT s.id, s.property_id, s.room_id, s.name, s.status, s.payment_model,
		       s.max_size, s.current_member_count, s.created_by,
		       s.total_deposit_collected, s.token_paid_at, s.created_at, s.updated_at
		FROM   squads s
		JOIN   squad_members sm ON sm.squad_id = s.id
		WHERE  sm.user_id   = $1
		  AND  sm.status    = 'accepted'
		  AND  sm.deleted_at IS NULL
		  AND  s.deleted_at  IS NULL
		  AND  s.status NOT IN ('disbanded')
		ORDER  BY sm.joined_at DESC
		LIMIT  1`

	var s squad.Squad
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&s.ID, &s.PropertyID, &s.RoomID, &s.Name, &s.Status, &s.PaymentModel,
		&s.MaxSize, &s.CurrentMemberCount, &s.CreatedBy,
		&s.TotalDepositCollected, &s.TokenPaidAt, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil // user has no active squad — not an error
		}
		return nil, err
	}
	return &s, nil
}

// GetMyInvites returns all pending squad invitations for the user.
func (r *SquadRepo) GetMyInvites(ctx context.Context, userID string) ([]map[string]interface{}, error) {
	const query = `
		SELECT s.id as squad_id, s.name as squad_name, u.name as leader_name, sm.created_at as invited_at
		FROM   squad_members sm
		JOIN   squads s ON sm.squad_id = s.id
		JOIN   squad_members sl ON sl.squad_id = s.id AND sl.role = 'leader'
		JOIN   users u ON sl.user_id = u.id
		WHERE  sm.user_id = $1
		  AND  sm.status = 'invited'
		  AND  sm.deleted_at IS NULL
		  AND  s.deleted_at IS NULL
		  AND  s.status NOT IN ('disbanded')`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invites []map[string]interface{}
	for rows.Next() {
		var squadID, squadName, leaderName string
		var invitedAt time.Time
		if err := rows.Scan(&squadID, &squadName, &leaderName, &invitedAt); err != nil {
			return nil, err
		}
		invites = append(invites, map[string]interface{}{
			"squad_id":    squadID,
			"squad_name":  squadName,
			"leader_name": leaderName,
			"invited_at":  invitedAt,
		})
	}
	return invites, nil
}

// GetLandlordApplications retrieves all squads awaiting approval for properties owned by the given landlord.
func (r *SquadRepo) GetLandlordApplications(ctx context.Context, landlordID string) ([]map[string]interface{}, error) {
	const query = `
		SELECT s.id as squad_id, s.name as squad_name, s.max_size, s.current_member_count,
		       p.id as property_id, p.title as property_title,
		       s.updated_at as applied_at
		FROM   squads s
		JOIN   properties p ON s.property_id = p.id
		WHERE  p.owner_id = $1
		  AND  s.status = 'pending_landlord_approval'
		  AND  s.deleted_at IS NULL
		ORDER BY s.updated_at DESC`

	rows, err := r.pool.Query(ctx, query, landlordID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var applications []map[string]interface{}
	for rows.Next() {
		var squadID, propID, propTitle string
		var squadName *string
		var maxSize, currentCount int
		var appliedAt time.Time
		if err := rows.Scan(&squadID, &squadName, &maxSize, &currentCount, &propID, &propTitle, &appliedAt); err != nil {
			return nil, err
		}
		
		nameStr := "Unnamed Squad"
		if squadName != nil {
			nameStr = *squadName
		}
		
		applications = append(applications, map[string]interface{}{
			"squad_id":             squadID,
			"squad_name":           nameStr,
			"max_size":             maxSize,
			"current_member_count": currentCount,
			"property_id":          propID,
			"property_title":       propTitle,
			"applied_at":           appliedAt,
		})
	}
	return applications, nil
}

// ResolveLandlordApplication updates the squad status based on landlord approval or rejection.
func (r *SquadRepo) ResolveLandlordApplication(ctx context.Context, squadID string, landlordID string, accept bool) error {
	// First verify the landlord owns the property the squad is applying for
	const verifyQuery = `
		SELECT p.owner_id 
		FROM squads s 
		JOIN properties p ON s.property_id = p.id 
		WHERE s.id = $1 AND s.status = 'pending_landlord_approval'
	`
	var ownerID string
	err := r.pool.QueryRow(ctx, verifyQuery, squadID).Scan(&ownerID)
	if err != nil {
		return errors.New("application not found or unauthorized")
	}
	if ownerID != landlordID {
		return errors.New("unauthorized")
	}

	if accept {
		// Move to payment_pending
		const acceptQuery = `UPDATE squads SET status = 'payment_pending', updated_at = NOW() WHERE id = $1`
		_, err = r.pool.Exec(ctx, acceptQuery, squadID)
		return err
	} else {
		// Reject: revert to forming and clear property
		const rejectQuery = `UPDATE squads SET status = 'forming', property_id = NULL, room_id = NULL, updated_at = NOW() WHERE id = $1`
		_, err = r.pool.Exec(ctx, rejectQuery, squadID)
		return err
	}
}
