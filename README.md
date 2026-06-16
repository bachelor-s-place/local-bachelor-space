# BachelorsSpace

BachelorsSpace is a zero-brokerage rental marketplace designed specifically for bachelors. It features AI-powered roommate/squad matchmaking and PostGIS map-based property discovery to provide a seamless and secure housing experience.

---

## 📂 Project Structure & Documentation

> [!IMPORTANT]
> **Documentation is the source of truth.** Both the Frontend and Backend contain extensive documentation in their respective `docs/` folders. **Read these first before making any architectural changes.**

### 🖥️ Frontend Documentation
Located in: [`frontend/docs/`](./frontend/docs/)
- **[FRONTEND_DEVELOPMENT_PLAN.md](./frontend/docs/FRONTEND_DEVELOPMENT_PLAN.md)**: 13-module build plan.
- **[AI_AGENT_CONTEXT.md](./frontend/docs/AI_AGENT_CONTEXT.md)**: Design system rules and API conventions.
- **[DESIGN.md](./frontend/docs/DESIGN.md)**: UI/UX principles and styling tokens.

### ⚙️ Backend Documentation
Located in: [`go-backend/docs/`](./go-backend/docs/)
- **[Architecture.md](./go-backend/docs/handbook/Architecture.md)**: DDD-Lite design and security stack.
- **[Codebase_Map.md](./go-backend/docs/handbook/Codebase_Map.md)**: Detailed file-by-file breakdown.
- **[BACKEND_DEVELOPMENT_PLAN.md](./go-backend/docs/BACKEND_DEVELOPMENT_PLAN.md)**: Feature implementation roadmap.
- **[Go_for_Java_Developers.md](./go-backend/docs/handbook/Go_for_Java_Developers.md)**: Onboarding guide for Spring engineers.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router), TypeScript, React 19, Leaflet.js |
| **Backend** | Go 1.25.0 (Chi Router), PostgreSQL, PostGIS, pgvector |
| **AI/ML** | Ollama (Local Embeddings), OpenAI (Optional) |
| **Security** | JWT (HS256), AES-256-GCM Encryption, Rate Limiting |
| **DevOps** | Docker, Docker Compose |

---

## 🚀 Local Development Guide

Follow these steps to get the entire platform running locally.

### Prerequisites
- **Go**: v1.25.0 (or version matching your toolchain)
- **Node.js**: v18+
- **Docker**: For running the database and extensions.
- **OpenSSL**: For generating security secrets.
- **Ollama**: For local AI embedding generation.

### 1. Start the Database
The project uses PostgreSQL 16 with PostGIS and pgvector.
```bash
cd go-backend
docker-compose up -d --build
```
*The `db/schema_initializer.sql` script runs automatically on the first boot.*

### 2. Generate Security Secrets
You must generate unique secrets for JWT signing and PII encryption.
```bash
# Generate JWT_SECRET (64 hex characters)
openssl rand -hex 32

# Generate ENCRYPTION_KEY (64 hex characters / 32 bytes)
openssl rand -hex 32
```
Copy these values; you will need them in the next step.

### 3. Backend Setup
1.  **Configure Environment**:
    ```bash
    cd go-backend
    cp .env.example .env
    ```
2.  **Edit `.env`**:
    - Update `JWT_SECRET` and `ENCRYPTION_KEY` with the values generated above.
    - Set `EMBEDDING_PROVIDER=ollama`.
    - Ensure `OLLAMA_HOST=http://localhost:11434`.
3.  **Run the API**:
    ```bash
    go run cmd/api/main.go
    # OR
    make run
    ```
    *The API will start at `http://localhost:8080`.*

### 4. Frontend Setup
1.  **Install Dependencies**:
    ```bash
    cd frontend
    npm install
    ```
2.  **Configure API URL & OAuth**:
    Create a `.env.local` file in the `frontend` directory:
    ```bash
    NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
    # Generate this in Google Cloud Console (APIs & Services > Credentials)
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
    ```
3.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    *Open [http://localhost:3000](http://localhost:3000) to view the application.*

---

## 🧱 Repository Map

```text
Bachelor-s-place-main/
├── frontend/             # Next.js Web Application
│   ├── docs/             # Frontend-specific docs (Critical)
│   ├── src/              # Source code
│   └── public/           # Static assets
├── go-backend/           # Go REST API
│   ├── cmd/api/          # Entry point
│   ├── db/               # Database schema & migrations
│   ├── docs/             # Backend-specific docs (Critical)
│   ├── internal/         # Business logic (DDD-Lite)
│   └── docker-compose.yml # Local DB stack
└── README.md             # This file
```

---

## 📝 License
Proprietary. BachelorsSpace © 2026.
