# Go for Python Developers

This backend uses Go in a way that will feel natural to Python engineers. The analogies below map Python concepts to Go patterns used in this repository.

## Core Language Concepts

| Python | Go (in this codebase) | Example |
| --- | --- | --- |
| `class` + instance methods | `struct` + receiver methods | `User` struct with methods like `(s *Service) Register(...)` (internal/domain/user/service.go:L28-L48) |
| `dict[str, Any]` for flexible schemas | `struct` with optional fields using pointers | `UpdateProfileInput` with `*string` and `*float64` fields (internal/domain/user/user.go:L42-L48) |
| `@property` decorator for getters | Receiver methods on structs | No explicit property decoration; methods act as computed properties (e.g., service methods) |
| Implicit interfaces (duck typing) | Explicit **interface definitions**, but satisfied implicitly | `Repository` interface in domain packages (internal/domain/user/service.go:L18-L26), implemented by concrete repos without declaring conformance |
| `if condition:` indentation | `if condition { }` with braces | Error handling: `if err != nil { return ... }` everywhere (internal/domain/user/service.go:L42-L88) |
| List comprehensions `[f(x) for x in items]` | For loops with append or slicing | Building response lists (internal/handler/user_handler.go) |
| `None` for optional values | Pointers (`*T`) for optional fields; `nil` for null | `PhoneEncrypted *string` in User model (internal/domain/user/user.go:L27) |
| `super()` for parent method calls | Composition over inheritance (no inheritance in Go) | Services embed repositories via composition, not inheritance |
| Decorators (`@app.route(...)`) | Chi router wiring + middleware chaining | Routes mounted explicitly in router (internal/handler/router.go:L27-L155); middleware applied per-route |

## Concurrency: Goroutines vs. Python Threads

**Python**: Threading is heavy, asyncio uses event loops, multiprocessing spawns full processes.

**Go**: Goroutines are lightweight (thousands can run on one thread), no explicit event loop needed.

In this project:
- **Email sending** runs asynchronously using goroutines (internal/pkg/email/email.go:L35-L47). The `Send()` method launches a goroutine with `go func() { ... }()` and returns immediately.
- **Embedding worker** runs in its own goroutine loop, polling the database for pending embeddings (internal/pkg/embedding/worker.go:L25-L40).

```go
// Go: Spawn async work with a single keyword
go func() {
    if err := m.send(to, subject, body); err != nil {
        log.Error().Err(err).Msg("email send failed")
    }
}()
```

vs.

```python
# Python: Requires threading/asyncio boilerplate
import asyncio
asyncio.create_task(send_email(to, subject, body))
```

## Error Handling: `if err != nil` vs. Exceptions

**Python**: Try-catch with exceptions that bubble up automatically.

**Go**: Functions return `(result, error)` tuples. Errors are explicit values, not exceptions.

```go
// Go: Errors are just values
user, err := s.repo.GetByEmail(ctx, email)
if err != nil {
    return nil, err  // Explicitly handle or propagate
}
```

vs.

```python
# Python: Exceptions bubble unless caught
try:
    user = repo.get_by_email(email)
except DatabaseError as e:
    raise  # Propagate
```

This is ubiquitous in the codebase: service methods return `(result, error)`, handlers check `if err != nil`, and middleware validates before delegating (internal/domain/user/service.go:L42-L88).

## Database: Postgres Driver (pgx) vs. SQLAlchemy/ORM

**Python**: SQLAlchemy abstracts SQL; uses sessionmakers, context managers.

**Go**: pgx is a thin driver; SQL is written explicitly. Repositories map rows to structs.

```go
// Go: Explicit SQL, manual row scanning
var user User
err := row.Scan(&user.ID, &user.Name, &user.Email, ...)
if err != nil {
    return nil, err
}
```

vs.

```python
# Python: ORM handles scanning
user = session.query(User).filter_by(email=email).first()
```

**In this project**: All SQL is in repositories (internal/repository/user_repo.go:L28-L150). Each method writes the query, executes it, and scans results into structs. This trades ORM convenience for explicitness and fine-grained control (e.g., spatial queries with PostGIS, vector similarity with pgvector).

## Dependency Injection: Wiring via the Router

**Python**: Typically use frameworks (Flask, Django) that auto-wire dependencies or require factories.

**Go**: No built-in DI framework. Services take constructor parameters, and the router (or main.go) wires them explicitly.

```go
// Go: Explicit wiring in one place (internal/handler/router.go:L27-L84)
userRepo := repository.NewUserRepo(pool)
userService := user.NewService(userRepo, jwtSecret)
authHandler := NewAuthHandler(userService)
```

vs.

```python
# Python: Flask/FastAPI might use decorators or service locators
@app.dependency
def get_user_service():
    return UserService(userRepo)
```

**Benefit**: Full dependency graph is visible at startup. If a dependency is missing, the code won't compile.

## Type System: Static Go vs. Dynamic Python

**Go**: Strongly typed at compile time. No duck typing. Types are explicit.

**Python**: Dynamic; types are checked at runtime (or with mypy for static checking).

```go
// Go: Type must match exactly
func (s *Service) Login(ctx context.Context, email string, password string) (*TokenPair, error) {
    // ...
}
```

vs.

```python
# Python: Types are hints; runtime is flexible
def login(email: str, password: str) -> TokenPair:
    pass
```

**In this project**: Request/response types are defined as structs with JSON tags. The chi router + validator automatically parse, validate, and type-check inputs (internal/domain/user/user.go:L50-L64).

## Middleware and Interceptors

**Python**: Decorators (`@app.middleware`, `@wraps`).

**Go**: Middleware as functions that wrap handlers.

```go
// Go: Middleware wraps the next handler
func (m *Auth) Auth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Check token, inject context
        next.ServeHTTP(w, r)
    })
}
```

vs.

```python
# Python: Decorator approach
@app.middleware("http")
async def auth_middleware(request, call_next):
    # Check token, inject context
    response = await call_next(request)
    return response
```

**In this project**: Middleware is chained in the router (internal/handler/router.go:L86-L107). Auth middleware validates JWT and injects `user_id`/`role` into the request context (internal/middleware/auth.go:L26-L75).

## Testing Patterns

While not shown in the main codebase, Go uses:
- Table-driven tests (parameterized test cases).
- Dependency injection via interfaces makes mocking straightforward.
- No magic mocking library; interfaces are so simple that hand-writing mocks is idiomatic.

## Context: Request Lifecycle Management

**Go**: Uses `context.Context` to pass values through a request chain, handle timeouts, and cancellation.

**Python**: Flask/Django use thread-local storage or context vars.

```go
// Go: Explicit context threading
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()  // Implicit from request
    user, err := h.service.Login(ctx, email, password)
}
```

vs.

```python
# Python: Flask uses g or request context
from flask import request, g
def login():
    user_id = g.user_id  # Set by middleware
```

**In this project**: Handlers receive `*http.Request` which carries `context.Context`. Services accept `context.Context` as the first parameter, allowing timeout propagation and request-scoped values (internal/domain/user/service.go:L28).

## File Paths and Package Organization

**Python**: Package = directory with `__init__.py`. Imports use relative paths (`from ..domain import User`).

**Go**: Package = directory name. Imports use full module paths (`bachelors_space/internal/domain/user`). No relative imports; packages are namespace-less at import time.

**In this project**:
- `internal/domain/user/` = package `user`. Importing it: `import "bachelors_space/internal/domain/user"`.
- Handlers import domains: `import "bachelors_space/internal/domain/user"` then use `user.Service`.

## Performance Considerations

| Aspect | Go | Python |
| --- | --- | --- |
| Startup time | <100ms | 1-2+ seconds (Django, FastAPI) |
| Memory per goroutine | ~2KB | ~1MB per thread |
| Concurrency limit | 100K+ goroutines easily | Dozens to hundreds of threads |
| Execution speed | Compiled; ~10-100x faster than Python | Interpreted; slower but good for I/O bound work |

This project benefits from Go's concurrency model: the embedding worker runs continuously in one goroutine, email sends spawn short-lived goroutines, and the HTTP server handles thousands of concurrent requests without thread pool overhead.

## Summary: Mental Model Mapping

| Goal | Python approach | Go approach (this codebase) |
| --- | --- | --- |
| Define a domain model | `class User: ...` | `type User struct { ... }` with methods |
| Wire dependencies | Service locators, factories | Constructor injection in router (internal/handler/router.go:L27-L84) |
| Handle errors | `try/except` | Return error as second value, check `if err != nil` |
| Run async work | `asyncio` or `threading` | `go func() { ... }()` |
| Validate input | Dataclass validators, Pydantic | Struct tags + validator library (internal/domain/user/user.go:L50-L64) |
| Query database | SQLAlchemy ORM | Explicit SQL + pgx scanning (internal/repository/user_repo.go:L28-L150) |
| Enforce types | Type hints + mypy | Compile-time type checking (Go compiler) |

The net result: Go feels more explicit and rigid than Python, but this explicitness makes the codebase easier to trace, refactor, and reason about at scale.
