# Codebase Map

Separation of concerns is strict: `internal/domain` holds core models and service interfaces, while `internal/repository` implements SQL for those interfaces. The router is the central nervous system that wires everything together (internal/handler/router.go:L27-L155).

## Directory Tree

```
BachelorsSpace/
├── cmd/                              # Application entrypoints
│   └── api/
│       └── main.go                   # API server bootstrap
│
├── db/                               # Database schema & migrations
│   ├── schema_initializer.sql        # Full schema (extensions, enums, tables, indexes)
│   └── patches/                      # Incremental SQL patches
│       ├── 2026-04-23_module9_10.sql
│       └── 2026-04-23_remove_mock_gateway.sql
│
├── docs/                             # Documentation
│   ├── PROJECT_SRS.md                # System requirements spec
│   ├── BACKEND_DEVELOPMENT_PLAN.md   # Module delivery plan
│   ├── AI_AGENT_CONTEXT.md           # Internal AI context
│   └── handbook/                     # Architecture handbook (NEW)
│       ├── Architecture.md           # DDD-Lite design, security, database
│       ├── Codebase_Map.md           # File-by-file guide
│       ├── Feature_Implementation_Trace.md
│       ├── Request_Lifecycle.md      # End-to-end request trace
│       ├── Go_for_Java_Developers.md # Go primer for Java engineers
│       ├── Go_for_Python_Developers.md # Go primer for Python engineers
│       └── Implementation_Guide.md   # Setup & deployment guide
│
├── internal/                         # Application code
│   ├── config/
│   │   └── config.go                 # Env config loader & validation
│   │
│   ├── domain/                       # Domain models & business logic
│   │   ├── user/
│   │   │   ├── service.go            # Auth, token generation, profile updates
│   │   │   └── user.go               # User model, inputs, error mapping
│   │   ├── kyc/
│   │   │   ├── service.go            # KYC submission & admin review
│   │   │   └── kyc.go                # KYC model
│   │   ├── property/
│   │   │   ├── service.go            # Property business rules
│   │   │   └── property.go           # Property model (with spatial coordinates)
│   │   ├── squad/
│   │   │   ├── service.go            # Squad lifecycle, invites, proposals
│   │   │   └── squad.go              # Squad models, repository interface
│   │   ├── transaction/
│   │   │   ├── service.go            # Payment initiation, webhooks
│   │   │   ├── transaction.go        # Transaction model
│   │   │   └── webhook.go            # Razorpay webhook parsing
│   │   ├── verification/
│   │   │   ├── service.go            # Admin verification pipeline
│   │   │   └── verification.go       # Verification model
│   │   └── notification/
│   │       ├── service.go            # Notification creation, email dispatch
│   │       └── notification.go       # Notification model
│   │
│   ├── handler/                      # HTTP handlers (input/output)
│   │   ├── auth_handler.go           # Register, login, refresh
│   │   ├── user_handler.go           # Profile endpoints
│   │   ├── kyc_handler.go            # KYC endpoints
│   │   ├── property_handler.go       # Property CRUD & search
│   │   ├── verification_handler.go   # Admin verification
│   │   ├── squad_handler.go          # Squad endpoints
│   │   ├── transaction_handler.go    # Payment endpoints
│   │   ├── message_handler.go        # Chat endpoints
│   │   ├── notification_handler.go   # Notification feed
│   │   └── router.go                 # Central DI container & route registry
│   │
│   ├── middleware/                   # HTTP middleware
│   │   ├── auth.go                   # JWT validation, role gating
│   │   ├── cors.go                   # CORS headers
│   │   ├── logger.go                 # Structured request logging
│   │   └── rate_limit.go             # IP-based rate limiting
│   │
│   ├── pkg/                          # Shared infrastructure packages
│   │   ├── apierror/
│   │   │   └── apierror.go           # API error type & constructors
│   │   ├── crypto/
│   │   │   └── crypto.go             # AES-256-GCM encryption/decryption
│   │   ├── email/
│   │   │   └── email.go              # SMTP mailer (async via goroutines)
│   │   ├── embedding/
│   │   │   ├── provider.go           # Embedding provider interface
│   │   │   ├── openai.go             # OpenAI client
│   │   │   ├── ollama.go             # Ollama client
│   │   │   └── worker.go             # Background embedding worker
│   │   ├── payment/
│   │   │   ├── gateway.go            # Gateway interface & Order model
│   │   │   ├── razorpay_gateway.go   # Razorpay API client
│   │   │   ├── disabled_gateway.go   # No-op gateway (when disabled)
│   │   │   └── mock_gateway.go       # Placeholder
│   │   ├── querybuilder/
│   │   │   └── querybuilder.go       # SQL WHERE clause builder
│   │   └── respond/
│   │       └── respond.go            # JSON response helpers
│   │
│   └── repository/                   # SQL data-access implementations
│       ├── user_repo.go              # User persistence, profile updates
│       ├── kyc_repo.go               # KYC persistence
│       ├── property_repo.go          # Property persistence, spatial search
│       ├── verification_repo.go      # Verification persistence
│       ├── squad_repo.go             # Squad persistence, pgvector matching
│       ├── transaction_repo.go       # Transaction ledger
│       ├── message_repo.go           # Message persistence
│       └── notification_repo.go      # Notification persistence
│
├── Dockerfile.db                     # DB image: PostGIS + pgvector on PostgreSQL
├── docker-compose.yml                # Local stack orchestration
├── .env.example                      # Environment template
├── .env                              # Local config (not tracked)
├── .gitignore                        # Git ignore rules
├── go.mod                            # Go module definition
├── go.sum                            # Dependency checksums
├── Makefile                          # Developer shortcuts
└── README.md                         # Project overview
```

| Path | Purpose |
| --- | --- |
| `.git/` | Git metadata (not part of runtime). |
| `.env` | Local environment variables for development (untracked). |
| `.env.example` | Environment template and required variables. |
| `.gitignore` | Git ignore rules. |
| `Dockerfile.db` | PostGIS base image with pgvector installed for the DB container. |
| `Makefile` | Developer shortcuts for common tasks. |
| `docker-compose.yml` | Local stack orchestration (API + PostGIS container). |
| `go.mod` | Go module definition and dependencies. |
| `go.sum` | Dependency checksums. |
| `cmd/` | Application entrypoints. |
| `cmd/api/` | API server entrypoint package. |
| `cmd/api/main.go` | Bootstraps config, DB pool, background workers, and HTTP server. |
| `db/` | Database schema and migration patches. |
| `db/schema_initializer.sql` | Full schema: extensions, enums, tables, indexes, seed data. |
| `db/patches/` | Incremental SQL patches. |
| `db/patches/2026-04-23_module9_10.sql` | Patch for Module 9/10 updates. |
| `db/patches/2026-04-23_remove_mock_gateway.sql` | Patch to transition gateway values to Razorpay. |
| `docs/` | Existing product/engineering documentation. |
| `docs/PROJECT_SRS.md` | System requirements specification. |
| `docs/BACKEND_DEVELOPMENT_PLAN.md` | Delivery plan and module sequencing. |
| `docs/AI_AGENT_CONTEXT.md` | Internal context for AI-assisted development. |
| `docs/handbook/` | New backend handbook (this deliverable). |
| `docs/handbook/Architecture.md` | System design and security/database overview. |
| `docs/handbook/Codebase_Map.md` | Recursive directory and file guide. |
| `docs/handbook/Feature_Implementation_Trace.md` | Feature-to-code traceability map. |
| `docs/handbook/Request_Lifecycle.md` | End-to-end request trace with Mermaid diagram. |
| `docs/handbook/Go_for_Java_Developers.md` | Go primer for Java/Spring engineers. |
| `docs/handbook/Go_for_Python_Developers.md` | Go primer for Python engineers. |
| `docs/handbook/Implementation_Guide.md` | Setup, Docker, and schema bootstrapping guide. |
| `internal/` | Application code (handlers, domain logic, repositories, middleware, shared packages). |
| `internal/config/` | Environment configuration loader and validation. |
| `internal/config/config.go` | Config struct, env loading, and validation rules. |
| `internal/domain/` | Domain models, service interfaces, and business logic. |
| `internal/domain/user/` | User and auth domain. |
| `internal/domain/user/service.go` | User service, JWT issuance, profile updates. |
| `internal/domain/user/user.go` | User model, inputs, domain errors, error mapping. |
| `internal/domain/kyc/` | Landlord KYC domain. |
| `internal/domain/kyc/service.go` | KYC submission and admin review logic. |
| `internal/domain/kyc/kyc.go` | KYC model, inputs, and error mapping. |
| `internal/domain/property/` | Property listing domain. |
| `internal/domain/property/service.go` | Property business rules and KYC gating. |
| `internal/domain/property/property.go` | Property model, inputs, and error mapping. |
| `internal/domain/squad/` | Squad and matchmaking domain. |
| `internal/domain/squad/service.go` | Squad lifecycle and invite/proposal logic. |
| `internal/domain/squad/squad.go` | Squad models, enums, and repository interface. |
| `internal/domain/transaction/` | Payments and ledger domain. |
| `internal/domain/transaction/service.go` | Payment initiation, webhook processing, move-in confirmation. |
| `internal/domain/transaction/transaction.go` | Transaction model and constants. |
| `internal/domain/transaction/webhook.go` | Razorpay webhook payload parsing. |
| `internal/domain/verification/` | Property verification domain. |
| `internal/domain/verification/service.go` | Admin verification pipeline and promotion rules. |
| `internal/domain/verification/verification.go` | Verification model, inputs, and error mapping. |
| `internal/domain/notification/` | Notifications domain. |
| `internal/domain/notification/service.go` | In-app notification creation and email dispatch. |
| `internal/handler/` | HTTP handlers (decoding, validation, response shaping). |
| `internal/handler/auth_handler.go` | Register, login, refresh endpoints. |
| `internal/handler/user_handler.go` | Profile read/update endpoints. |
| `internal/handler/kyc_handler.go` | KYC submission and admin review endpoints. |
| `internal/handler/property_handler.go` | Property create, read, and search endpoints. |
| `internal/handler/verification_handler.go` | Admin verification endpoints. |
| `internal/handler/squad_handler.go` | Squad lookup, matching, invites, proposals endpoints. |
| `internal/handler/transaction_handler.go` | Token payment, webhook, and move-in endpoints. |
| `internal/handler/message_handler.go` | Squad chat endpoints and XSS sanitization. |
| `internal/handler/notification_handler.go` | Notification feed and read endpoints. |
| `internal/handler/router.go` | Central route wiring and dependency injection. |
| `internal/middleware/` | HTTP middleware for auth, CORS, logging, rate limiting. |
| `internal/middleware/auth.go` | JWT validation and role gating. |
| `internal/middleware/cors.go` | CORS headers and preflight handling. |
| `internal/middleware/logger.go` | Structured request logging. |
| `internal/middleware/rate_limit.go` | IP-based rate limiter wrapper. |
| `internal/pkg/` | Shared infrastructure packages (crypto, email, payments, etc.). |
| `internal/pkg/apierror/` | API error type and constructors. |
| `internal/pkg/apierror/apierror.go` | Error codes and mapping helpers. |
| `internal/pkg/crypto/` | AES-256-GCM encryption/decryption utilities. |
| `internal/pkg/crypto/crypto.go` | Encryptor implementation for PII. |
| `internal/pkg/email/` | SMTP mailer utilities. |
| `internal/pkg/email/email.go` | Async email dispatch via SMTP. |
| `internal/pkg/embedding/` | AI embedding providers and worker. |
| `internal/pkg/embedding/provider.go` | Embedding provider interface. |
| `internal/pkg/embedding/openai.go` | OpenAI embeddings client. |
| `internal/pkg/embedding/ollama.go` | Ollama embeddings client. |
| `internal/pkg/embedding/worker.go` | Background worker for pending embeddings. |
| `internal/pkg/payment/` | Payment gateways and interface. |
| `internal/pkg/payment/gateway.go` | Gateway interface and Order model. |
| `internal/pkg/payment/razorpay_gateway.go` | Razorpay API client and webhook verification. |
| `internal/pkg/payment/disabled_gateway.go` | Safe no-op gateway when payments are disabled. |
| `internal/pkg/payment/mock_gateway.go` | Placeholder (intentionally empty, retained for history). |
| `internal/pkg/querybuilder/` | SQL query builder for dynamic filters. |
| `internal/pkg/querybuilder/querybuilder.go` | Helper for parameterized WHERE clauses. |
| `internal/pkg/respond/` | JSON response helpers. |
| `internal/pkg/respond/respond.go` | Response envelope and error writer. |
| `internal/repository/` | SQL data-access implementations. |
| `internal/repository/user_repo.go` | User persistence and profile updates. |
| `internal/repository/kyc_repo.go` | KYC persistence and admin review queries. |
| `internal/repository/property_repo.go` | Property persistence and spatial search. |
| `internal/repository/verification_repo.go` | Verification persistence and queries. |
| `internal/repository/squad_repo.go` | Squad persistence and pgvector matching query. |
| `internal/repository/transaction_repo.go` | Transaction ledger persistence and gateway updates. |
| `internal/repository/message_repo.go` | Squad message persistence and read tracking. |
| `internal/repository/notification_repo.go` | Notification feed persistence and read tracking. |
