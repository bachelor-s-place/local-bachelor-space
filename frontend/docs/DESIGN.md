# BachelorsSpace — Frontend Design Reference
> **Version:** 1.0 | **Last Updated:** April 2026
> **Mandatory:** Any agent or developer building a new page or component MUST read this file first.
> This document is the single source of truth for visual design. Do NOT invent new patterns — extend existing ones.

---

## 1. Design Philosophy

BachelorsSpace uses an **Apple-inspired dark glassmorphism** aesthetic. The goal is to feel premium, clean, and calm — not loud or busy.

Key principles:
- **Dark first.** Everything is built on black. No light mode.
- **Glass over solid.** Cards float on the background using translucent blur panels, never opaque boxes.
- **Restrained color.** One accent color (`#0066cc` blue). No rainbow palettes.
- **Typography does the heavy lifting.** Large, tight-tracked headings with a light grey body — no decorative icons or illustrations.
- **Motion is subtle.** Entrance animations only (fade up). No looping animations or distracting transitions.

---

## 2. Color System

All tokens are defined in `src/app/globals.css` and used via CSS variables everywhere.

```css
:root {
  /* Backgrounds */
  --bg-primary:        #000000;                    /* Page/body background */
  --bg-secondary:      #0d0d12;                    /* Slightly lighter bg for nesting */

  /* Text */
  --text-primary:      #f5f5f7;                    /* Headings, key content */
  --text-secondary:    #86868b;                    /* Labels, hints, muted text */

  /* Glass surfaces */
  --glass-bg:          rgba(255, 255, 255, 0.02);  /* Subtlest glass fill */
  --glass-border:      rgba(255, 255, 255, 0.06);  /* Default glass border */
  --glass-highlight:   rgba(255, 255, 255, 0.08);  /* Hover highlight fill */

  /* Accent */
  --accent-blue:       #0066cc;                    /* Primary CTAs, active states, links */
  --accent-blue-hover: #0077ed;                    /* Hover state for accent */
}
```

### Semantic Color Usage

| Purpose | Color | Notes |
|---------|-------|-------|
| Page background | `#000000` | Absolute black |
| Card / panel | `rgba(30, 30, 35, 0.4)` | Always with backdrop-filter |
| Card border | `rgba(255, 255, 255, 0.08)` | 0.5px, very subtle |
| Card hover border | `rgba(255, 255, 255, 0.15)` | Slightly brighter on hover |
| Primary text | `#f5f5f7` | Off-white, never pure `#fff` for body |
| Secondary text | `#86868b` | Labels, hints, descriptions |
| Primary action | `#f5f5f7` (bg) + `#000` (text) | White pill button |
| Secondary action | `rgba(255,255,255,0.1)` (bg) + `#f5f5f7` (text) | Translucent pill button |
| Active / selected | `rgba(0, 102, 204, 0.15)` (bg) + `#0066cc` (border/text) | Blue tint |
| Success score | `#27c93f` | Match ≥ 80% |
| Warning score | `#ffbd2e` | Match 60–79% |
| Danger / error | `#ff5f56` | Match < 60%, errors |
| Close dot | `#ff5f56` | macOS-style window controls |
| Minimize dot | `#ffbd2e` | |
| Maximize dot | `#27c93f` | |

---

## 3. Typography

**Font:** Inter (loaded via `next/font/google`, available as `var(--font-inter)`)

All headings use:
```css
font-family: var(--font-inter), sans-serif;
font-weight: 600;
letter-spacing: -0.03em;   /* Tight tracking — Apple style */
```

### Scale

| Element | Size | Weight | Letter Spacing | Color |
|---------|------|--------|----------------|-------|
| Hero H1 | `clamp(3rem, 6vw, 5.5rem)` | 600 | `-0.04em` | `var(--text-primary)` |
| Page H1 (dashboard, detail) | `1.8rem` | 600 | `-0.02em` | `#fff` |
| Card / section title | `1.15rem – 1.5rem` | 500–600 | `-0.01em` | `#fff` |
| Body / description | `0.9rem – 0.95rem` | 400 | default | `var(--text-secondary)` |
| Label / hint | `0.75rem – 0.85rem` | 400–500 | default | `var(--text-secondary)` |
| Button | `0.85rem – 0.95rem` | 500 | default | inherit |
| Badge / chip | `0.75rem – 0.85rem` | 500 | `0.02em` | `var(--text-secondary)` |

---

## 4. Ambient Background

Every page has a fixed ambient glow behind all content. It is rendered by the `.ambient-background` div in `layout.tsx` and sits at `z-index: -1`.

```css
.ambient-background {
  position: fixed;
  inset: 0;
  background-color: #000;
  background-image:
    radial-gradient(ellipse at 15% 50%, rgba(32, 58, 107, 0.25) 0%, transparent 50%),
    radial-gradient(ellipse at 85% 30%, rgba(68, 38, 99, 0.25) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 100%, rgba(20, 70, 80, 0.2) 0%, transparent 50%);
  filter: blur(40px);
}
```

**Rule:** Never add a `background-color` to `<html>`, `<body>`, or the main page `<main>` that would cover this. Pages are transparent over the ambient background.

---

## 5. Navbar

Fixed at the top. VisionOS-inspired frosted glass bar.

```css
.navbar {
  position: fixed;
  top: 0;
  width: 100%;
  padding: 1rem 5%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(24px) saturate(180%);
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.08);
}
```

- **Brand name:** `1.25rem`, weight 600, `#f5f5f7`
- **Nav links:** `0.85rem`, weight 400, `var(--text-secondary)` → hover `var(--text-primary)`
- **Auth buttons:** `.btn-primary` or `.btn-secondary` (see Section 6)

**Offset rule:** Every page's `<main>` must have `padding-top: 80px` minimum to clear the fixed navbar.

---

## 6. Buttons

Two global button classes. Do NOT create page-level button styles — use these.

### `.btn-primary` (White pill — primary CTA)
```css
background: #f5f5f7;
color: #000;
padding: 0.5rem 1rem;
border-radius: 999px;
font-weight: 500;
font-size: 0.85rem;
border: none;
cursor: pointer;
transition: all 0.2s ease;
white-space: nowrap;
```
Hover: `background: #fff; transform: scale(1.02)`

### `.btn-secondary` (Translucent pill — secondary action)
```css
background: rgba(255, 255, 255, 0.1);
border: 0.5px solid rgba(255, 255, 255, 0.15);
color: #f5f5f7;
padding: 0.5rem 1rem;
border-radius: 999px;
font-weight: 500;
font-size: 0.85rem;
cursor: pointer;
backdrop-filter: blur(20px);
transition: all 0.2s ease;
white-space: nowrap;
```
Hover: `background: rgba(255, 255, 255, 0.15)`

### Page-level submit buttons (inside forms)
These are defined per-module CSS but follow the same base pattern — rectangular (12px radius), full-width:
```css
/* e.g. .submitBtn in login, .btnNext in onboarding */
background: #f5f5f7;     /* or #0066cc for blue variant */
color: #000;             /* or #fff for blue variant */
padding: 0.85rem – 1rem;
border-radius: 12px;
font-weight: 500;
border: none;
cursor: pointer;
transition: background 0.2s, transform 0.2s;
```

---

## 7. Glass Card Pattern

The most-used component in the UI. Used for: auth cards, onboarding card, feature cards, match cards, filter panels.

```css
/* Standard glass card */
background: rgba(30, 30, 35, 0.4);
border: 0.5px solid rgba(255, 255, 255, 0.08);
border-radius: 20px;          /* or 24px for large cards */
backdrop-filter: blur(40px) saturate(150%);
-webkit-backdrop-filter: blur(40px) saturate(150%);
box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
```

Hover state (for interactive cards):
```css
background: rgba(40, 40, 45, 0.5);
border-color: rgba(255, 255, 255, 0.15);
transform: translateY(-2px);
```

**Active / selected card:**
```css
background: rgba(0, 102, 204, 0.15);
border-color: #0066cc;
```

---

## 8. Form Inputs

Standard dark input used across login, signup, onboarding.

```css
.input {
  background: rgba(255, 255, 255, 0.05);    /* or rgba(20, 20, 28, 0.95) for selects */
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  padding: 0.8rem – 1rem;
  border-radius: 12px;
  color: #fff;
  font-size: 0.95rem – 1rem;
  outline: none;
  transition: all 0.2s ease;
  font-family: var(--font-inter);
  color-scheme: dark;
  width: 100%;
}

.input:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.05);
}
```

**Labels:**
```css
font-size: 0.85rem;
color: var(--text-secondary);
font-weight: 500;
```

---

## 9. Dropdowns (`<select>`) — Critical Rule

> [!CAUTION]
> Browser native `<select>` elements render their dropdown list using the OS theme.
> On dark pages this causes a white background with invisible text unless explicitly overridden.

**The fix is already applied globally in `globals.css`:**
```css
select {
  color-scheme: dark;
  background-color: rgba(20, 20, 28, 0.95);
  color: #f5f5f7;
  border: 0.5px solid rgba(255, 255, 255, 0.12);
  outline: none;
  cursor: pointer;
  font-family: var(--font-inter), sans-serif;
}

select option {
  background-color: #1a1a24;
  color: #f5f5f7;
}
```

**When using `appearance: none` (custom chevron):**
```css
select {
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2386868b' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  padding-right: 2.5rem;
}
```

**Rules:**
- Never set `background: white` or `background: #fff` on any select or option
- Always include `color-scheme: dark`
- Always add the custom SVG chevron when using `appearance: none`

---

## 10. Chip / Badge / Tag Components

### Lifestyle / Filter Chips
Used in dashboard filter section and future property detail tags.
```css
.chip {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.chip:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.chip.active {
  background: rgba(0, 102, 204, 0.2);
  border-color: #0066cc;
  color: #fff;
}
```

### Trait / Info Badges (small, inside cards)
```css
.traitBadge {
  padding: 0.25rem 0.6rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.traitBadge.matched {
  background: rgba(39, 201, 63, 0.15);
  color: #27c93f;
}
```

### Status Badge Pills (property, KYC, squad status)
Pattern to follow for any status-indicator pill:
```css
/* Base */
display: inline-flex; align-items: center; gap: 0.4rem;
padding: 0.25rem 0.75rem;
border-radius: 999px;
font-size: 0.75rem;
font-weight: 500;

/* Verified / Success */
background: rgba(39, 201, 63, 0.1);
color: #27c93f;
border: 0.5px solid rgba(39, 201, 63, 0.3);

/* Pending / Warning */
background: rgba(255, 189, 46, 0.1);
color: #ffbd2e;
border: 0.5px solid rgba(255, 189, 46, 0.3);

/* Rejected / Error */
background: rgba(255, 95, 86, 0.1);
color: #ff5f56;
border: 0.5px solid rgba(255, 95, 86, 0.3);

/* Draft / Neutral */
background: rgba(134, 134, 139, 0.1);
color: var(--text-secondary);
border: 0.5px solid rgba(134, 134, 139, 0.2);
```

---

## 11. Match Score Display

Used for compatibility scores (0–100%). Three tiers with gradient text.

```css
.matchScore {
  font-size: 1.5rem;     /* 3rem on hero card */
  font-weight: 700;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ≥ 80% — green */
.scoreHigh   { background-image: linear-gradient(135deg, #27c93f, #00a82d); }
/* 60–79% — yellow */
.scoreMedium { background-image: linear-gradient(135deg, #ffbd2e, #e8a010); }
/* < 60% — red */
.scoreLow    { background-image: linear-gradient(135deg, #ff5f56, #d93c34); }
```

---

## 12. Layout Patterns

### Full-Page Centered (auth, onboarding)
```css
.container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  padding-top: 80px;    /* navbar offset */
}
```

### Sidebar + Content (dashboard, landlord portal, admin)
```css
.dashboardLayout {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  min-height: calc(100vh - 80px);
  padding: 1rem;
  gap: 1.5rem;
}

.sidebar {
  width: 280px;
  flex-shrink: 0;
  /* glass card pattern */
  border-radius: 24px;
  padding: 2rem 1.5rem;
}

.mainContent {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
}
```

### Two-Column Feature Grid (landing page)
```css
.featuresSection {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}
/* Mobile: @media (max-width: 768px) → grid-template-columns: 1fr */
```

### Card Grid (match cards, property listings)
```css
.matchesGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}
/* Mobile @media (max-width: 600px) → grid-template-columns: 1fr */
```

---

## 13. Animations

All animations use the same easing: `cubic-bezier(0.16, 1, 0.3, 1)` (snappy spring).

### Standard Entrance (fadeUp)
Applied to page-level sections and cards on mount:
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Usage */
opacity: 0;
animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
/* Stagger with delay: 0.1s, 0.3s, 0.5s, 0.7s for sequential elements */
```

### Hover Micro-animations
```css
/* Cards — subtle lift */
transition: transform 0.2s ease, background 0.2s ease;
hover: transform: translateY(-4px);

/* Option cards — smaller lift */
hover: transform: translateY(-2px);

/* Chips — tiny lift */
hover: transform: translateY(-1px);

/* Buttons */
hover: transform: scale(1.02);
```

### Step Indicator Dot (onboarding)
```css
.dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}
.dot.active {
  background: #0066cc;
  transform: scale(1.2);
}
```

---

## 14. Sidebar Navigation Pattern

Used in dashboard and planned for landlord/admin portals.

```css
.navItem {
  padding: 0.75rem 1rem;
  border-radius: 12px;
  font-size: 0.95rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.navItem:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.navItem.active {
  background: rgba(0, 102, 204, 0.15);
  color: #0066cc;
  font-weight: 500;
}
```

Navigation icons use Unicode symbols (no icon library):
- `✦` — AI / Matchmaking
- `◉` — Properties / Map
- `◈` — Messages / Chat
- `⚙` — Settings
- `🔔` — Notifications

---

## 15. Scrollbar Styling

Applied to scrollable content panels (not the whole page body).

```css
.mainContent::-webkit-scrollbar {
  width: 6px;
}
.mainContent::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
```

---

## 16. Responsiveness Breakpoints

| Breakpoint | Rule |
|------------|------|
| `≤ 1024px` | Start compressing grid columns |
| `≤ 900px` | Sidebar collapses — `flex-direction: column`; sidebar nav becomes horizontal row |
| `≤ 768px` | Navbar hides decorative links (keeps brand + auth); hero text shrinks; feature grid → 1 col; CTA buttons stack |
| `≤ 600px` | Card grids → single column; reduce card padding |
| `≤ 480px` | Minimum supported width; cards reduce padding further; font sizes shrink one level |

**Key rules:**
- Use `min-height` not `height` for layout containers on mobile
- Use `clamp()` for hero font sizes
- Flex containers switch to `flex-direction: column` at ≤768px
- All grid layouts fall back to `grid-template-columns: 1fr` at ≤768px

---

## 17. macOS-Style Window Chrome (Dashboard Preview)

Used on the landing page mockup. Pattern for any "app window" mock:

```css
/* Window header bar */
height: 48px;
background: rgba(255, 255, 255, 0.02);
border-bottom: 0.5px solid rgba(255, 255, 255, 0.08);
display: flex; align-items: center; padding: 0 1.25rem;
justify-content: space-between;

/* Traffic light dots */
.dot:nth-child(1) { background: #ff5f56; }  /* Close */
.dot:nth-child(2) { background: #ffbd2e; }  /* Minimize */
.dot:nth-child(3) { background: #27c93f; }  /* Maximize */
/* Each dot: 12px × 12px, border-radius 50%, border: 0.5px solid rgba(0,0,0,0.2) */
```

---

## 18. Avatar / Profile Circle

Used in navbar, sidebar, and match cards.

```css
/* Standard avatar */
width: 48px;
height: 48px;
border-radius: 50%;
background: linear-gradient(135deg, #0066cc, #004499);
border: 1px solid rgba(255, 255, 255, 0.2);

/* Match card avatar (gradient per person — passed as inline style) */
background: linear-gradient(135deg, {color1}, {color2});
```

For text-based initials avatars (when no image), use the same gradient background with centered white initials (`font-size: 0.85rem; font-weight: 600; color: #fff`).

---

## 19. Divider Pattern

Horizontal rules between form sections:

```css
.divider {
  display: flex;
  align-items: center;
  color: var(--text-secondary);
  font-size: 0.8rem;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.1);
}
.divider:not(:empty)::before { margin-right: 0.5em; }
.divider:not(:empty)::after  { margin-left: 0.5em; }
```

---

## 20. Quick Reference — New Page Checklist

When creating any new page, verify:

- [ ] `<main>` has `padding-top: 80px` minimum (navbar offset)
- [ ] Page background is transparent (ambient bg shows through)
- [ ] All cards use the glassmorphism pattern (Section 7)
- [ ] All `<select>` elements have `color-scheme: dark` (Section 9)
- [ ] All `<input>` and `<select>` use the dark input style (Section 8)
- [ ] Buttons use `.btn-primary` / `.btn-secondary` global classes — not custom ones
- [ ] Font sizes follow the typography scale (Section 3)
- [ ] Colors only use the design token variables — no raw hex codes except from Section 2
- [ ] Entrance animations use `fadeUp` with `cubic-bezier(0.16, 1, 0.3, 1)` easing
- [ ] Layout uses `min-height` not `height` for containers
- [ ] Responsive rules are defined for ≤768px and ≤480px breakpoints
- [ ] Status indicators use the badge pill pattern (Section 10)
