# BachelorsSpace Backend Architecture

## Overview

This backend is a **DDD-Lite** (Domain-Driven Design) stack built in Go. The architecture emphasizes separation of concerns, explicit dependency injection, and testability. The key principle: **handlers are thin HTTP entry points, services carry domain logic, and repositories encapsulate all database access**. This layering makes the code resilient to framework changes and easy to reason about at scale.

## Layered Architecture: Handlers → Services → Repositories

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          HTTP Request                               │
│                   POST /api/v1/auth/login                           │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
        ┌────────────────────────────────────────────────┐
        │   LAYER 1: HTTP HANDLER (Entry Point)          │
        │   ────────────────────────────────────────────│
        │   • Parse request body                          │
        │   • Validate input (validator library)          │
        │   • Call service method                         │
        │   • Shape JSON response                         │
        │                                                │
        │   AuthHandler.Login(w, r)                      │
        └────────────────────────────────────────────────┘
                                 ↓
        ┌────────────────────────────────────────────────┐
        │   LAYER 2: DOMAIN SERVICE (Business Logic)     │
        │   ────────────────────────────────────────────│
        │   • Enforce business rules                      │
        │   • Check constraints                           │
        │   • Call repository (via interface)             │
        │   • Return (result, error)                      │
        │                                                │
        │   user.Service.Login(ctx, email, password)     │
        │   └─→ repo.GetByEmail (interface, not impl)    │
        └────────────────────────────────────────────────┘
                                 ↓
        ┌────────────────────────────────────────────────┐
        │   LAYER 3: REPOSITORY (Data Persistence)       │
        │   ────────────────────────────────────────────│
        │   • Execute SQL via pgx                         │
        │   • Scan rows into structs                      │
        │   • Handle DB errors                           │
        │   • Manage indexes & optimization               │
        │                                                │
        │   user_repo.GetByEmail(ctx, email)            │
        │   └─→ SELECT * FROM users WHERE email = $1     │
        └────────────────────────────────────────────────┘
                                 ↓
        ┌────────────────────────────────────────────────┐
        │   PostgreSQL (PostGIS, pgvector)                │
        │   ────────────────────────────────────────────│
        │   Tables: users, properties, squads, ...        │
        │   Extensions: PostGIS, pgvector, pgcrypto       │
        │   Indexes: GIST (spatial), ivfflat (vectors)    │
        └────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          HTTP Response                              │
│                    200 OK + Token JSON                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Dependency Injection via Router

```
┌─ Router (internal/handler/router.go) ──────────────────────────┐
│                                                                │
│  1. Create Repositories:                                      │
│     userRepo := repository.NewUserRepo(pool)                 │
│     propertyRepo := repository.NewPropertyRepo(pool)         │
│                                                                │
│  2. Create Services (inject repos as interfaces):            │
│     userService := user.NewService(userRepo, jwtSecret)     │
│     propertyService := property.NewService(propertyRepo)    │
│                                                                │
│  3. Create Handlers (inject services):                       │
│     authHandler := NewAuthHandler(userService)              │
│     propertyHandler := NewPropertyHandler(propertyService)  │
│                                                                │
│  4. Mount Routes with Middleware:                            │
│     r.Route("/api/v1", func(r chi.Router) {                │
│       r.Post("/auth/login", authHandler.Login)             │
│       r.Get("/properties", propertyHandler.Search)         │
│     })                                                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Layer 1: HTTP Handlers (Entry Points)
Handlers are responsible for:
- Decoding and parsing HTTP request bodies into strongly-typed structs
- Validating input using the `github.com/go-playground/validator` library
- Delegating business logic to services
- Shaping and encoding JSON responses

Example: `AuthHandler.Login` (internal/handler/auth_handler.go:L15-L105) parses a `LoginInput`, validates it, calls `userService.Login()`, and returns tokens.

### Layer 2: Domain Services (Business Logic)
Services enforce all business rules and workflows. They:
- Depend on **interfaces** defined in the domain package, not concrete repositories
- Accept `context.Context` as the first parameter for request-scoped cancellation
- Return `(result, error)` tuples following Go idiom
- Orchestrate multiple repositories if needed (e.g., transactional flows)

Example: `user.Service.Register` (internal/domain/user/service.go:L28-L48) checks if the email exists, hashes the password, and calls the repository to persist. The service depends on `Repository` interface (internal/domain/user/service.go:L18-L26), not the concrete `user_repo.go`.

### Layer 3: Repositories (Data Persistence)
Repositories implement the domain's repository interfaces and provide SQL-level operations:
- Each repository corresponds to a domain entity (User, Property, Squad, etc.)
- Raw SQL is written explicitly using pgx (not an ORM)
- Scanning is manual: database rows → struct fields
- All database setup, indexing, and optimization lives here

Example: `user_repo.GetByEmail` (internal/repository/user_repo.go:L28-L43) executes a parameterized query and scans the result into a `User` struct.

## Security Stack

### Security Layers Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Incoming HTTP Request                         │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
        ┌────────────────────────────────────────────────┐
        │  RATE LIMITING (IP-based)                      │
        │  ────────────────────────────────────         │
        │  • Global: 100 req/min per IP                 │
        │  • /auth: 10 req/min per IP (stricter)        │
        └────────────────────────────────────────────────┘
                                 ↓
        ┌────────────────────────────────────────────────┐
        │  JWT VALIDATION (Auth Middleware)              │
        │  ────────────────────────────────────         │
        │  • Extract Bearer token from header            │
        │  • Verify HMAC-SHA256 signature                │
        │  • Check expiration & token_type               │
        │  • Inject user_id + role into context          │
        └────────────────────────────────────────────────┘
                                 ↓
        ┌────────────────────────────────────────────────┐
        │  INPUT VALIDATION                              │
        │  ────────────────────────────────────         │
        │  • Struct-based validation (go-playground)    │
        │  • Type checking                               │
        │  • Reject if validation fails (400 Bad Req)    │
        └────────────────────────────────────────────────┘
                                 ↓
        ┌────────────────────────────────────────────────┐
        │  BUSINESS LOGIC (Service)                      │
        │  ────────────────────────────────────         │
        │  • Enforce domain rules                        │
        │  • Sanitize XSS (bluemonday for messages)      │
        │  • Encrypt sensitive fields (AES-256-GCM)      │
        │  • Call repository with validated data         │
        └────────────────────────────────────────────────┘
                                 ↓
        ┌────────────────────────────────────────────────┐
        │  DATA PERSISTENCE (Repository → PostgreSQL)    │
        │  ────────────────────────────────────         │
        │  • Parameterized queries (prevent SQL inject)  │
        │  • Encrypted fields stored as bytea            │
        │  • Foreign keys enforce referential integrity  │
        │  • Enums enforce type safety                   │
        └────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       HTTP Response (JSON)                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 1. Authentication: JWT (HS256)
- **Token Generation**: The `user.Service` generates access and refresh token pairs (internal/domain/user/service.go:L113-L168). Both are signed with HMAC-SHA256 using the `JWT_SECRET` from `.env`.
- **Token Claims**: Access tokens include `user_id`, `role`, and `token_type=access`. Refresh tokens set `token_type=refresh`.
- **Validation**: The `Auth` middleware (internal/middleware/auth.go:L26-L75) extracts the Bearer token from the `Authorization` header, parses it, verifies the signature, checks expiration, and validates `token_type=access`. On success, it injects `user_id` and `role` into the request context.
- **Role-Based Access Control**: The `RequireRole` middleware enforces role gates (e.g., only landlords can create properties).

### JWT Token Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     LOGIN REQUEST                               │
│                POST /api/v1/auth/login                          │
│           {email, password}                                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────┐
        │ AuthHandler.Login                │
        │ → Validate input                 │
        │ → Call UserService.Login()       │
        └──────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────┐
        │ UserService.Login                │
        │ → Query user by email            │
        │ → Compare bcrypt hash            │
        │ → Generate token pair            │
        └──────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────────────────┐
        │ signToken (internal/domain/user/service.go)  │
        │ Payload:                                     │
        │ {                                            │
        │   "user_id": "uuid",                        │
        │   "role": "tenant",                         │
        │   "token_type": "access",                   │
        │   "exp": 3600 (1 hour)                      │
        │ }                                            │
        │                                              │
        │ Signed with: JWT.Sign(payload, JWT_SECRET) │
        │ Result: eyJhbGc... (encoded token)          │
        └──────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    200 OK RESPONSE                              │
│        { access_token, refresh_token, user }                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Rate Limiting: IP-Based Throttling
- **Global Limit**: 100 requests per minute per IP address (internal/handler/router.go:L86-L93) applied to all endpoints.
- **Auth Endpoints**: Stricter 10 requests per minute limit on `/auth/*` routes (internal/handler/router.go:L103-L107) to prevent brute-force attacks.
- **Implementation**: Uses `github.com/go-chi/httprate` with chi middleware composition (internal/middleware/rate_limit.go:L10-L13).

### 3. Input Validation & XSS Prevention
- **Struct Validation**: All request bodies are validated using `github.com/go-playground/validator` struct tags (e.g., `validate:"required,email"`). Requests with validation errors are rejected with 400 Bad Request.
- **Message Sanitization**: Chat messages are sanitized using `bluemonday` strict policy before persistence (internal/handler/message_handler.go:L108-L112). This removes all HTML/JavaScript, preventing stored XSS.
- **PII Encryption**: Sensitive fields (phone, Aadhaar, PAN) are encrypted with AES-256-GCM before storage (see below).

### 4. Encryption: AES-256-GCM for PII

```
┌──────────────────────────────────────────────────────┐
│         PII ENCRYPTION PIPELINE                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Input: Plaintext PII (phone, Aadhaar, PAN)         │
│           ↓                                          │
│  ┌─────────────────────────────────┐                │
│  │ crypto.Encryptor.Encrypt()      │                │
│  │ ────────────────────────────────│                │
│  │ 1. Generate random 128-bit nonce│                │
│  │ 2. Use ENCRYPTION_KEY (32 bytes)│                │
│  │ 3. AES-256-GCM cipher           │                │
│  │ 4. Authenticate (GCM)           │                │
│  │ 5. Return: nonce + ciphertext   │                │
│  └─────────────────────────────────┘                │
│           ↓                                          │
│  Output: bytea (binary) in DB                       │
│           ↓                                          │
│  On retrieval: Decrypt with same key                │
│           ↓                                          │
│  Result: Original plaintext                         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- **Implementation**: The `crypto.Encryptor` provides `Encrypt()` and `Decrypt()` methods (internal/pkg/crypto/crypto.go:L1-L79). Uses AES-256 in GCM mode with a 128-bit random nonce.
- **Key Derivation**: The `ENCRYPTION_KEY` from `.env` must be exactly 64 hex characters (32 bytes). Generate with `openssl rand -hex 32`.
- **Where It's Used**: 
  - User phone is encrypted on registration (internal/domain/user/service.go).
  - KYC submission encrypts Aadhaar and PAN before writing to the database (internal/domain/kyc/service.go:L55-L61).
  - Encrypted fields are stored as bytea in the database.

### 5. Webhook Integrity: HMAC-SHA256 Verification

```
┌───────────────────────────────────────────────────────────┐
│              RAZORPAY WEBHOOK VERIFICATION                │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ Incoming webhook from Razorpay:                          │
│ {                                                         │
│   "event": "payment.authorized",                         │
│   "payload": { ... },                                    │
│   "X-Razorpay-Signature": "abcd1234..."                 │
│ }                                                         │
│           ↓                                              │
│ ┌──────────────────────────────────────────┐            │
│ │ VerifyWebhook()                          │            │
│ │ ────────────────────────────────────────│            │
│ │ 1. Reconstruct payload from request body│            │
│ │ 2. Compute HMAC-SHA256:                 │            │
│ │    HMAC = SHA256(payload, webhook_secret)            │
│ │ 3. Compare with X-Razorpay-Signature    │            │
│ └──────────────────────────────────────────┘            │
│           ↓                                              │
│    If valid: Process payment event                      │
│    If invalid: Reject webhook (403 Forbidden)           │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

- **Razorpay Webhooks**: Payment events arrive signed from Razorpay. The `VerifyWebhook` method (internal/pkg/payment/razorpay_gateway.go:L106-L124) reconstructs the payload, computes HMAC-SHA256 using the webhook secret, and compares with the signature header.
- **Rejection**: If the signature is invalid, the transaction service rejects the webhook (internal/domain/transaction/service.go:L112-L115), preventing fake payment notifications.

### 6. CORS: Cross-Origin Resource Sharing
- **Configuration**: CORS headers are set in the router middleware (internal/middleware/cors.go). Allowed origins, methods, and credentials are configurable.
- **Purpose**: Allows the web and mobile frontends to make API calls from different origins safely.

## Security Stack

- **JWT (HS256)**: Access and refresh tokens are signed in user.Service (`generateTokenPair`, `signToken`) and validated in `parseToken` (internal/domain/user/service.go:L113-L168). Request authentication uses the `Auth` middleware which parses Bearer tokens, enforces `token_type=access`, and injects `user_id` + `role` into context (internal/middleware/auth.go:L26-L75).
- **Rate limiting**: Global throttle is enforced at 100 req/min (internal/handler/router.go:L86-L93) and a stricter 10 req/min limit wraps `/auth` endpoints (internal/handler/router.go:L103-L107). The limiter is httprate-based (internal/middleware/rate_limit.go:L10-L13).
- **XSS sanitization**: Chat messages are sanitized with bluemonday strict policy before persisting (internal/handler/message_handler.go:L108-L112).
- **AES-256 for PII**: The crypto package provides AES-256-GCM encryption/decryption (internal/pkg/crypto/crypto.go:L1-L79) and KYC submission encrypts Aadhaar/PAN before storage (internal/domain/kyc/service.go:L55-L61).
- **Razorpay webhook integrity**: Webhooks are validated using HMAC-SHA256 signatures (internal/pkg/payment/razorpay_gateway.go:L106-L124) and rejected in the transaction service if invalid (internal/domain/transaction/service.go:L112-L115).

## Database Design

- **PostGIS for spatial discovery**: PostGIS is enabled via extensions (db/schema_initializer.sql:L14-L16). Properties store `location` as `GEOGRAPHY(Point, 4326)` (db/schema_initializer.sql:L228-L235), and queries use `ST_DWithin` for radius search (internal/repository/property_repo.go:L93-L96). A GIST index accelerates spatial lookup (db/schema_initializer.sql:L504-L507).
- **pgvector for matchmaking**: The `vector` extension is enabled (db/schema_initializer.sql:L14-L16); `users.personality_embedding` holds 1536-dim vectors (db/schema_initializer.sql:L170-L180). An ivfflat cosine index is created for fast similarity search (db/schema_initializer.sql:L508-L512). Squad matching uses cosine similarity directly in SQL (internal/repository/squad_repo.go:L65-L80).
- **Async embedding pipeline**: User profile updates mark `pending_embeddings` in SQL (internal/repository/user_repo.go:L122-L133). A background worker generates embeddings and updates the vector column (internal/pkg/embedding/worker.go:L25-L99), started at boot (cmd/api/main.go:L66-L79).
