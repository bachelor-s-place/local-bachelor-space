# BachelorsSpace — Web Frontend (Phase 2)

> **Status:** 🟡 In Progress — Phase 2 (Frontend)
> **Backend:** Go REST API in `../go-backend/` — Phase 1 Complete ✅

The Next.js 14 web frontend for **BachelorsSpace** — a zero-brokerage rental marketplace for bachelors.
Features AI-powered squad matchmaking, PostGIS map-based property discovery, and a full verified-listing pipeline.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 14** (App Router) |
| Language | **TypeScript** |
| Styling | **CSS Modules** + `globals.css` design system |
| Font | **Inter** (Google Fonts via `next/font`) |
| HTTP | Custom `apiFetch()` wrapper (`src/lib/api.ts`) |
| Auth | Stateless JWT stored in `localStorage["jwt"]` |
| Maps | Leaflet.js (planned — Module 2) |

---

## Project Structure

```
frontend/
├── docs/
│   ├── AI_AGENT_CONTEXT.md          ← Design system, rules, and constraints
│   └── FRONTEND_DEVELOPMENT_PLAN.md ← 13-module Phase 2 build plan
│
├── src/
│   ├── app/
│   │   ├── layout.tsx               ← Root layout: navbar, ambient bg, font
│   │   ├── globals.css              ← Design tokens, global selectors, dropdowns, navbar
│   │   ├── page.tsx                 ← Landing page (hero, features, dashboard preview)
│   │   ├── login/                   ← Login form → POST /api/v1/auth/login
│   │   ├── signup/                  ← Register form → POST /api/v1/auth/register
│   │   ├── onboarding/              ← 3-step onboarding (lifestyle profile)
│   │   └── dashboard/               ← Matchmaking dashboard (mock data for now)
│   │
│   ├── components/
│   │   └── NavbarAuth.tsx           ← Auth-aware navbar (Login/Signup or user avatar)
│   │
│   └── lib/
│       └── api.ts                   ← apiFetch() — the ONLY way to call the backend
│
├── public/
├── next.config.ts
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- The Go backend running on `http://localhost:8080` (see `../go-backend/`)

### 1. Install dependencies
```bash
cd frontend
npm install
```

### 2. Configure environment
```bash
# Create a .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1" > .env.local
```

### 3. Run the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> Make sure the Go backend is running first. See `../go-backend/README.md` for backend setup.

---

## Pages (Current)

| Route | Description | API Connected |
|-------|-------------|---------------|
| `/` | Landing page — hero, features, mockup | ❌ Static |
| `/login` | Email + password login | ✅ `POST /auth/login` |
| `/signup` | Registration (tenant or landlord) | ✅ `POST /auth/register` |
| `/onboarding` | 3-step lifestyle onboarding | ❌ Static (Module 1) |
| `/dashboard` | Matchmaking dashboard | ❌ Mock data (Module 5) |

---

## Design System

The entire design system lives in `src/app/globals.css`. Key tokens:

```css
--bg-primary:    #000000   /* Page background */
--text-primary:  #f5f5f7   /* Headings, primary text */
--text-secondary:#86868b   /* Labels, muted text */
--accent-blue:   #0066cc   /* Primary CTAs, active states */
```

**Glassmorphism card pattern:**
```css
background: rgba(30, 30, 35, 0.4);
border: 0.5px solid rgba(255, 255, 255, 0.08);
backdrop-filter: blur(40px) saturate(150%);
```

**Dropdown rule:** All `<select>` elements use `color-scheme: dark` globally. Never override this — it prevents the white dropdown bug on dark themes.

---

## Phase 2 Build Plan

The frontend is built in 13 modules — see [`docs/FRONTEND_DEVELOPMENT_PLAN.md`](./docs/FRONTEND_DEVELOPMENT_PLAN.md) for the full plan.

| # | Module | Status |
|---|--------|--------|
| 1 | Auth Hardening (real API + route protection) | 🔲 |
| 2 | Property Map Search (Leaflet + PostGIS) | 🔲 |
| 3 | Property Detail Page | 🔲 |
| 4 | Squad System UI | 🔲 |
| 5 | Matchmaking Dashboard (real data) | 🔲 |
| 6 | Squad Chat (polling) | 🔲 |
| 7 | Landlord KYC Flow | 🔲 |
| 8 | Property Listing Manager | 🔲 |
| 9 | PG Room Manager | 🔲 |
| 10 | Admin: Verification Queue | 🔲 |
| 11 | Admin: KYC Review Panel | 🔲 |
| 12 | Token Payment (Razorpay) | 🔲 |
| 13 | Notifications Feed | 🔲 |

---

## For AI Agents & Developers

Before making any changes, read:
1. **[`docs/AI_AGENT_CONTEXT.md`](./docs/AI_AGENT_CONTEXT.md)** — Design system rules, API conventions, what never to do
2. **[`../go-backend/docs/AI_AGENT_CONTEXT.md`](../go-backend/docs/AI_AGENT_CONTEXT.md)** — Backend business rules and API design
3. **[`docs/FRONTEND_DEVELOPMENT_PLAN.md`](./docs/FRONTEND_DEVELOPMENT_PLAN.md)** — Phase 2 module build order

**Critical rules (summary):**
- Never use TailwindCSS — CSS Modules + `globals.css` only
- Never call `fetch()` directly — always use `apiFetch()` from `src/lib/api.ts`
- Never remove `color-scheme: dark` from select elements
- All pages must be responsive from 320px → 1440px

---

## Deployment Target

- **Platform:** Vercel
- **Environment variable:** `NEXT_PUBLIC_API_URL` → Go backend Cloud Run URL
