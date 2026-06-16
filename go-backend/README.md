# BachelorsSpace Backend

A **DDD-Lite** Go backend for a roommate discovery and squad formation platform. Integrates spatial search (PostGIS), AI-driven matching (pgvector), secure payments (Razorpay), and real-time notifications.

## 🏗️ Architecture at a Glance

**Layered Design:**
```
HTTP Request
    ↓
Handlers (input parsing, validation)
    ↓
Services (business logic)
    ↓
Repositories (SQL via pgx)
    ↓
PostgreSQL (PostGIS, pgvector)
```

- **Handlers** are thin HTTP entry points that decode and validate input, then delegate to services.
- **Services** enforce business rules and orchestrate repositories without knowing about the database.
- **Repositories** implement raw SQL using pgx, abstracting all data persistence.
- **Router** (`internal/handler/router.go`) is the central dependency injection container that wires everything together.

## 🔐 Security & Hardening

- **JWT (HS256)**: Token-based authentication with role-based access control.
- **Rate Limiting**: Global 100 req/min, strict 10 req/min on `/auth` endpoints.
- **AES-256-GCM**: PII (phone, Aadhaar, PAN) encrypted at rest.
- **XSS Prevention**: Chat messages sanitized with bluemonday.
- **Webhook Verification**: HMAC-SHA256 validation for Razorpay events.
- **Input Validation**: Struct-based validation with `go-playground/validator`.

## 🗺️ Database Features

### PostGIS for Spatial Discovery
- Properties stored with WGS 84 coordinates (`GEOGRAPHY(Point, 4326)`).
- `ST_DWithin` queries find properties within a radius.
- GIST indexes accelerate distance lookups.

### pgvector for AI Squad Matchmaking
- 1536-dimensional personality embeddings (OpenAI).
- Async pipeline: profile updates → embedding generation → cosine similarity queries.
- ivfflat indexes optimize vector similarity search.

## 📚 Documentation

See **`docs/handbook/`** for comprehensive guides:

| Document | Purpose |
| --- | --- |
| **[Architecture.md](docs/handbook/Architecture.md)** | DDD-Lite design, security stack, database architecture |
| **[Codebase_Map.md](docs/handbook/Codebase_Map.md)** | Complete file-by-file directory breakdown |
| **[Feature_Implementation_Trace.md](docs/handbook/Feature_Implementation_Trace.md)** | Features mapped to specific code locations |
| **[Request_Lifecycle.md](docs/handbook/Request_Lifecycle.md)** | End-to-end request tracing with Mermaid diagram |
| **[Go_for_Java_Developers.md](docs/handbook/Go_for_Java_Developers.md)** | Go concepts for Java/Spring engineers |
| **[Go_for_Python_Developers.md](docs/handbook/Go_for_Python_Developers.md)** | Go concepts for Python engineers |
| **[Implementation_Guide.md](docs/handbook/Implementation_Guide.md)** | Setup, Docker, and database initialization |

## 🚀 Quick Start

### 1. Clone and Setup Environment

```bash
git clone <repo-url>
cd BachelorsSpace
cp .env.example .env
```

Edit `.env` with:
- `DATABASE_URL`: PostgreSQL connection (default: local Docker)
- `JWT_SECRET`: Generate with `openssl rand -hex 32`
- `ENCRYPTION_KEY`: Generate with `openssl rand -hex 32`
- Optional: Google Maps, OpenAI, Razorpay, SMTP keys

### 2. Start the Database

```bash
docker-compose up --build
```

This starts PostgreSQL with PostGIS and pgvector extensions. The schema initializer (db/schema_initializer.sql) runs automatically on first boot.

### 3. Run the API Server

```bash
go run cmd/api/main.go
```

The server starts on port 8080 (configurable via `PORT` env var).

### 4. Verify Health

```bash
curl -s http://localhost:8080/health | jq .
```

## 📦 Project Structure

```
BachelorsSpace/
├── cmd/api/                 # API entrypoint
├── db/                       # Schema and migrations
│   ├── schema_initializer.sql
│   └── patches/
├── docs/                     # Documentation
│   ├── handbook/            # Architecture handbook
│   ├── PROJECT_SRS.md
│   └── BACKEND_DEVELOPMENT_PLAN.md
├── internal/                 # Application code
│   ├── config/              # Env config loader
│   ├── domain/              # Domain models and services
│   │   ├── user/
│   │   ├── kyc/
│   │   ├── property/
│   │   ├── squad/
│   │   ├── transaction/
│   │   ├── verification/
│   │   └── notification/
│   ├── handler/             # HTTP handlers
│   ├── middleware/          # Auth, CORS, rate limiting
│   ├── pkg/                 # Shared packages
│   │   ├── crypto/          # AES-256-GCM
│   │   ├── email/           # SMTP mailer
│   │   ├── embedding/       # Vector generation
│   │   ├── payment/         # Razorpay gateway
│   │   └── respond/         # JSON helpers
│   └── repository/          # SQL data access
├── docker-compose.yml       # Local stack
├── Dockerfile.db            # PostGIS + pgvector image
├── .env.example             # Env template
├── go.mod                   # Go module definition
├── go.sum                   # Dependency checksums
└── README.md                # This file
```

## 🔄 Request Lifecycle Example

**POST /api/v1/squads/{squadId}/pay-token** (Tenant pays commitment fee)

```
1. Chi router + global middleware (rate limiting, CORS, logging)
2. /api/v1/payments mount
3. Auth middleware validates JWT, injects user_id/role
4. TransactionHandler.PayToken extracts payload
5. TransactionService.InitiateTokenPayment:
   - Validates squad/property exist
   - Creates transaction record
   - Calls Razorpay API
6. TransactionRepo.UpdateGatewayInfo stores order ref
7. JSON response with gateway details
```

See [Request_Lifecycle.md](docs/handbook/Request_Lifecycle.md) for full trace and Mermaid diagram.

## 🛠️ Core Modules

| Module | Feature | Files |
| --- | --- | --- |
| **1-7** | Auth, Users, KYC, Properties, Squads, Verification, Messages | `internal/domain/` + `internal/handler/` |
| **8** | Payments (Razorpay) | `internal/pkg/payment/razorpay_gateway.go` |
| **9** | In-app notifications + Email | `internal/domain/notification/` + `internal/pkg/email/` |
| **10** | AI Embeddings (OpenAI/Ollama) | `internal/pkg/embedding/worker.go` |

All modules are **fully implemented and tested**.

## 🔧 Development Commands

```bash
# Run the API
go run cmd/api/main.go

# Run tests
go test ./...

# Format code
go fmt ./...

# Check for linting issues (if golangci-lint is installed)
golangci-lint run

# Start database
docker-compose up --build

# Stop and clean up
docker-compose down -v
```

## 📋 Dependencies

| Package | Purpose |
| --- | --- |
| `github.com/go-chi/chi/v5` | HTTP router |
| `github.com/jackc/pgx/v5` | PostgreSQL driver |
| `github.com/golang-jwt/jwt/v5` | JWT handling |
| `github.com/go-playground/validator/v10` | Input validation |
| `golang.org/x/crypto` | Bcrypt, AES encryption |
| `github.com/go-chi/httprate` | Rate limiting |
| `github.com/microcosm-cc/bluemonday` | XSS sanitization |
| `github.com/rs/zerolog` | Structured logging |

See `go.mod` for full list.

## 🔐 Environment Variables

Required:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: HMAC secret for JWT signing
- `ENCRYPTION_KEY`: AES-256 key (64 hex chars)

Optional:
- `GOOGLE_MAPS_API_KEY`: Property geocoding
- `OPENAI_API_KEY`: Personality embeddings
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`: Payments
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`: Notifications
- `PAYMENTS_ENABLED`: Set to `true` to enable Razorpay (default: `false`)

See [.env.example](.env.example) for full template.

## 🧪 Testing the API

### Register a User
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice",
    "email": "alice@example.com",
    "password": "securepassword123",
    "role": "tenant"
  }'
```

### Login
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "securepassword123"
  }'
```

### Update Profile (Requires Auth)
```bash
curl -X PUT http://localhost:8080/api/v1/users/me/profile \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "lifestyle_tags": ["non-smoker", "early-riser"],
    "bio": "Love cooking and board games",
    "budget_min": 15000,
    "budget_max": 25000,
    "preferred_localities": ["Indiranagar", "Koramangala"]
  }'
```

For more examples, see feature traces in [Feature_Implementation_Trace.md](docs/handbook/Feature_Implementation_Trace.md).

## 🚢 Deployment

### Production Build
```bash
go build -o bachelorsspace-api cmd/api/main.go
```

### Docker
```bash
# Build API container
docker build -t bachelorsspace-api:latest .

# Run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

**Environment Requirements:**
- Go 1.23+
- PostgreSQL 16+ with PostGIS 3.4+ and pgvector 0.7+
- Optional: OpenAI or Ollama for embeddings

## 📖 Learning Paths

**For Java/Spring developers**: Start with [Go_for_Java_Developers.md](docs/handbook/Go_for_Java_Developers.md) to understand Go patterns in this codebase.

**For Python developers**: Start with [Go_for_Python_Developers.md](docs/handbook/Go_for_Python_Developers.md) for idiomatic Go analogies.

**For architecture deep-dives**: Read [Architecture.md](docs/handbook/Architecture.md) first, then trace a feature in [Feature_Implementation_Trace.md](docs/handbook/Feature_Implementation_Trace.md).

## 🐛 Troubleshooting

**Database connection fails:**
```bash
# Check if PostgreSQL is running
docker-compose ps

# View logs
docker-compose logs db
```

**JWT secret errors:**
```bash
# Generate new JWT_SECRET
openssl rand -hex 32
```

**Migration/Schema issues:**
```bash
# Reinitialize the database
docker-compose down -v
docker-compose up --build
```

## 📝 License

Proprietary. BachelorsSpace Backend © 2026.

## 👥 Contributors

Developed with Go 1.23, PostgreSQL 16, and PostGIS/pgvector extensions.

---

**For complete documentation, see [docs/handbook/](docs/handbook/).**
