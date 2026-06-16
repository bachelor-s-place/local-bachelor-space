package repository

import (
	"context"
	"errors"

	"bachelorsSpace/internal/domain/kyc"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// KYCRepo handles database operations for landlord KYC.
type KYCRepo struct {
	pool *pgxpool.Pool
}

// NewKYCRepo creates a new KYC repository.
func NewKYCRepo(pool *pgxpool.Pool) *KYCRepo {
	return &KYCRepo{pool: pool}
}

// scanOne scans a single row into a LandlordKYC struct.
func (r *KYCRepo) scanOne(row pgx.Row) (*kyc.LandlordKYC, error) {
	var k kyc.LandlordKYC
	err := row.Scan(
		&k.ID,
		&k.UserID,
		&k.AadhaarEncrypted,
		&k.PANEncrypted,
		&k.AadhaarVerified,
		&k.PANVerified,
		&k.Status,
		&k.SubmittedAt,
		&k.VerifiedAt,
		&k.CreatedAt,
		&k.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, kyc.ErrKYCNotFound
		}
		return nil, err
	}
	return &k, nil
}

// CreateKYC inserts a new KYC record.
func (r *KYCRepo) CreateKYC(ctx context.Context, k *kyc.LandlordKYC) (string, error) {
	const query = `
		INSERT INTO landlord_kyc (
			user_id, aadhaar_encrypted, pan_encrypted, status, submitted_at
		) VALUES (
			$1, $2, $3, $4, NOW()
		) RETURNING id`

	var id string
	err := r.pool.QueryRow(ctx, query,
		k.UserID,
		k.AadhaarEncrypted,
		k.PANEncrypted,
		k.Status,
	).Scan(&id)

	if err != nil {
		if isUniqueViolation(err) {
			return "", kyc.ErrKYCAlreadyExists
		}
		return "", err
	}

	return id, nil
}

// GetKYCByUserID retrieves a KYC record by the landlord's user ID.
func (r *KYCRepo) GetKYCByUserID(ctx context.Context, userID string) (*kyc.LandlordKYC, error) {
	const query = `
		SELECT id, user_id, aadhaar_encrypted, pan_encrypted,
		       aadhaar_verified, pan_verified, status,
		       submitted_at, verified_at, created_at, updated_at
		FROM   landlord_kyc
		WHERE  user_id = $1
		  AND  deleted_at IS NULL`

	return r.scanOne(r.pool.QueryRow(ctx, query, userID))
}

// GetKYCByID retrieves a KYC record by its own ID.
func (r *KYCRepo) GetKYCByID(ctx context.Context, id string) (*kyc.LandlordKYC, error) {
	const query = `
		SELECT id, user_id, aadhaar_encrypted, pan_encrypted,
		       aadhaar_verified, pan_verified, status,
		       submitted_at, verified_at, created_at, updated_at
		FROM   landlord_kyc
		WHERE  id = $1
		  AND  deleted_at IS NULL`

	return r.scanOne(r.pool.QueryRow(ctx, query, id))
}

// UpdateStatus updates the status of a KYC submission.
func (r *KYCRepo) UpdateStatus(ctx context.Context, id string, status string) error {
	var query string
	if status == kyc.StatusVerified {
		query = `
			UPDATE landlord_kyc
			SET    status = $1, verified_at = NOW(), aadhaar_verified = TRUE, pan_verified = TRUE
			WHERE  id = $2 AND deleted_at IS NULL`
	} else {
		query = `
			UPDATE landlord_kyc
			SET    status = $1
			WHERE  id = $2 AND deleted_at IS NULL`
	}

	cmd, err := r.pool.Exec(ctx, query, status, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return kyc.ErrKYCNotFound
	}
	return nil
}

// ListPending returns all KYC submissions currently awaiting review,
// joined with the landlord's user name and email for the admin panel.
func (r *KYCRepo) ListPending(ctx context.Context) ([]kyc.KYCWithUser, error) {
	const query = `
		SELECT k.id, k.user_id, u.name, u.email, k.status,
		       k.submitted_at, k.verified_at
		FROM   landlord_kyc k
		JOIN   users u ON u.id = k.user_id
		WHERE  k.status = $1
		  AND  k.deleted_at IS NULL
		ORDER BY k.submitted_at ASC`

	rows, err := r.pool.Query(ctx, query, kyc.StatusPending)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []kyc.KYCWithUser
	for rows.Next() {
		var k kyc.KYCWithUser
		if err := rows.Scan(
			&k.ID, &k.UserID, &k.UserName, &k.UserEmail,
			&k.Status, &k.SubmittedAt, &k.VerifiedAt,
		); err != nil {
			return nil, err
		}
		results = append(results, k)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return results, nil
}
