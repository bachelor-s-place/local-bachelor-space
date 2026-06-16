# Feature Implementation Trace

This document maps each major feature to specific code locations, enabling quick navigation during debugging, feature extensions, or knowledge transfer.

## Feature Dependency Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    MODULES & FEATURES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Auth Module │  │ Property Mod │  │ Squad Module │           │
│  ├─────────────┤  ├──────────────┤  ├──────────────┤           │
│  │ • Register  │  │ • Create     │  │ • Browse     │           │
│  │ • Login     │  │ • Search     │  │ • Match (AI) │           │
│  │ • JWT Mgmt  │  │ • Verify     │  │ • Form       │           │
│  │ • Rate Limit│  │ • GIS Search │  │ • Invite     │           │
│  └─────────────┘  └──────────────┘  └──────────────┘           │
│                                            ↓                    │
│                                  ┌─────────────────┐            │
│                                  │ Payment Module  │            │
│                                  ├─────────────────┤            │
│                                  │ • Token Payment │            │
│                                  │ • Razorpay      │            │
│                                  │ • Move-in Fee   │            │
│                                  │ • Webhook       │            │
│                                  └─────────────────┘            │
│                                            ↓                    │
│                                  ┌─────────────────┐            │
│                                  │ Notification Mod│            │
│                                  ├─────────────────┤            │
│                                  │ • In-app Feed   │            │
│                                  │ • Email         │            │
│                                  │ • Events        │            │
│                                  └─────────────────┘            │
│                                                                 │
│  All modules use:                                              │
│  ✓ JWT Authentication                                          │
│  ✓ Input Validation                                            │
│  ✓ Error Handling                                              │
│  ✓ PostgreSQL with PostGIS/pgvector                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Feature Trace Table

| Feature | File | Functions and line references |
| --- | --- | --- |
| **Auth and Security** | | |
| JWT Token Generation | internal/domain/user/service.go | `generateTokenPair`, `signToken`, `parseToken` (L113-L168) |
| Auth Middleware | internal/middleware/auth.go | `Auth`, `RequireRole` (L26-L99) |
| Rate Limiting | internal/handler/router.go | Global (100/min) and auth (10/min) limits (L86-L107) |
| Rate Limiter | internal/middleware/rate_limit.go | `RateLimit` (L10-L13) |
| Message XSS Sanitization | internal/handler/message_handler.go | `SendMessage` XSS sanitization (L82-L112) |
| PII Encryption | internal/pkg/crypto/crypto.go | `New`, `Encrypt`, `Decrypt` (L24-L79) |
| **KYC & Verification** | | |
| KYC Submission Handler | internal/handler/kyc_handler.go | `SubmitKYC`, `AdminReviewKYC` (L29-L95) |
| KYC Business Logic | internal/domain/kyc/service.go | `SubmitKYC`, `ReviewKYC` (L37-L97) |
| KYC Persistence | internal/repository/kyc_repo.go | `CreateKYC`, `UpdateStatus`, `ListPending` (L48-L161) |
| Property Verification | internal/domain/verification/service.go | `SubmitVerification`, `Approve`, `Reject` |
| **AI Squad Matchmaking** | | |
| Match API Endpoint | internal/handler/squad_handler.go | `GetMatches` (L80-L92) |
| Match Algorithm | internal/domain/squad/service.go | `GetMatches` (L33-L46) |
| Vector Similarity Query | internal/repository/squad_repo.go | `FindMatches` (cosine similarity) (L65-L80) |
| Match Result Model | internal/domain/squad/squad.go | `MatchResult` (L96-L103) |
| Embedding Generation | internal/pkg/embedding/worker.go | `Start`, `processPending` (L25-L99) |
| Profile Update Trigger | internal/repository/user_repo.go | `UpdateProfile` sets `pending_embeddings` (L122-L133) |
| **Payments & Razorpay** | | |
| Payment API Handler | internal/handler/transaction_handler.go | `PayToken`, `HandleWebhook` (L43-L90) |
| Payment Service | internal/domain/transaction/service.go | `InitiateTokenPayment`, `ProcessWebhook` (L40-L174) |
| Razorpay Gateway | internal/pkg/payment/razorpay_gateway.go | `CreateOrder`, `VerifyWebhook` (L41-L127) |
| Webhook Parsing | internal/domain/transaction/webhook.go | `extractOrderIDFromWebhook` (L21-L32) |
| Transaction Persistence | internal/repository/transaction_repo.go | `Create`, `UpdateGatewayInfo`, `MarkSuccess` (L21-L67) |
| **Notifications** | | |
| Notification Service | internal/domain/notification/service.go | `Notify`, `TokenPaymentSuccess`, `MoveInConfirmed` (L23-L64) |
| Notification Feed | internal/repository/notification_repo.go | `Create`, `GetForUser`, `MarkOneRead`, `MarkAllRead` (L34-L135) |
| Notification API | internal/handler/notification_handler.go | `GetNotifications`, `MarkOneRead`, `MarkAllRead` (L35-L93) |
| Email Dispatch | internal/pkg/email/email.go | `Send` (async via goroutine) (L35-L47) |

## Feature Flow Diagrams

### 1. Auth & Registration Flow

```
User Registration Request
         ↓
    AuthHandler.Register
         ↓
┌─────────────────────────────────┐
│  Input Validation               │
│  • Name (2-100 chars)           │
│  • Email (valid email)          │
│  • Password (min 8 chars)       │
│  • Role (tenant/landlord only)  │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│  UserService.Register           │
│  1. Check email not exists       │
│  2. Hash password (bcrypt)       │
│  3. Encrypt phone (AES-256)      │
│  4. Call repo.Create()           │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│  UserRepo.Create()              │
│  • INSERT into users table       │
│  • Store encrypted phone         │
│  • Return generated UUID         │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│  UserService.generateTokenPair  │
│  1. Create JWT payload          │
│  2. Sign with JWT_SECRET        │
│  3. Return {access, refresh}    │
└─────────────────────────────────┘
         ↓
    201 Created Response
    {user, access_token, refresh_token}
```

### 2. AI Squad Matchmaking Flow

```
User Updates Profile (Bio, Tags, Budget)
         ↓
┌─────────────────────────────────────┐
│  UserHandler.UpdateProfile          │
│  → Validate input                   │
│  → Call UserService.UpdateProfile   │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  UserService.UpdateProfile          │
│  → Update user fields               │
│  → Mark pending_embeddings=true     │
│  → UserRepo.UpdateProfile           │
└─────────────────────────────────────┘
         ↓
[Background Worker - Polls every N seconds]
         ↓
┌─────────────────────────────────────┐
│  embedding.Worker.processPending()  │
│  1. Find users with pending flag    │
│  2. Extract profile text (bio+tags) │
│  3. Call OpenAI API                 │
│  4. Get 1536-dim vector             │
│  5. Store in user.personality_embed │
│  6. Mark pending_embeddings=false   │
└─────────────────────────────────────┘
         ↓
[Later] Tenant Searches for Matches
         ↓
┌─────────────────────────────────────┐
│  SquadHandler.GetMatches            │
│  → Extract user_id from JWT         │
│  → Call service.GetMatches()        │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  SquadService.GetMatches            │
│  → Load current user's embedding    │
│  → Call repo.FindMatches()          │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  SquadRepo.FindMatches              │
│  SQL:                               │
│  SELECT * FROM users               │
│  ORDER BY personality_embedding <=> │
│           $1 LIMIT 10               │
│  (Cosine similarity, pgvector)      │
└─────────────────────────────────────┘
         ↓
    200 OK {matches: [{user, score}, ...]}
```

### 3. Payment & Razorpay Integration

```
Tenant Initiates Token Payment
         ↓
┌─────────────────────────────────────┐
│  POST /api/v1/payments/...          │
│  Headers: Authorization: Bearer JWT │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  Auth Middleware                    │
│  → Validate JWT                     │
│  → Inject user_id into context      │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  TransactionHandler.PayToken        │
│  → Extract user_id, squad_id        │
│  → Call service.InitiateTokenPayment│
└─────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│  TransactionService.InitiateTokenPayment │
│  1. Load squad & property                │
│  2. Compute amount (% of rent)           │
│  3. TransactionRepo.Create()             │
│     └→ INSERT (status=initiated)         │
│  4. Call RazorpayGateway.CreateOrder()   │
│  5. TransactionRepo.UpdateGatewayInfo()  │
│     └→ UPDATE (gateway_order_id)         │
└──────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  RazorpayGateway.CreateOrder        │
│  → HTTP POST to Razorpay API        │
│  → Parse order response             │
│  → Return {id, key_id, ...}         │
└─────────────────────────────────────┘
         ↓
    200 OK {transaction, order}
    Client uses order data to open checkout
         ↓
[User completes payment in Razorpay modal]
         ↓
┌─────────────────────────────────────┐
│  Razorpay Webhook Callback          │
│  POST /api/v1/payments/webhook      │
│  {event, payload, signature}        │
└─────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│  TransactionHandler.HandleWebhook        │
│  → Validate signature (HMAC-SHA256)      │
│  → Call service.ProcessWebhook()         │
└──────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│  TransactionService.ProcessWebhook       │
│  1. Extract order_id from payload        │
│  2. Update transaction status=success    │
│  3. Call NotificationService            │
│     └→ TokenPaymentSuccess notification │
│  4. Send email                           │
└──────────────────────────────────────────┘
         ↓
    200 OK (webhook acknowledged)
```

### 4. KYC & Verification Pipeline

```
Landlord Submits KYC
         ↓
┌─────────────────────────────────────┐
│  POST /api/v1/kyc/submit            │
│  {aadhaar, pan, photo_url}          │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  KYCHandler.SubmitKYC               │
│  → Validate input                   │
│  → Extract user_id from JWT         │
│  → Call service.SubmitKYC()         │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  KYCService.SubmitKYC               │
│  1. Encrypt Aadhaar (AES-256)       │
│  2. Encrypt PAN (AES-256)           │
│  3. KYCRepo.CreateKYC()             │
│  4. Notify admins                   │
└─────────────────────────────────────┘
         ↓
    201 Created {kyc_id}
         ↓
[Admin Reviews - Manual Process]
         ↓
┌─────────────────────────────────────┐
│  POST /api/v1/kyc/{id}/approve      │
│  Admin-only endpoint                │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  KYCHandler.AdminReviewKYC          │
│  → Check admin role                 │
│  → Call service.ReviewKYC()         │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  KYCService.ReviewKYC               │
│  1. Update status=approved          │
│  2. Update user.kyc_status          │
│  3. Notify landlord                 │
└─────────────────────────────────────┘
         ↓
    200 OK {kyc_status: "approved"}
         ↓
Landlord can now create properties
```

## Cross-Cutting Concerns

### Error Handling Pattern

Every feature follows the same error handling pattern:

```go
result, err := repository.SomeOperation(ctx, args)
if err != nil {
    return nil, fmt.Errorf("context: %w", err)
}
// Handle nil checks
if result == nil {
    return nil, apierror.NotFound("resource not found")
}
// Continue with business logic
```

### Validation Pattern

All handlers validate input using struct tags:

```go
type SomeInput struct {
    Field1 string `json:"field1" validate:"required,min=3,max=100"`
    Field2 *int   `json:"field2,omitempty" validate:"omitempty,min=0"`
}

if err := validator.Validate(input); err != nil {
    return apierror.ValidationError(err)
}
```

### Database Transactions

Single INSERT/UPDATE/DELETE operations are atomic by default. Complex workflows (e.g., payment success → squad update → notification) rely on PostgreSQL's durability and application-level coordination.

---

**For complete request tracing, see [Request_Lifecycle.md](Request_Lifecycle.md).**
