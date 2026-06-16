# BachelorsSpace Frontend — AI Agent Context & Constraints
> **Version:** 1.0 | **Last Updated:** April 2026
> This file is the single source of truth for any AI agent, developer, or tool working on the **frontend** codebase.
> Read this file completely before making ANY changes. Also read the backend `docs/AI_AGENT_CONTEXT.md` for the full product context and business rules.

---

## 1. What This Project Is

**BachelorsSpace** is a zero-brokerage rental marketplace for bachelors (students and working professionals).
This repository contains the **Next.js 14 web frontend** (Phase 2), which consumes the Go REST API backend.

The three core pillars that EVERY UI decision must serve:

| Pillar | UI Implication |
|--------|---------------|
| **Zero Tenant Brokerage** | Never show pricing that implies tenant fees. "Free for tenants" must be clear. |
| **Trust & Verification** | Show Verified badges prominently. Show KYC status clearly in landlord flows. |
| **Squad Matchmaking** | The Squad system is the social differentiator — the UI must make it feel exciting and easy. |

---

## 2. Current Development Scope

> [!IMPORTANT]
> **Phase 2 — Frontend Only.** The Go backend is complete and stable (Phase 1 done).
> Do NOT modify any file in the `go-backend/` directory.
> All data fetching must go through the `apiFetch()` utility in `src/lib/api.ts`.

### What Exists (Phase 2 Tenant Flows Complete)
- **Auth & Onboarding:** `login`, `signup`, `onboarding`
- **Properties:** `properties` (map search), `properties/[id]` (details & real PG rooms)
- **Squad System:** `squad` (hub), `squad/lookup` (preferences), `squad/[id]` (details & proposals)
- **Dashboard:** `dashboard` (real matchmaking & pending invites)
- **Chat:** `squad/[id]/chat` (real-time messaging)
- **Global:** `layout.tsx`, `globals.css`, `api.ts`, `NavbarAuth.tsx`

### Phase 2 Build Goals (Remaining)
- Landlord flows (KYC submission, Property Manager, Room Manager)
- Admin flows (Verification Queue, KYC Review Panel)
- Payments (Token Payment Flow)
- Notifications (In-App Feed)
See `FRONTEND_DEVELOPMENT_PLAN.md` for the full module-by-module plan.

---

## 3. Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | **Next.js 14** (App Router) | All pages use the App Router. No Pages Router. |
| Language | **TypeScript** | Strict mode. No `any` unless absolutely unavoidable. |
| Styling | **CSS Modules** | One `.module.css` per page/component. No TailwindCSS. No styled-components. |
| Global CSS | `src/app/globals.css` | Design tokens only. Shared utility classes (`.navbar`, `.btn-primary`, etc.). |
| State | **React `useState` / `useMemo`** | No Redux or Zustand for now. Context API for auth state if needed. |
| Data Fetching | **`apiFetch()` in `src/lib/api.ts`** | All API calls go through this. Never call `fetch()` directly. |
| Font | **Inter** (Google Fonts, via Next.js `next/font/google`) | Already loaded in `layout.tsx`. Use `var(--font-inter)`. |
| Icons | **Inline SVG or Unicode symbols** | No icon library installed. Keep it simple. |
| Maps | **Leaflet.js or Google Maps JS API** | Decision pending — see Phase 2 plan. |

---

## 4. Design System (Non-Negotiable)

> [!IMPORTANT]
> A full visual design reference is documented in **[`docs/DESIGN.md`](./DESIGN.md)**.
> It covers every color token, typography scale, glass card pattern, button style, animation easing, layout pattern, and a new-page checklist.
> **Read `DESIGN.md` before building any new page or component.**

### 4.1 Color Tokens (defined in `globals.css :root`)
```css
--bg-primary:       #000000      /* Page background */
--bg-secondary:     #0d0d12      /* Card backgrounds */
--text-primary:     #f5f5f7      /* Headings, primary text */
--text-secondary:   #86868b      /* Labels, hints, muted text */
--glass-bg:         rgba(255, 255, 255, 0.02)
--glass-border:     rgba(255, 255, 255, 0.06)
--glass-highlight:  rgba(255, 255, 255, 0.08)
--accent-blue:      #0066cc      /* Primary CTA, active states */
--accent-blue-hover:#0077ed
```

### 4.2 Glassmorphism Card Pattern
All cards/panels use this exact pattern:
```css
background: rgba(30, 30, 35, 0.4);
border: 0.5px solid rgba(255, 255, 255, 0.08);
border-radius: 20px–24px;
backdrop-filter: blur(40px) saturate(150%);
-webkit-backdrop-filter: blur(40px) saturate(150%);
```

### 4.3 Typography Scale
| Usage | Size | Weight |
|-------|------|--------|
| Page H1 | `clamp(2rem, 5vw, 3.5rem)` | 600 |
| Card titles | `1.15rem – 1.5rem` | 500–600 |
| Body / labels | `0.85rem – 0.95rem` | 400 |
| Muted / hints | `0.75rem – 0.85rem` | 400 |

### 4.4 Button Classes (global — do NOT redefine per-module)
- `.btn-primary` — White pill button (dark text). Used for primary CTAs.
- `.btn-secondary` — Translucent pill button (white text). Used for secondary actions.

### 4.5 Animation Convention
All entrance animations use this easing: `cubic-bezier(0.16, 1, 0.3, 1)`
Standard fade-up pattern:
```css
opacity: 0;
animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
```

### 4.6 Dropdown / Select Rule
> [!IMPORTANT]
> ALL `<select>` elements MUST have `color-scheme: dark` applied. This is already set globally
> in `globals.css` on the `select` selector. Never override it to remove this. Never add a white
> background to any dropdown. The dark background (`rgba(20, 20, 28, 0.95)`) must be maintained.
> Always add the custom SVG chevron via `background-image` when using `appearance: none`.

---

## 5. File & Folder Structure

```
frontend/
├── docs/
│   ├── AI_AGENT_CONTEXT.md       ← This file
│   └── FRONTEND_DEVELOPMENT_PLAN.md
│
├── src/
│   ├── app/
│   │   ├── layout.tsx             ← Root layout: navbar, ambient bg, font loading
│   │   ├── globals.css            ← Design tokens, global selectors, navbar, buttons
│   │   ├── page.tsx               ← Landing page
│   │   ├── page.module.css
│   │   ├── login/
│   │   │   ├── page.tsx
│   │   │   └── page.module.css    ← Also imported by signup/
│   │   ├── signup/
│   │   │   └── page.tsx           ← Imports login/page.module.css
│   │   ├── onboarding/
│   │   │   ├── page.tsx
│   │   │   └── page.module.css
│   │   └── dashboard/
│   │       ├── page.tsx
│   │       └── page.module.css
│   │
│   ├── components/
│   │   └── NavbarAuth.tsx         ← Renders Login/Signup links or user avatar based on JWT
│   │
│   └── lib/
│       └── api.ts                 ← apiFetch() — the ONLY way to call the backend
│
├── public/
├── next.config.ts
└── package.json
```

---

## 6. API Integration Rules

### 6.1 Always Use `apiFetch()`
```typescript
import { apiFetch } from "@/lib/api";

// Correct:
const data = await apiFetch("/properties?lat=23.02&lng=72.57");

// WRONG — never do this:
const data = await fetch("http://localhost:8080/api/v1/properties...");
```

### 6.2 Backend Base URL
- Dev: `http://localhost:8080/api/v1` (from `NEXT_PUBLIC_API_URL` env var)
- The `apiFetch()` utility prepends this automatically. Only pass the path.

### 6.3 Auth Token
- JWT is stored in `localStorage` under the key `"jwt"`.
- `apiFetch()` reads and injects it automatically as `Authorization: Bearer <token>`.
- On 401 responses, redirect the user to `/login`.

### 6.4 Response Envelope
All backend responses follow:
```json
{ "success": true, "data": { ... }, "error": null, "meta": { "page": 1, "per_page": 20, "total": 150 } }
```
Read data from `response.data`. Check `response.success` before using data.

---

## 7. Business Rules the Frontend Must Enforce

These are display-layer constraints derived from the backend's business rules:

| UI Rule | Derived From |
|---------|-------------|
| Never show a platform fee to tenants anywhere in the UI | BR-01 |
| Dropdown for role at signup must only offer "tenant" and "landlord" — no "admin" option | BR-02 |
| Show the Verified badge ONLY when the API returns both `ai_photo` approved AND `manual/virtual_tour` approved | BR-04 |
| Squad invite button must be disabled when `current_member_count >= max_size` (5) | BR-05 |
| Landlord phone number: SHOW only when squad `status === 'locked'` OR individual token paid | BR-06 |
| Landlord's "List Property" CTA: show a KYC warning instead of the form if KYC is not verified | BR-07 |
| PG properties: show rent per-room, not at property level | BR-11 |

---

## 8. What to Never Do

> [!CAUTION]
> Violating any of these may compromise the design system or user experience.

- Do NOT use TailwindCSS. Styling is CSS Modules + `globals.css` only.
- Do NOT call the backend directly with `fetch()`. Always use `apiFetch()`.
- Do NOT add Redux, Zustand, or any state management library without discussion.
- Do NOT create Pages Router files (`pages/` directory). This is App Router only.
- Do NOT store the JWT anywhere other than `localStorage["jwt"]`. No cookies, no sessionStorage.
- Do NOT hardcode API URLs. Use `apiFetch()` which reads `NEXT_PUBLIC_API_URL`.
- Do NOT remove `color-scheme: dark` from any select element.
- Do NOT use `SELECT *` style API calls — always use the specific endpoint for your data need.
- Do NOT add inline styles that override the design system colors. Use CSS variables.
- Do NOT skip responsive design. Every new page/component must work on mobile (≥320px) and desktop.
- Do NOT show raw error objects to the user. Map them to friendly messages.

---

## 9. Responsiveness Rules

Every page must be tested against these breakpoints:

| Breakpoint | Target |
|------------|--------|
| `480px` | Small phone (min-width we support) |
| `768px` | Tablet / large phone |
| `1024px` | Laptop |
| `1440px` | Desktop |

**Rules:**
- Use `clamp()` for font sizes where appropriate.
- Use `min-height` instead of fixed `height` for layout containers on mobile.
- Navbars collapse to hide decorative links on `≤768px` — keep brand + auth buttons visible.
- Cards should stack vertically (`flex-direction: column`) on `≤768px`.
- Grids (`grid-template-columns: repeat(auto-fill, ...)`) are preferred over hardcoded column counts.

---

## 10. Dependency Decisions Log

| Decision | Choice | Reason |
|----------|--------|--------|
| CSS approach | CSS Modules + globals.css | Scoped styles, no runtime overhead |
| State management | React built-ins | Sufficient for current scope; avoid over-engineering |
| HTTP client | Custom `apiFetch()` wrapper | Thin, no external lib needed |
| Map library | TBD (Phase 2 Module 3) | Leaflet or Google Maps JS API being evaluated |
| Auth storage | `localStorage` | Simplest for JWT; revisit with httpOnly cookies in production hardening |
| Icon library | None | Inline SVG + Unicode; avoids bundle bloat |
| Animation | CSS only (keyframes + transitions) | No Framer Motion overhead for current needs |
