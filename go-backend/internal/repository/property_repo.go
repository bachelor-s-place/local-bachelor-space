package repository

import (
	"context"
	"errors"
	"strings"

	"bachelorsSpace/internal/domain/property"
	"bachelorsSpace/internal/pkg/querybuilder"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// likeEscaper escapes the LIKE/ILIKE wildcards so a user-supplied search term is
// matched literally (e.g. "%" matches a percent sign, not "everything"). Backslash
// is the default ESCAPE character in Postgres LIKE.
var likeEscaper = strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)

type PropertyRepo struct {
	pool *pgxpool.Pool
}

func NewPropertyRepo(pool *pgxpool.Pool) *PropertyRepo {
	return &PropertyRepo{pool: pool}
}

func (r *PropertyRepo) scanOne(row pgx.Row) (*property.Property, error) {
	var p property.Property
	err := row.Scan(
		&p.ID, &p.OwnerID, &p.Title, &p.Description, &p.PropertyType,
		&p.LocationLat, &p.LocationLng, &p.AddressText, &p.City, &p.Locality,
		&p.RentAmount, &p.DepositAmount, &p.TotalCapacity, &p.LifestyleTags,
		&p.ForGender, &p.TokenPercentage,
		&p.Status, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, property.ErrPropertyNotFound
		}
		return nil, err
	}
	return &p, nil
}

// CreateProperty inserts a new property, storing coordinates in a PostGIS geography point.
func (r *PropertyRepo) CreateProperty(ctx context.Context, p *property.Property) (string, error) {
	const query = `
		INSERT INTO properties (
			owner_id, title, description, property_type,
			location, address_text, city, locality,
			rent_amount, deposit_amount, total_capacity, lifestyle_tags,
			for_gender, token_percentage, status
		) VALUES (
			$1, $2, $3, $4,
			ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
			$7, $8, $9, $10, $11, $12, $13, $14, $15, $16
		) RETURNING id`

	var id string
	err := r.pool.QueryRow(ctx, query,
		p.OwnerID, p.Title, p.Description, p.PropertyType,
		p.LocationLng, p.LocationLat, // ST_MakePoint takes (lon, lat)
		p.AddressText, p.City, p.Locality,
		p.RentAmount, p.DepositAmount, p.TotalCapacity, p.LifestyleTags,
		p.ForGender, p.TokenPercentage, p.Status,
	).Scan(&id)

	if err != nil {
		return "", err
	}
	return id, nil
}

// GetPropertyByID fetches a property, extracting coordinates from PostGIS.
func (r *PropertyRepo) GetPropertyByID(ctx context.Context, id string) (*property.Property, error) {
	const query = `
		SELECT id, owner_id, title, description, property_type,
		       ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng,
		       address_text, city, locality, rent_amount, deposit_amount,
		       total_capacity, lifestyle_tags, for_gender, token_percentage,
		       status, created_at, updated_at
		FROM   properties
		WHERE  id = $1
		  AND  deleted_at IS NULL`

	return r.scanOne(r.pool.QueryRow(ctx, query, id))
}

// SearchProperties uses the querybuilder to dynamically construct a spatial search.
func (r *PropertyRepo) SearchProperties(ctx context.Context, filter property.SearchFilter) ([]property.Property, error) {
	const baseSelect = `
		SELECT id, owner_id, title, description, property_type,
		       ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng,
		       address_text, city, locality, rent_amount, deposit_amount,
		       total_capacity, lifestyle_tags, for_gender, token_percentage,
		       status, created_at, updated_at
		FROM   properties`

	qb := querybuilder.New(baseSelect)
	qb.Where("deleted_at IS NULL")
	qb.Where("status != 'delisted'")

	if filter.Lat != nil && filter.Lng != nil && filter.RadiusKm != nil {
		// Convert km to metres for ST_DWithin
		radiusMetres := *filter.RadiusKm * 1000
		qb.WhereParam("ST_DWithin(location, ST_MakePoint($?, $?)::geography, $?)", *filter.Lng, *filter.Lat, radiusMetres)
	}

	if filter.OwnerID != nil {
		qb.WhereParam("owner_id = $?", *filter.OwnerID)
	}

	if filter.City != nil {
		qb.WhereParam(`city ILIKE $? ESCAPE '\'`, "%"+likeEscaper.Replace(*filter.City)+"%")
	}
	if filter.Locality != nil {
		qb.WhereParam(`locality ILIKE $? ESCAPE '\'`, "%"+likeEscaper.Replace(*filter.Locality)+"%")
	}
	if filter.MinRent != nil {
		qb.WhereParam("rent_amount >= $?", *filter.MinRent)
	}
	if filter.MaxRent != nil {
		qb.WhereParam("rent_amount <= $?", *filter.MaxRent)
	}

	// Gender filter: derive allowed for_gender values from the tenant's declared gender.
	// male   → show 'male' + 'any'
	// female → show 'female' + 'any'
	// prefer_not_to_say → show 'any' only
	// nil (not set) → no filter, show all
	if filter.ForGender != nil {
		switch *filter.ForGender {
		case "male":
			qb.WhereParam("for_gender = ANY($?::property_gender_pref[])", []string{"male", "any"})
		case "female":
			qb.WhereParam("for_gender = ANY($?::property_gender_pref[])", []string{"female", "any"})
		case "prefer_not_to_say":
			qb.WhereParam("for_gender = $?", "any")
		}
	}

	qb.OrderBy("created_at DESC")
	qb.Limit(50) // Cap results to 50

	sql, args := qb.Build()

	rows, err := r.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []property.Property
	for rows.Next() {
		var p property.Property
		if err := rows.Scan(
			&p.ID, &p.OwnerID, &p.Title, &p.Description, &p.PropertyType,
			&p.LocationLat, &p.LocationLng, &p.AddressText, &p.City, &p.Locality,
			&p.RentAmount, &p.DepositAmount, &p.TotalCapacity, &p.LifestyleTags,
			&p.ForGender, &p.TokenPercentage,
			&p.Status, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		results = append(results, p)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return results, nil
}

// UpdateStatus changes the status of a property.
func (r *PropertyRepo) UpdateStatus(ctx context.Context, id string, status string) error {
	const query = `
		UPDATE properties
		SET    status = $1
		WHERE  id = $2
		  AND  deleted_at IS NULL`

	cmd, err := r.pool.Exec(ctx, query, status, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return property.ErrPropertyNotFound
	}
	return nil
}

// SetPropertyOccupied marks a property as occupied when a squad confirms move-in.
func (r *PropertyRepo) SetPropertyOccupied(ctx context.Context, propertyID string) error {
	const query = `UPDATE properties SET status = 'occupied', updated_at = NOW() WHERE id = $1::UUID AND deleted_at IS NULL`
	_, err := r.pool.Exec(ctx, query, propertyID)
	return err
}

// UpdateProperty updates all changeable fields of a property.
func (r *PropertyRepo) UpdateProperty(ctx context.Context, p *property.Property) error {
	const query = `
		UPDATE properties
		SET    title = $1, description = $2, rent_amount = $3, deposit_amount = $4,
		       total_capacity = $5, lifestyle_tags = $6,
		       for_gender = $7, token_percentage = $8
		WHERE  id = $9
		  AND  deleted_at IS NULL`

	cmd, err := r.pool.Exec(ctx, query,
		p.Title, p.Description, p.RentAmount, p.DepositAmount,
		p.TotalCapacity, p.LifestyleTags,
		p.ForGender, p.TokenPercentage, p.ID,
	)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return property.ErrPropertyNotFound
	}
	return nil
}

// CreateRoom inserts a new room for a PG property.
func (r *PropertyRepo) CreateRoom(ctx context.Context, room *property.Room) (string, error) {
	const query = `
		INSERT INTO rooms (
			property_id, room_number, room_type, capacity, rent_amount, deposit_amount, status
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7
		) RETURNING id`

	var id string
	err := r.pool.QueryRow(ctx, query,
		room.PropertyID, room.RoomNumber, room.RoomType, room.Capacity,
		room.RentAmount, room.DepositAmount, room.Status,
	).Scan(&id)

	if err != nil {
		return "", err
	}
	return id, nil
}

func (r *PropertyRepo) scanRoom(row pgx.Row) (*property.Room, error) {
	var rm property.Room
	err := row.Scan(
		&rm.ID, &rm.PropertyID, &rm.RoomNumber, &rm.RoomType, &rm.Capacity,
		&rm.CurrentOccupancy, &rm.RentAmount, &rm.DepositAmount, &rm.Status,
		&rm.CreatedAt, &rm.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("room not found")
		}
		return nil, err
	}
	return &rm, nil
}

// GetRoomByID fetches a specific room.
func (r *PropertyRepo) GetRoomByID(ctx context.Context, id string) (*property.Room, error) {
	const query = `
		SELECT id, property_id, room_number, room_type, capacity, current_occupancy,
		       rent_amount, deposit_amount, status, created_at, updated_at
		FROM   rooms
		WHERE  id = $1
		  AND  deleted_at IS NULL`

	return r.scanRoom(r.pool.QueryRow(ctx, query, id))
}

// GetRoomsByProperty fetches all active rooms for a property.
func (r *PropertyRepo) GetRoomsByProperty(ctx context.Context, propertyID string) ([]property.Room, error) {
	const query = `
		SELECT id, property_id, room_number, room_type, capacity, current_occupancy,
		       rent_amount, deposit_amount, status, created_at, updated_at
		FROM   rooms
		WHERE  property_id = $1
		  AND  deleted_at IS NULL
		ORDER BY created_at ASC`

	rows, err := r.pool.Query(ctx, query, propertyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []property.Room
	for rows.Next() {
		rm, err := r.scanRoom(rows)
		if err != nil {
			return nil, err
		}
		results = append(results, *rm)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return results, nil
}

// UpdateRoom updates changeable fields of a room.
func (r *PropertyRepo) UpdateRoom(ctx context.Context, rm *property.Room) error {
	const query = `
		UPDATE rooms
		SET    room_number = $1, capacity = $2, rent_amount = $3, deposit_amount = $4, status = $5
		WHERE  id = $6
		  AND  deleted_at IS NULL`

	cmd, err := r.pool.Exec(ctx, query,
		rm.RoomNumber, rm.Capacity, rm.RentAmount, rm.DepositAmount, rm.Status, rm.ID,
	)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("room not found")
	}
	return nil
}
