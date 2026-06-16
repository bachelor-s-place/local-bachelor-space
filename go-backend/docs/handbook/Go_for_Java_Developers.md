# Go for Java Developers (Spring Boot Bridge)

This backend uses Go in a Spring-like layering model. The analogies below map the mental model to concrete files in this repo.

| Go in this codebase | Spring Boot analogy |
| --- | --- |
| `chi.Router` route wiring in `internal/handler/router.go` | `@RestController` + `@RequestMapping` aggregation for the API surface (internal/handler/router.go:L27-L155) |
| Handler structs like `AuthHandler`, `UserHandler` | Controller classes that decode input and delegate (internal/handler/auth_handler.go:L15-L105; internal/handler/user_handler.go:L16-L78) |
| Service structs like `user.Service` | `@Service` layer with domain rules (internal/domain/user/service.go:L28-L109) |
| Repository interfaces in domain packages | Java interfaces, but satisfied implicitly (internal/domain/user/service.go:L18-L26; implemented by internal/repository/user_repo.go:L18-L150) |

## Go Idioms Used Here

**Error handling (`if err != nil`)**  
Instead of exceptions, Go returns errors explicitly. You can see this pattern everywhere in services and handlers, for example in `user.Service.Login` and `Register` (internal/domain/user/service.go:L42-L88).

**Pointers (`*` and `&`) for optional fields**  
Optional fields are modeled as pointers (e.g., `*string`, `*float64`) so JSON omits nulls and SQL can represent absence. The `Property` model shows this clearly (internal/domain/property/property.go:L23-L33).

**Goroutines for background work**  
Go uses lightweight goroutines instead of thread pools. The email sender spawns a goroutine for async SMTP delivery (internal/pkg/email/email.go:L35-L47), and the embedding worker runs in its own goroutine loop (internal/pkg/embedding/worker.go:L25-L40).
