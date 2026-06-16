# Frontend Engineering Specification: Premium Dark-Mode

### \## 1. Design System \& Aesthetics

* **Color Palette:** Use a base of Deep Charcoal (#0A0A0A) or Pure Black (#000000). Accents should be muted Slate (#64748B) or Crisp White (#FFFFFF) for text.
* **Liquid Glass Surfaces:** Use `backdrop-blur-md` with semi-transparent backgrounds (`bg-white/5` or `bg-neutral-900/40`) and 1px borders (`border-white/10`) to create depth.
* **Typography:** Bold, high-contrast headings using sans-serif fonts (e.g., Inter or Geist). Tracking should be slightly tightened for a modern "Apple-esque" feel.

### \## 2. Core Layout Components

* **Intelligent Navbar:**

  * Sticky with a `backdrop-blur`.
  * Minimalist links with subtle hover underlines or opacity shifts.
  * Include a user profile/avatar component on the right.
* **High-Impact Hero Section:**

  * Large, centered typography.
  * Use of "pill" badges for announcements (e.g., "Live now in...").
  * Primary CTA: High-contrast (White background, Black text).
  * Secondary CTA: Outlined or glass-morphic.
* **Feature Cards:**

  * Uniform grid layouts.
  * Subtle hover elevations (slight scale or border-color shift).
  * Iconography should be minimalist (Lucide-react or Radix icons).

### \## 3. Dashboard \& Data Display

* **Dashboard Sidebar:** Collapsible or fixed thin-rail with intuitive icons and active-state indicators.
* **Stat Widgets:** Clean numerical data with subtle trend indicators (up/down arrows) and micro-sparklines.
* **Data Tables:** Borderless design with alternating row highlights and clear status badges (e.g., "Active", "Pending").
* **Empty States:** Centered, minimalist illustrations with clear "Action" buttons to keep users moving.

### \## 4. Technical Constraints (Next.js/TSX)

* **Client vs. Server:** Prioritize Server Components for static data and Hero sections; use Client Components for interactive dashboard widgets.
* **Responsive Flow:** Every component must be fluid. Dashboards should transition from multi-column grids (desktop) to single-stack lists (mobile).
* **Go Integration:** Expect strictly typed JSON responses from the Go backend; map these to TSX interfaces before rendering.

