# BachelorsSpace — Frontend Development Plan (Phase 2)
> **Project:** BachelorsSpace
> **Framework:** Next.js 14 (App Router) + TypeScript
> **Date:** April 2026
> **Status:** 🟡 Planning Complete — Ready to Build

This document describes the Phase 2 frontend build plan. Read `AI_AGENT_CONTEXT.md` first for conventions, design rules, and hard constraints.

Backend Phase 1 is **complete**. All endpoints listed in the go-backend `BACKEND_DEVELOPMENT_PLAN.md` are available.

---

## Strategy: Vertical Slice (Mirror of Backend Plan)

Each module produces **working, visually complete pages** before the next starts. We build authentication first (every other page depends on it), then the core tenant flows, then landlord flows, then admin.

**User type priority order:** Tenant flows → Landlord flows → Admin panel

---

## Module Overview

| # | Module | Status | Depends On |
|---|--------|--------|------------|
| 1 | Auth Hardening (Login/Signup/Onboarding → real API) | ✅ Completed | Backend Auth |
| 2 | Tenant: Property Map Search | ✅ Completed | Module 1 |
| 3 | Tenant: Property Detail Page | ✅ Completed | Module 2 |
| 4 | Tenant: Squad System UI | ✅ Completed | Modules 1, 3 |
| 5 | Tenant: Matchmaking Dashboard (real data) | ✅ Completed | Module 4 |
| 6 | Tenant: Chat (Squad Private Messages) | ✅ Completed | Module 4 |
| 7 | Landlord: KYC Submission Flow | ✅ Completed | Module 1 |
| 8 | Landlord: Property Listing Manager | ✅ Completed | Module 7 |
| 9 | Landlord: PG Room Manager | ✅ Completed | Module 8 |
| 10 | Admin: Verification Queue | 🔲 Not started | Modules 7, 8 |
| 11 | Admin: KYC Review Panel | 🔲 Not started | Module 10 |
| 12 | Payments: Token Payment Flow | ✅ Completed | Modules 4, 8 |
| 13 | Notifications: In-App Feed | ✅ Completed | Module 1 |

---

## Module 1: Auth Hardening

**Goal:** Connect existing Login, Signup, and Onboarding pages to real backend APIs. Add route protection.

### Files to Create / Modify

| File | Change |
|------|--------|
| `src/app/login/page.tsx` | Already connected — add better error mapping + loading UX |
| `src/app/signup/page.tsx` | Already connected — add success toast + redirect |
| `src/app/onboarding/page.tsx` | Connect step 3 to `PUT /api/v1/users/me/profile` |
| `src/lib/auth.ts` | **[NEW]** `isAuthenticated()`, `getJWT()`, `clearJWT()` helpers |
| `src/middleware.ts` | **[NEW]** Next.js edge middleware — redirect unauthenticated to `/login` for protected routes |
| `src/context/AuthContext.tsx` | **[NEW]** React context for current user data; wraps `layout.tsx` |
| `src/components/NavbarAuth.tsx` | Update to show user avatar + name when logged in; logout button |

### Protected Routes (redirect to `/login` if no JWT)
- `/dashboard`
- `/onboarding`
- `/squads/*`
- `/landlord/*`
- `/admin/*`

### API Calls
| Action | Endpoint |
|--------|----------|
| Login | `POST /api/v1/auth/login` |
| Register | `POST /api/v1/auth/register` |
| Get profile | `GET /api/v1/users/me` |
| Update lifestyle profile | `PUT /api/v1/users/me/profile` |

### Key Design Notes
- Store JWT: `localStorage["jwt"]`
- On token expiry (401 response from `apiFetch`), redirect to `/login` and clear the token
- Onboarding is shown once after signup. After completion, redirect to `/dashboard`

---

## Module 2: Tenant — Property Map Search

**Goal:** Full-screen map with property pins. Filter panel. Property card list alongside map.

### Files to Create

| File | Purpose |
|------|---------|
| `src/app/properties/page.tsx` | Map search page |
| `src/app/properties/page.module.css` | Styles |
| `src/components/MapView.tsx` | **[NEW]** Leaflet map component (dynamically imported — no SSR) |
| `src/components/PropertyCard.tsx` | **[NEW]** Reusable property card (used in map + listing pages) |
| `src/components/FilterPanel.tsx` | **[NEW]** Lifestyle filter chips + price range slider |
| `src/types/property.ts` | **[NEW]** TypeScript interfaces for property/room API responses |

### Layout
```
┌─────────────────────────────────────────┐
│  Navbar                                  │
├──────────────┬──────────────────────────┤
│  Filter Panel │     Interactive Map       │
│  (300px)     │  (pins for each property) │
│              │                           │
│  Property    │  [Click pin → highlight   │
│  Card List   │   card in left panel]     │
└──────────────┴──────────────────────────┘
```

### API Calls
| Action | Endpoint |
|--------|----------|
| Search properties | `GET /api/v1/properties?lat=&lng=&radius=&property_type=&price_min=&price_max=&lifestyle_tags=&page=&per_page=` |

### Map Library Decision
Use **Leaflet.js** with **react-leaflet**:
- Fully open-source, no API key required for base tiles
- OpenStreetMap tiles for development; Google Maps tiles can be swapped in later
- Must be dynamically imported (`next/dynamic` with `ssr: false`) — Leaflet has browser-only code

### Key Design Notes
- Map center defaults to Ahmedabad (23.0225, 72.5714) on first load
- Each pin shows a price badge (e.g., `₹12k`) using a custom Leaflet DivIcon
- Verified properties get a blue checkmark on their pin
- Filter panel is collapsible on mobile (slides up from bottom as a drawer)
- Property cards are paginated (20 per page); "Load more" button at the bottom

---

## Module 3: Tenant — Property Detail Page

**Goal:** Rich property detail with photos, verified badge, room list (for PGs), Squad CTA.

### Files to Create

| File | Purpose |
|------|---------|
| `src/app/properties/[id]/page.tsx` | Dynamic route — property detail |
| `src/app/properties/[id]/page.module.css` | Styles |
| `src/components/VerifiedBadge.tsx` | **[NEW]** Shows badge only when both verifications are approved |
| `src/components/ImageGallery.tsx` | **[NEW]** Lightbox-style image viewer |
| `src/components/RoomGrid.tsx` | **[NEW]** Room availability grid for PG properties |

### Layout
```
┌──────────────────────────────────────────────┐
│  [← Back]   Property Title   [Verified ✓]   │
├──────────────────────────────────────────────┤
│  [Photo Gallery — 3 columns, lightbox click] │
├───────────────────┬──────────────────────────┤
│  Description      │  Booking Panel           │
│  Lifestyle tags   │  ₹18,000/mo              │
│  Amenities        │  [Find Squad for this]   │
│                   │  [Contact Landlord]       │
│  Map preview      │  (phone hidden if locked)│
│  (mini static)    │                          │
├───────────────────┴──────────────────────────┤
│  Rooms (PG only — grid of available rooms)  │
└──────────────────────────────────────────────┘
```

### API Calls
| Action | Endpoint |
|--------|----------|
| Get property | `GET /api/v1/properties/{id}` |

### Key Design Notes
- **Verification:** Since there is no detailed `/verification-status` endpoint, the `VerifiedBadge` will display purely based on `property.status === 'verified'`.
- **Images:** The backend does not yet support image uploads. The UI will render high-quality placeholder images for now so the layout is complete.
- **Rooms (PG):** The `/rooms` endpoint does not exist. For PG properties, we will render a UI placeholder for the room grid.
- **Contacting Landlord:** We will only show an option to "Form a Squad" for this property initially. Direct landlord contact relies on the Squad API (Module 4/9).

---

## Module 4: Tenant — Squad System UI

**Goal:** Full squad lifecycle UI — register lookup intent, view matches, create squad, invite members, manage proposals.

**Status:** ✅ Completed (Includes Shareable Invite Links & Join Flow)

### Files to Create

| File | Purpose |
|------|---------|
| `src/app/squads/page.tsx` | Squad hub — shows active squad or "Find Roommates" CTA |
| `src/app/squads/[id]/page.tsx` | Squad detail — members, proposals, chat tab |
| `src/app/squads/[id]/page.module.css` | |
| `src/app/squads/lookup/page.tsx` | Register squad-first lookup intent |
| `src/components/SquadMemberCard.tsx` | **[NEW]** Member card with compatibility score |
| `src/components/ProposalList.tsx` | **[NEW]** Property proposals list with accept/reject for leader |
| `src/components/InviteModal.tsx` | **[NEW]** Invite flow from match list |
| `src/types/squad.ts` | **[NEW]** TypeScript interfaces for squad API responses |

### Squad Status States → UI
| Squad Status | UI State |
|-------------|---------|
| `browsing` | "Browsing together" — show property proposals tab |
| `forming` | "Forming up" — property selected, members confirming |
| `locked` | "Locked in! 🔒" — show landlord contact + payment CTA |
| `moved_in` | "Moved In 🏠" — show move-in confirmation and history |
| `disbanded` | "Squad disbanded" — archive view |

### API Calls
| Action | Endpoint |
|--------|----------|
| Register lookup | `POST /api/v1/squad-lookups` |
| Get matches | `GET /api/v1/squad-lookups/matches` |
| Create squad | `POST /api/v1/squads` |
| Get squad | `GET /api/v1/squads/{id}` |
| Invite member | `POST /api/v1/squads/{id}/invite` |
| Accept/reject invite | `PUT /api/v1/squads/{id}/members/me` |
| Leave squad | `DELETE /api/v1/squads/{id}/members/me` |
| Submit proposal | `POST /api/v1/squads/{id}/proposals` |
| List proposals | `GET /api/v1/squads/{id}/proposals` |
| Accept/reject proposal (leader) | `PUT /api/v1/squads/{id}/proposals/{proposalId}` |
| Disband squad (leader) | `DELETE /api/v1/squads/{id}` |

---

## Module 5: Tenant — Matchmaking Dashboard (Real Data)

**Goal:** Replace mock data in `src/app/dashboard/page.tsx` with real API calls.

**Status:** ✅ Completed (Includes AI Similarity Threshold Refinements & Glassmorphism Design)

### Files to Modify

| File | Change |
|------|--------|
| `src/app/dashboard/page.tsx` | Replace `POTENTIAL_ROOMMATES` mock with `GET /api/v1/squad-lookups/matches` |
| `src/app/dashboard/page.module.css` | No change needed |

### Key Design Notes
- Compatibility score comes from the API (`compatibility_score` field, 0–1 float → multiply by 100 for display)
- Loading skeleton cards while fetching (3 placeholder cards with shimmer animation)
- Empty state: "No matches yet. Complete your lifestyle profile to get matched."
- Matches are paginated (10 per page from backend) — add a "Load more" button

---

## Module 6: Tenant — Squad Chat

**Goal:** Private chat inside a squad. Paginated message history. Real-time feel via polling.

### Files to Create

| File | Purpose |
|------|---------|
| `src/app/squads/[id]/chat/page.tsx` | Chat UI |
| `src/app/squads/[id]/chat/page.module.css` | |
| `src/components/ChatBubble.tsx` | **[NEW]** Message bubble with sender name + timestamp |
| `src/hooks/useChat.ts` | **[NEW]** Custom hook: fetch messages, send message, polling |

### Chat Architecture (Phase 2 — No WebSocket)
- Poll `GET /api/v1/squads/{id}/messages` every **3 seconds** using `setInterval` in `useChat` hook
- Send via `POST /api/v1/squads/{id}/messages`
- Mark as read via `PUT /api/v1/squads/{id}/messages/read` when chat is visible
- Pagination: cursor-based using `sent_at` timestamp

> [!NOTE]
> WebSocket / Redis Streams real-time chat is planned for Phase 3 (mobile app).
> For now, polling every 3 seconds is the accepted approach.

---

## Module 7: Landlord — KYC Submission Flow

**Goal:** Landlords can submit Aadhaar + PAN and view KYC status.

### Files to Create

| File | Purpose |
|------|---------|
| `src/app/landlord/kyc/page.tsx` | KYC submission form + status display |
| `src/app/landlord/kyc/page.module.css` | |
| `src/app/landlord/layout.tsx` | **[NEW]** Landlord-specific layout (sidebar navigation) |

### KYC Status → UI Mapping
| Status | Display |
|--------|---------|
| No KYC submitted | Form to enter Aadhaar + PAN |
| `pending` | "Under review" with timestamp |
| `verified` | Green badge. "You can now list properties." |
| `rejected` | Red badge. Show `notes` field. Option to resubmit. |

### API Calls
| Action | Endpoint |
|--------|----------|
| Submit KYC | `POST /api/v1/kyc` |
| Check KYC status | `GET /api/v1/kyc/status` |

---

## Module 8: Landlord — Property Listing Manager

**Goal:** Create new listings, manage existing ones, submit for verification.

### Files to Create

| File | Purpose |
|------|---------|
| `src/app/landlord/properties/page.tsx` | List all landlord properties |
| `src/app/landlord/properties/new/page.tsx` | Create new listing form |
| `src/app/landlord/properties/[id]/page.tsx` | Edit property |
| Various `.module.css` | |
| `src/components/PropertyStatusBadge.tsx` | **[NEW]** `draft` / `pending_verification` / `verified` / `occupied` badge |

### Property Form Fields
- Title, Description, Property Type (room/flat/pg/studio)
- Address, City, Locality (geocoded by backend)
- Rent Amount, Deposit Amount, Capacity
- Lifestyle Tags (multi-select chips — same design as dashboard)
- Image URLs (Phase 1 approach: manual URL input; Phase 3 will be file upload)

### API Calls
| Action | Endpoint |
|--------|----------|
| List my properties | `GET /api/v1/properties` (filtered by owner) |
| Create property | `POST /api/v1/properties` |
| Update property | `PUT /api/v1/properties/{id}` |
| Add image | `POST /api/v1/properties/{id}/images` |

---

## Module 9: Landlord — PG Room Manager

**Goal:** Add, edit, and manage individual rooms within a PG property.

### Files to Create

| File | Purpose |
|------|---------|
| `src/app/landlord/properties/[id]/rooms/page.tsx` | Room grid for PG |
| `src/app/landlord/properties/[id]/rooms/new/page.tsx` | Add room form |
| `src/components/RoomCard.tsx` | **[NEW]** Room availability card for landlord view |

### API Calls
| Action | Endpoint |
|--------|----------|
| List rooms | `GET /api/v1/properties/{id}/rooms` |
| Add room | `POST /api/v1/properties/{id}/rooms` |
| Update room | `PUT /api/v1/properties/{id}/rooms/{roomId}` |

---

## Module 10: Admin — Verification Queue

**Goal:** Admin can see pending verifications and approve/reject them.

### Files to Create

| File | Purpose |
|------|---------|
| `src/app/admin/verifications/page.tsx` | Verification queue |
| `src/app/admin/layout.tsx` | **[NEW]** Admin sidebar layout (requires role=admin check) |

### Queue Layout
```
┌───────────────────────────────────────────────┐
│  Property Title   │  Type     │  Status   │ Actions │
│  3BHK SG Highway  │ ai_photo  │ pending   │ ✓ ✗     │
│  Studio Navrangp. │ manual    │ pending   │ ✓ ✗     │
└───────────────────────────────────────────────┘
```

### API Calls
| Action | Endpoint |
|--------|----------|
| List pending | `GET /api/v1/admin/verifications` |
| Trigger AI check | `POST /api/v1/admin/verifications/{propertyId}/ai` |
| Approve | `PUT /api/v1/admin/verifications/{id}/approve` |
| Reject | `PUT /api/v1/admin/verifications/{id}/reject` |

---

## Module 11: Admin — KYC Review Panel

**Goal:** Admin can see pending KYC submissions and approve/reject them.

### Files to Create

| File | Purpose |
|------|---------|
| `src/app/admin/kyc/page.tsx` | KYC review list |

### API Calls
| Action | Endpoint |
|--------|----------|
| List all KYC | `GET /api/v1/admin/kyc` |
| Approve KYC | `PUT /api/v1/admin/kyc/{id}/approve` |
| Reject KYC | `PUT /api/v1/admin/kyc/{id}/reject` |

---

## Module 12: Payments — Token Payment Flow

**Goal:** Squad leader initiates token payment via Razorpay to lock a property.

### Files to Create

| File | Purpose |
|------|---------|
| `src/app/squads/[id]/payment/page.tsx` | Payment initiation + status page |
| `src/components/RazorpayButton.tsx` | **[NEW]** Loads Razorpay JS SDK, opens payment modal |

### Payment Flow
```
1. Squad leader clicks "Pay Token Amount" on squad page
2. `POST /api/v1/transactions` → backend creates order + returns { razorpay_order_id, amount }
3. Frontend opens Razorpay modal (SDK loaded via script tag)
4. On success → Razorpay webhook updates backend → squad status = 'locked'
5. Frontend polls `GET /api/v1/squads/{id}` until status = 'locked'
6. Show "Property Locked! 🔒" confirmation screen
```

> [!IMPORTANT]
> The Razorpay JS SDK must be loaded dynamically (not via npm package). Add it as a script tag.
> Never store Razorpay credentials on the frontend. All order creation happens server-side (Go backend).

---

## Module 13: Notifications — In-App Feed

**Goal:** Notification bell in navbar with unread count. Dropdown feed.

**Status:** ✅ Completed

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/NotificationBell.tsx` | **[NEW]** Navbar bell icon with unread count badge |
| `src/app/notifications/page.tsx` | Full notifications page |
| `src/hooks/useNotifications.ts` | **[NEW]** Fetch + poll notifications, mark read |

### API Calls
| Action | Endpoint |
|--------|----------|
| Get notifications | `GET /api/v1/notifications` |
| Mark one read | `PUT /api/v1/notifications/{id}/read` |
| Mark all read | `PUT /api/v1/notifications/read-all` |

### Notification Types → UI Messages
| Type | Display |
|------|---------|
| `kyc_approved` | "🎉 Your KYC has been approved! You can now list properties." |
| `kyc_rejected` | "⚠️ Your KYC was rejected. Tap to see why." |
| `property_verified` | "✅ Your property has been verified!" |
| `squad_invite` | "👥 You've been invited to join a squad." |
| `token_payment_success` | "🔒 Token paid! Property secured." |
| `move_in_confirmed` | "🏠 Move-in confirmed!" |

---

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1   # Backend base URL
```

---

## Verification Plan per Module

After each module is built:
1. **Visual check** — open in browser at 1440px, 768px, and 375px widths
2. **API check** — ensure all API calls succeed with the running Go backend
3. **Auth check** — confirm protected routes redirect unauthenticated users to `/login`
4. **Dropdown check** — all `<select>` elements must have dark background and visible light text
5. **Error states** — confirm all forms show user-friendly error messages on API failure

---

*End of Frontend Development Plan v1.0*
