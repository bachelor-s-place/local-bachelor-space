# Request Lifecycle: POST /api/v1/payments/squads/{squadId}/pay-token

The actual route is mounted under `/api/v1/payments` (internal/handler/router.go:L99-L110), and the transaction handler adds the `/squads/{squadId}/pay-token` path with JWT protection (internal/handler/transaction_handler.go:L25-L33). The flow below traces the end-to-end journey from the chi router to the database update and final JSON response.

## Step-by-Step Flow

### 1. Chi Router & Global Middleware
Request enters the router, which applies request ID, real IP, logging, CORS, recovery, and the global 100 req/min rate limit (internal/handler/router.go:L86-L93). The `/api/v1` route mounts `/payments` to the transaction handler (internal/handler/router.go:L99-L110).

### 2. Auth Middleware (Route-Specific)
The transaction handler applies `middleware.Auth` to the pay-token path, injecting `user_id` and `role` into the context. If the Authorization header is missing or invalid, 401 Unauthorized is returned (internal/handler/transaction_handler.go:L25-L33; internal/middleware/auth.go:L26-L75).

### 3. Handler: Extract & Validate
`PayToken` extracts `user_id` from context and `squadId` from URL params, validates the input, then calls `InitiateTokenPayment` (internal/handler/transaction_handler.go:L43-L50).

### 4. Service: Business Logic & Orchestration
The service (internal/domain/transaction/service.go:L40-L105):
- Loads the squad and property from repositories
- Computes the token amount based on property rent
- Creates a transaction record with status `initiated`
- Calls `RazorpayGateway.CreateOrder()` to initiate payment
- Updates the transaction record with gateway order ID and reference

### 5. Repository: Database Persistence
- `TransactionRepo.Create()` inserts a new row into `transactions` table with initial status (internal/repository/transaction_repo.go:L21-L41)
- `TransactionRepo.UpdateGatewayInfo()` updates the same row with Razorpay order details

### 6. External Call: Razorpay Gateway
The gateway (internal/pkg/payment/razorpay_gateway.go:L41-L103) makes an HTTP POST to Razorpay's API, receives an Order object, and returns it.

### 7. Response: JSON to Client
The handler returns a 200 OK with JSON payload containing:
- Transaction details (id, amount, status)
- Razorpay order details (id, amount, key to display in checkout)
(internal/handler/transaction_handler.go:L55-L66; internal/pkg/respond/respond.go:L31-L58)

## ASCII Sequence Diagram

```
┌────────┐     ┌─────────┐     ┌──────────┐     ┌────────┐     ┌──────────┐     ┌────────┐
│ Client │     │ Router  │     │ Handler  │     │Service │     │Repository│     │  DB    │
└────────┘     └─────────┘     └──────────┘     └────────┘     └──────────┘     └────────┘
    │               │               │               │               │              │
    │ HTTP POST     │               │               │               │              │
    │ /api/v1/pay   │               │               │               │              │
    ├──────────────>│ Rate Limit    │               │               │              │
    │               │ Check         │               │               │              │
    │               ├──────────────>│               │               │              │
    │               │               │ Auth          │               │              │
    │               │               │ Middleware    │               │              │
    │               │               ├──────────────>│               │              │
    │               │               │               │ Extract       │              │
    │               │               │               │ params        │              │
    │               │               │               ├──────────────>│ Load squad  │
    │               │               │               │               ├─────────────>│
    │               │               │               │               │<──────────────┤
    │               │               │               │               │<─────────────┤
    │               │               │               ├──────────────>│ Create txn  │
    │               │               │               │               ├─────────────>│
    │               │               │               │               │ INSERT txn  │
    │               │               │               │               ├─────────────>│
    │               │               │               │               │<──────────────┤
    │               │               │               │               │<─────────────┤
    │               │               │               ├──────────────>│ Razorpay    │
    │               │               │               │ Call Razorpay │  Gateway    │
    │               │               │               │<──────────────┤ API Call    │
    │               │               │               │ <order data>  │             │
    │               │               │               ├──────────────>│ Update txn │
    │               │               │               │               ├─────────────>│
    │               │               │               │               │ UPDATE txn │
    │               │               │               │<──────────────┤<─────────────┤
    │               │               │<──────────────┤ <txn+order>   │             │
    │               │               │ Return 200    │               │             │
    │<──────────────────────────────┤               │               │             │
    │ 200 OK JSON   │               │               │               │             │
    │ {txn, order}  │               │               │               │             │
    │               │               │               │               │             │
```

## Mermaid Flowchart

```mermaid
flowchart TD
    A["POST /api/v1/payments/squads/{squadId}/pay-token<br/>+ Authorization: Bearer JWT"] --> B["Chi Router"]
    B --> C["Global Middleware<br/>(Rate Limit: 100/min)"]
    C --> D["Auth Middleware<br/>(Validate JWT, inject user_id)"]
    D --> E["TransactionHandler.PayToken<br/>(Extract params from request)"]
    E --> F["TransactionService.InitiateTokenPayment<br/>(Business logic)"]
    F --> G["SquadRepo.GetByID<br/>(Load squad details)"]
    F --> H["PropertyRepo.GetByID<br/>(Load property rent)"]
    F --> I["TransactionRepo.Create<br/>(INSERT INTO transactions)"]
    I --> J["transactions table<br/>(status=initiated)"]
    F --> K["RazorpayGateway.CreateOrder<br/>(HTTP POST to Razorpay)"]
    K --> L["Razorpay API"]
    L --> K
    K --> M["TransactionRepo.UpdateGatewayInfo<br/>(UPDATE transactions)"]
    M --> J
    F --> N["Response:Status 200<br/>{transaction, order}"]
    G --> F
    H --> F
    N --> O["JSON Response to Client"]
    
    style A fill:#e1f5ff
    style J fill:#fff3e0
    style L fill:#ffe0b2
    style O fill:#c8e6c9
```

## Request/Response Example

### Request
```bash
POST /api/v1/payments/squads/squad-uuid-123/pay-token HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Host: api.bachelorsspace.in

{}
```

### Response (200 OK)
```json
{
  "transaction": {
    "id": "txn-uuid-456",
    "squad_id": "squad-uuid-123",
    "user_id": "user-uuid-789",
    "amount": 50000,
    "currency": "INR",
    "status": "initiated",
    "gateway": "razorpay",
    "gateway_order_id": "order_ABC123XYZ",
    "gateway_reference": "order_ABC123XYZ",
    "created_at": "2026-04-23T12:00:00Z",
    "updated_at": "2026-04-23T12:00:05Z"
  },
  "order": {
    "id": "order_ABC123XYZ",
    "amount": 50000,
    "amount_paid": 0,
    "currency": "INR",
    "status": "created",
    "key_id": "rzp_test_xxxxx",
    "receipt": "receipt-001"
  }
}
```

### Error Response (401 Unauthorized - Invalid JWT)
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

### Error Response (400 Bad Request - Invalid Input)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid squad ID format"
  }
}
```

## Database State Changes

### Before Request

```
transactions table:
id  | squad_id | user_id | amount | status      | gateway_order_id
────┼──────────┼─────────┼────────┼─────────────┼──────────────────
... | ...      | ...     | ...    | ...         | ...
```

### After Request

```
transactions table:
id          | squad_id        | user_id         | amount | status    | gateway_order_id
────────────┼─────────────────┼─────────────────┼────────┼───────────┼──────────────────
txn-uuid-456│ squad-uuid-123  │ user-uuid-789   │ 50000  │ initiated │ order_ABC123XYZ
```

## Detailed Code Trace

### Step 1: Handler Entry Point
**File**: `internal/handler/transaction_handler.go:L43-L50`

```go
func (h *TransactionHandler) PayToken(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    userID := ctx.Value("user_id").(string)
    squadID := chi.URLParam(r, "squadId")
    
    txn, order, err := h.service.InitiateTokenPayment(ctx, userID, squadID)
    if err != nil {
        respond.Error(w, err)
        return
    }
    respond.JSON(w, 200, map[string]interface{}{
        "transaction": txn,
        "order":       order,
    })
}
```

### Step 2: Service Business Logic
**File**: `internal/domain/transaction/service.go:L40-L105`

```go
func (s *Service) InitiateTokenPayment(ctx context.Context, userID, squadID string) (*Transaction, *Order, error) {
    // Load squad
    squad, err := s.squadRepo.GetByID(ctx, squadID)
    if err != nil {
        return nil, nil, err
    }
    
    // Load property
    property, err := s.propertyRepo.GetByID(ctx, squad.PropertyID)
    if err != nil {
        return nil, nil, err
    }
    
    // Compute amount (e.g., 10% of monthly rent)
    amount := int64(property.Rent * 0.10)
    
    // Create transaction record
    txn := &Transaction{
        SquadID: squadID,
        UserID:  userID,
        Amount:  amount,
        Status:  "initiated",
    }
    txnID, err := s.txnRepo.Create(ctx, txn)
    if err != nil {
        return nil, nil, err
    }
    txn.ID = txnID
    
    // Call Razorpay
    order, err := s.gateway.CreateOrder(ctx, amount, txnID)
    if err != nil {
        return nil, nil, err
    }
    
    // Update transaction with gateway info
    err = s.txnRepo.UpdateGatewayInfo(ctx, txnID, order.ID)
    if err != nil {
        return nil, nil, err
    }
    
    return txn, order, nil
}
```

### Step 3: Repository Data Persistence
**File**: `internal/repository/transaction_repo.go:L21-L41`

```go
func (r *TransactionRepo) Create(ctx context.Context, txn *Transaction) (string, error) {
    var id string
    err := r.pool.QueryRow(
        ctx,
        `INSERT INTO transactions (squad_id, user_id, amount, status, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id`,
        txn.SquadID, txn.UserID, txn.Amount, txn.Status,
    ).Scan(&id)
    return id, err
}

func (r *TransactionRepo) UpdateGatewayInfo(ctx context.Context, txnID, orderID string) error {
    _, err := r.pool.Exec(
        ctx,
        `UPDATE transactions SET gateway_order_id = $1, updated_at = NOW() WHERE id = $2`,
        orderID, txnID,
    )
    return err
}
```

### Step 4: External Gateway Call
**File**: `internal/pkg/payment/razorpay_gateway.go:L41-L103`

```go
func (g *RazorpayGateway) CreateOrder(ctx context.Context, amount int64, reference string) (*Order, error) {
    payload := map[string]interface{}{
        "amount":   amount,
        "currency": "INR",
        "receipt":  reference,
    }
    
    // HTTP POST to Razorpay API
    resp, err := g.makeRequest(ctx, "POST", "/orders", payload)
    if err != nil {
        return nil, err
    }
    
    // Parse and return order
    var order Order
    err = json.Unmarshal(resp, &order)
    return &order, err
}
```

## Key Architectural Points

1. **Layered Design**: Each layer has a single responsibility—handlers parse, services orchestrate, repositories persist.
2. **Dependency Injection**: Services depend on repository **interfaces**, making them testable and decoupled from implementation.
3. **Error Propagation**: Errors bubble up naturally; each layer decides whether to handle or propagate.
4. **Context Threading**: `context.Context` flows through all layers, enabling request cancellation and timeout propagation.
5. **Transactional Consistency**: The database maintains ACID guarantees; application logic is simpler.

## Related Request Lifecycles

- **POST /api/v1/auth/login**: Token generation flow (see [Go_for_Java_Developers.md](Go_for_Java_Developers.md#jwt-token-lifecycle))
- **POST /api/v1/payments/webhook**: Webhook processing (see [Architecture.md](Architecture.md#5-webhook-integrity-hmac-sha256-verification))
- **PUT /api/v1/users/me/profile**: Profile update with embedding trigger (see [Feature_Implementation_Trace.md](Feature_Implementation_Trace.md))
