# Implementation Guide: Getting Started

This guide walks through setup, configuration, and running the BachelorsSpace backend locally.

## Prerequisites

- **Go**: 1.23 or later
- **Docker & Docker Compose**: For PostgreSQL with PostGIS and pgvector
- **PostgreSQL**: 16+ (if not using Docker)
- **OpenSSL**: For generating secrets (`openssl rand -hex 32`)
- **curl** or **Postman**: For testing API endpoints

## Step 1: Clone the Repository

```bash
git clone <repo-url>
cd BachelorsSpace
```

## Step 2: Create and Configure `.env`

Copy the template:
```bash
cp .env.example .env
```

Edit `.env` and fill in required values:

### Required Variables
```env
DATABASE_URL=postgres://user:password@localhost:5432/bachelorsspace_db?sslmode=disable
JWT_SECRET=<generate with: openssl rand -hex 32>
ENCRYPTION_KEY=<generate with: openssl rand -hex 32>
```

### Optional Variables (Only if Using Those Features)

**Google Maps (for property geocoding):**
```env
GOOGLE_MAPS_API_KEY=<your-api-key>
```

**OpenAI (for personality embeddings):**
```env
OPENAI_API_KEY=<your-api-key>
```

**Razorpay (for payments):**
```env
RAZORPAY_KEY_ID=rzp_test_<your-test-key>
RAZORPAY_KEY_SECRET=<your-secret>
RAZORPAY_WEBHOOK_SECRET=<webhook-secret>
PAYMENTS_ENABLED=false  # Set to 'true' only in production with real keys
```

**SMTP (for email notifications):**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<your-sendgrid-key>
EMAIL_FROM=noreply@bachelorsspace.in
```

**Server:**
```env
PORT=8080
ENV=development  # development or production
```

## Step 3: Start the Database

The `docker-compose.yml` orchestrates PostgreSQL with PostGIS and pgvector:

```bash
docker-compose up --build
```

This:
1. Builds the DB image from `Dockerfile.db` (PostGIS + pgvector on PostgreSQL 16)
2. Starts the PostgreSQL container
3. Runs `db/schema_initializer.sql` on first boot, creating:
   - Extensions: `pgcrypto`, `postgis`, `vector`
   - Enums: `user_role`, `property_type`, `squad_status`, etc.
   - Tables: `users`, `properties`, `squads`, `transactions`, etc.
   - Indexes: Spatial (GIST) and vector (ivfflat) for performance
   - Seed data (optional)

**Verify the database is ready:**
```bash
docker-compose ps
# Should show 'postgres' with status 'Up'
```

### Database Connection

If you have PostgreSQL installed locally, you can connect directly:
```bash
psql postgresql://user:password@localhost:5432/bachelorsspace_db
```

Inside psql:
```sql
-- Check extensions
SELECT * FROM pg_extension;

-- List tables
\dt public.*

-- Check a sample query
SELECT COUNT(*) FROM users;
```

## Step 4: Start the API Server

In a new terminal (with `.env` configured):

```bash
go run cmd/api/main.go
```

The server will:
1. Load configuration from `.env`
2. Connect to PostgreSQL
3. Start the embedding worker (background goroutine for vector generation)
4. Start the HTTP server on the configured port (default: 8080)
5. Print a startup message:
   ```
   BachelorsSpace API server started on :8080
   ```

### Verify the Server

```bash
curl -s http://localhost:8080/health | jq .
# Expected response: { "status": "ok" }
```

## Step 5: Test Key Endpoints

### Register a User
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "password": "SecurePassword123",
    "role": "tenant"
  }'
```

**Success Response** (201 Created):
```json
{
  "user": {
    "id": "uuid-here",
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "role": "tenant",
    "is_active": true,
    "created_at": "2026-04-23T12:00:00Z"
  },
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc..."
}
```

### Login
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "SecurePassword123"
  }'
```

### Update Profile (Requires Authentication)
```bash
ACCESS_TOKEN="<token-from-login>"

curl -X PUT http://localhost:8080/api/v1/users/me/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lifestyle_tags": ["non-smoker", "early-riser", "vegetarian"],
    "bio": "Love cooking, board games, and hiking",
    "budget_min": 15000,
    "budget_max": 25000,
    "preferred_localities": ["Indiranagar", "Koramangala", "Whitefield"]
  }'
```

## Step 6: Understanding the Schema

The `db/schema_initializer.sql` file is the single source of truth for the database schema. Key components:

### Tables Overview

| Table | Purpose |
| --- | --- |
| `users` | Platform users (tenants, landlords, admins) |
| `properties` | Rental listings with spatial coordinates |
| `squads` | Roommate groups |
| `squad_members` | Membership and invitations |
| `transactions` | Payment ledger |
| `messages` | Squad chat |
| `notifications` | User feed |
| `kyc_submissions` | Landlord verification |

### Key Features in Schema

**Spatial Indexing (PostGIS):**
```sql
CREATE INDEX idx_properties_location ON properties USING GIST (location);
```
Used for nearby property searches within a radius.

**Vector Indexing (pgvector):**
```sql
CREATE INDEX ON users USING ivfflat (personality_embedding vector_cosine_ops);
```
Used for AI-driven squad matching by personality similarity.

**Enums (Type Safety):**
```sql
CREATE TYPE user_role AS ENUM ('tenant', 'landlord', 'admin');
CREATE TYPE property_status AS ENUM ('draft', 'pending_verification', 'verified', 'occupied', 'delisted');
```
These enforce valid values at the database level.

## Troubleshooting

### "Database connection refused"
- Ensure Docker is running: `docker ps`
- Check container is healthy: `docker-compose logs db`
- Verify `DATABASE_URL` in `.env` matches the container setup

### "Missing JWT_SECRET or ENCRYPTION_KEY"
Generate new secrets:
```bash
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 32  # For ENCRYPTION_KEY
```

### "pgvector extension not found"
The Dockerfile.db installs pgvector. If you're using a local PostgreSQL:
```bash
# Install pgvector manually
CREATE EXTENSION vector;
```

### "PostGIS functions not available"
Similarly, install PostGIS:
```bash
CREATE EXTENSION postgis;
CREATE EXTENSION pgcrypto;
```

### "Port 8080 already in use"
Change the `PORT` in `.env`:
```env
PORT=3000
```

### "Rate limit exceeded"
The global rate limit is 100 req/min per IP. Wait a minute or change your IP.

## Development Workflow

### Making Changes to the Schema

1. **Never edit** `db/schema_initializer.sql` directly (it's the baseline).
2. **Create a patch** in `db/patches/` with timestamp:
   ```bash
   # Example: db/patches/2026-04-24_add_user_verified.sql
   ALTER TABLE users ADD COLUMN verified_at TIMESTAMP;
   ```
3. Apply manually:
   ```bash
   psql postgresql://user:password@localhost:5432/bachelorsspace_db < db/patches/2026-04-24_add_user_verified.sql
   ```

### Running Tests

```bash
go test ./...           # Run all tests
go test -v ./...        # Verbose output
go test -run TestAuth   # Run specific test
```

### Code Formatting

```bash
go fmt ./...            # Format all Go files
gofmt -w .              # In-place formatting
```

## Production Deployment

### Environment Setup
```env
ENV=production
DATABASE_URL=<production-postgres-url>
JWT_SECRET=<secure-random-32-bytes>
ENCRYPTION_KEY=<secure-random-32-bytes>
PAYMENTS_ENABLED=true
RAZORPAY_KEY_ID=rzp_live_<production-key>
RAZORPAY_KEY_SECRET=<production-secret>
RAZORPAY_WEBHOOK_SECRET=<production-webhook-secret>
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASS=<production-sendgrid-key>
```

### Build
```bash
go build -o bachelorsspace-api cmd/api/main.go
```

### Run
```bash
./bachelorsspace-api
```

Or via Docker:
```bash
docker build -t bachelorsspace-api:latest .
docker run --env-file .env -p 8080:8080 bachelorsspace-api:latest
```

## Next Steps

1. Read [Architecture.md](Architecture.md) to understand the layered design.
2. Explore [Codebase_Map.md](Codebase_Map.md) for a file-by-file guide.
3. Trace a feature in [Feature_Implementation_Trace.md](Feature_Implementation_Trace.md).
4. Study a request end-to-end in [Request_Lifecycle.md](Request_Lifecycle.md).

---

**Ready to code?** Start with the domain services in `internal/domain/` and understand how they interact with repositories in `internal/repository/`.
