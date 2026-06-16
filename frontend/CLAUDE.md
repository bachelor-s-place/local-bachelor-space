@AGENTS.md
# BachelorsSpace Frontend — Agent Instructions

> Read these files **completely** before making ANY changes to this codebase.

## Required Reading (in order)

1. **[`docs/AI_AGENT_CONTEXT.md`](./docs/AI_AGENT_CONTEXT.md)**
   Design system rules, color tokens, CSS conventions, API integration rules, dropdown fix, responsiveness rules, and a full list of what never to do.

2. **[`docs/DESIGN.md`](./docs/DESIGN.md)**
   Visual design reference — every color token, typography scale, glass card pattern, button style, animation, layout pattern, and a new-page checklist. **Read before building any UI.**

3. **[`docs/FRONTEND_DEVELOPMENT_PLAN.md`](./docs/FRONTEND_DEVELOPMENT_PLAN.md)**
   13-module Phase 2 build plan — what's built, what's next, file structure per module, and API endpoints per feature.

4. **[`../go-backend/docs/AI_AGENT_CONTEXT.md`](../go-backend/docs/AI_AGENT_CONTEXT.md)**
   Backend business rules (BR-01 through BR-13), API response envelope format, auth conventions, and what the backend enforces.

## Critical Rules (Non-Negotiable)

- **Styling:** CSS Modules + `globals.css` only. No TailwindCSS. No inline style overrides of design tokens.
- **HTTP:** Always use `apiFetch()` from `src/lib/api.ts`. Never call `fetch()` directly.
- **Dropdowns:** All `<select>` elements must keep `color-scheme: dark`. Never remove it.
- **Responsive:** Every page/component must work from 320px → 1440px width.
- **Router:** App Router only. No `pages/` directory.
- **Auth:** JWT lives in `localStorage["jwt"]` only. Read it via `apiFetch()` — it injects automatically.
