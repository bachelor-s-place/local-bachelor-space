# BachelorsSpace Backend Handbook

Welcome to the comprehensive architectural documentation suite for the BachelorsSpace backend. This handbook provides everything you need to understand, extend, and maintain the system.

## 📖 Documentation Structure

### Quick Start Path (15 minutes)
1. **[README.md](../../README.md)** - Project overview and quick start
2. **[Implementation_Guide.md](Implementation_Guide.md)** - Setup, Docker, and database initialization

### Architecture Deep Dive (30-60 minutes)
1. **[Architecture.md](Architecture.md)** - Core design (DDD-Lite, security, database)
2. **[Codebase_Map.md](Codebase_Map.md)** - Directory tree and file purposes
3. **[Request_Lifecycle.md](Request_Lifecycle.md)** - End-to-end request flow with diagrams

### Feature Knowledge (30 minutes per feature)
- **[Feature_Implementation_Trace.md](Feature_Implementation_Trace.md)** - Map features to code locations
  - Auth & Security
  - KYC Pipeline
  - AI Squad Matchmaking
  - Razorpay Payments
  - Notifications

### Language-Specific Guides
- **[Go_for_Java_Developers.md](Go_for_Java_Developers.md)** - Analogies and idioms for Java/Spring engineers
- **[Go_for_Python_Developers.md](Go_for_Python_Developers.md)** - Analogies and idioms for Python engineers

---

## 🎯 Using This Handbook

### "I'm a new developer joining the team"
1. Read [README.md](../../README.md) for context
2. Follow [Implementation_Guide.md](Implementation_Guide.md) to set up locally
3. Read [Architecture.md](Architecture.md) to understand the design
4. Skim [Codebase_Map.md](Codebase_Map.md) to locate files
5. Trace a feature in [Feature_Implementation_Trace.md](Feature_Implementation_Trace.md)

### "I need to add a new feature"
1. Review [Architecture.md](Architecture.md) Section on **Layered Architecture** to understand where your code goes
2. Find a similar feature in [Feature_Implementation_Trace.md](Feature_Implementation_Trace.md)
3. Understand the request flow from [Request_Lifecycle.md](Request_Lifecycle.md)
4. Implement in the appropriate layer: Handler → Service → Repository
5. Add tests and update this documentation

### "I'm debugging an issue in production"
1. Use [Request_Lifecycle.md](Request_Lifecycle.md) to trace the request path
2. Identify the layer where the issue is (Handler, Service, Repository)
3. Check [Codebase_Map.md](Codebase_Map.md) for the exact file
4. Review [Feature_Implementation_Trace.md](Feature_Implementation_Trace.md) for function references

### "I'm coming from Java/Spring"
1. Read [Go_for_Java_Developers.md](Go_for_Java_Developers.md) first
2. Then dive into [Architecture.md](Architecture.md)
3. The patterns are similar: Controllers → Services → Repositories

### "I'm coming from Python"
1. Read [Go_for_Python_Developers.md](Go_for_Python_Developers.md) first
2. Pay special attention to the **Goroutines vs Python Threads** and **Error Handling** sections
3. Then dive into [Architecture.md](Architecture.md)

---

## 📚 Document Reference

| Document | Purpose | Read Time | Audience |
| --- | --- | --- | --- |
| [Architecture.md](Architecture.md) | System design, DDD-Lite pattern, security, database features | 20 min | All |
| [Codebase_Map.md](Codebase_Map.md) | Directory tree and file-by-file breakdown | 15 min | Developers |
| [Feature_Implementation_Trace.md](Feature_Implementation_Trace.md) | Features mapped to code with flow diagrams | 30 min | Feature maintainers |
| [Request_Lifecycle.md](Request_Lifecycle.md) | End-to-end request trace with sequence/flow diagrams | 25 min | Debuggers, API developers |
| [Go_for_Java_Developers.md](Go_for_Java_Developers.md) | Go analogies for Java/Spring patterns | 30 min | Java developers |
| [Go_for_Python_Developers.md](Go_for_Python_Developers.md) | Go analogies for Python patterns | 30 min | Python developers |
| [Implementation_Guide.md](Implementation_Guide.md) | Setup, Docker, database, deployment | 45 min | DevOps, new developers |

---

## 🏗️ Architecture Summary

**BachelorsSpace Backend** is built on **DDD-Lite** (Domain-Driven Design Lite):

```
HTTP Request
    ↓
Handlers (thin entry points - parse, validate, delegate)
    ↓
Services (domain logic - enforce business rules)
    ↓
Repositories (data persistence - SQL via pgx)
    ↓
PostgreSQL (with PostGIS for spatial, pgvector for AI)
    ↓
HTTP Response
```

### Key Principles

1. **Separation of Concerns**: Handlers don't know about SQL. Services don't know about HTTP.
2. **Dependency Injection**: Services depend on repository **interfaces**, making them testable.
3. **Error Handling**: Go's `(result, error)` pattern—errors are values, not exceptions.
4. **Explicit over Implicit**: Dependency graph is visible at startup (router.go is the "glue").
5. **Database-Driven**: PostgreSQL is a first-class citizen with PostGIS (spatial) and pgvector (AI).

---

## 🔐 Security Features

- **JWT (HS256)**: Token-based auth with role-based access control
- **Rate Limiting**: 100 req/min global, 10 req/min on `/auth` endpoints
- **AES-256-GCM**: PII encrypted at rest (phone, Aadhaar, PAN)
- **XSS Sanitization**: Chat messages sanitized with bluemonday
- **HMAC-SHA256**: Razorpay webhook signature verification
- **Parameterized Queries**: Prevent SQL injection

---

## 🗺️ Module Overview

| Module | Features | Status |
| --- | --- | --- |
| **1-7** | Auth, Users, KYC, Properties, Squads, Verification, Messages | ✅ Fully implemented |
| **8** | Payments (Razorpay) | ✅ Fully implemented |
| **9** | In-app Notifications + Email | ✅ Fully implemented |
| **10** | AI Embeddings (OpenAI/Ollama) | ✅ Fully implemented |

---

## 🚀 Quick Commands

```bash
# Setup
cp .env.example .env
docker-compose up --build

# Run API
go run cmd/api/main.go

# Tests
go test ./...

# Format
go fmt ./...
```

---

## 🔗 Related Documentation

- **[Project SRS](../PROJECT_SRS.md)** - System requirements and features
- **[Development Plan](../BACKEND_DEVELOPMENT_PLAN.md)** - Module delivery roadmap
- **[AI Agent Context](../AI_AGENT_CONTEXT.md)** - Internal AI instructions (if using AI for development)

---

## 💡 Tips for Effective Use

### Reading Code
1. Start at **handlers/** to see the API contract
2. Follow to **domain/{entity}/service.go** for business logic
3. End at **repository/{entity}_repo.go** for SQL details

### Adding Features
1. Define the API input/output (handler layer)
2. Write business rules (service layer)
3. Implement database access (repository layer)
4. Add tests at each layer
5. Update [Feature_Implementation_Trace.md](Feature_Implementation_Trace.md)

### Debugging Issues
1. Use [Request_Lifecycle.md](Request_Lifecycle.md) to understand the flow
2. Check error logs to identify which layer failed
3. Look up the function in [Feature_Implementation_Trace.md](Feature_Implementation_Trace.md)
4. Read the implementation in [Codebase_Map.md](Codebase_Map.md)

---

## 📞 Support

**Questions about the code?**
- Check the relevant handbook document
- Review the code location and line references cited
- Look for similar implementations in the codebase

**Want to improve this documentation?**
- Update the relevant .md file
- Add diagrams/ASCII art where helpful
- Include code line references for accuracy
- Keep the high-end, architectural tone

---

## 🎓 Learning Path by Role

### Backend Developer
1. [README.md](../../README.md)
2. [Implementation_Guide.md](Implementation_Guide.md)
3. [Architecture.md](Architecture.md)
4. [Go_for_Java_Developers.md](Go_for_Java_Developers.md) or [Go_for_Python_Developers.md](Go_for_Python_Developers.md)
5. [Feature_Implementation_Trace.md](Feature_Implementation_Trace.md)
6. [Request_Lifecycle.md](Request_Lifecycle.md)

### DevOps Engineer
1. [Implementation_Guide.md](Implementation_Guide.md)
2. [Architecture.md](Architecture.md) - Database & Extensions section
3. [Codebase_Map.md](Codebase_Map.md) - db/ and docker-compose.yml

### Tech Lead / Architect
1. [Architecture.md](Architecture.md)
2. [Codebase_Map.md](Codebase_Map.md)
3. [Feature_Implementation_Trace.md](Feature_Implementation_Trace.md)
4. [Request_Lifecycle.md](Request_Lifecycle.md)

### QA / Test Engineer
1. [README.md](../../README.md)
2. [Feature_Implementation_Trace.md](Feature_Implementation_Trace.md)
3. [Request_Lifecycle.md](Request_Lifecycle.md)

---

## 📊 Documentation Status

✅ **Complete:**
- Architecture.md (with diagrams)
- Codebase_Map.md (with directory tree)
- Feature_Implementation_Trace.md (with flow diagrams)
- Request_Lifecycle.md (with ASCII sequences and Mermaid)
- Go_for_Java_Developers.md
- Go_for_Python_Developers.md (NEW)
- Implementation_Guide.md (with detailed setup steps)
- README.md (with examples and troubleshooting)

**Last Updated:** April 23, 2026

---

**Start reading: [Architecture.md](Architecture.md) or [README.md](../../README.md)**
