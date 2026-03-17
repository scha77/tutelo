# Knowledge

Append-only register of project-specific rules, patterns, and lessons learned.

---

## UI/UX Design Guidelines

These are the foundational design principles for all Tutelo interfaces. Follow them when building any UI — landing pages, dashboard, booking flows, teacher profiles, etc.

### 1. Affordance & Signifiers

The UI must communicate how it works without explicit instructions.

- **Grouping:** Use containers or whitespace to show relationships. Elements inside a box are related; those outside are not.
- **State Indicators:**
  - *Selection:* Use highlights or borders to show active items.
  - *Status:* Use "grayed out" styling to signify inactive or disabled elements.
- **Feedback:** Every interaction requires a response. Every button/input must have four states: Default, Hover, Active (Pressed), and Disabled.

### 2. Visual Hierarchy & Contrast

Direct the user's eye to the most important information first.

- **The "Big Three":** Use Size, Position, and Color to establish importance.
- **Scanning:** Place primary data (e.g., Price, Titles) at the top or in high-contrast colors to make them stand out.
- **De-emphasis:** Secondary info (e.g., timestamps, locations) should be smaller, lighter in weight, and placed below primary content.
- **Imagery:** Use images whenever possible to add color and make the UI more scannable.

### 3. Layout & Spacing

Consistency is more important than strict adherence to grids.

- **The 4pt Grid System:** Use multiples of 4 for spacing and padding. This allows for clean mathematical halving and ensures consistency.
- **Whitespace:** Let elements "breathe." Group related items (e.g., Header + Subtext) closer together, and use larger gaps (e.g., 32px) to separate distinct sections.
- **Responsive Standards:**
  - Desktop: 12 columns
  - Tablet: 8 columns
  - Mobile: 4 columns

### 4. Typography Rules

Design is 90% text; keep it simple and readable.

- **Font Selection:** Stick to one high-quality Sans-Serif font family.
- **Pro Styling:** For large headers, tighten letter spacing (-2% to -3%) and reduce line height (10% to 20%) to make it look professional.
- **Constraints:**
  - Landing Pages: Max 6 font sizes
  - Dashboards: Max size 24px (to maintain information density)

### 5. Color & Depth

Color should be functional, not just decorative.

- **Semantic Colors:** Use colors with established meanings: Red (Danger), Yellow (Warning), Green (Success), Blue (Trust/Action).
- **Dark Mode (future):**
  - Avoid high-contrast pure white borders.
  - Create depth by making "elevated" cards lighter than the background (since shadows don't work in the dark).
- **Shadows:** Shadows should be subtle. Use lower opacity and higher blur. Stronger shadows should only be used for elements that "sit" high above the UI, like popovers.

### 6. Elements & Interactions

- **Icons:** Size icons to match the line height of your text (e.g., 24px icon for 24px line height).
- **Buttons:** A good padding rule for buttons is to make the width double the height.
- **Micro-interactions:** Use small animations (like a "Copied!" chip sliding up) to confirm actions.
- **Overlays:** When placing text over images, use a linear gradient (fading to black/dark) or a progressive blur to ensure text readability without obscuring the photo.

---

## Auth Pattern: getUser() not getClaims()

All dashboard pages and server-side auth checks should use `supabase.auth.getUser()` (verified API call), not `getClaims()` (unverified cookie read). `getClaims()` fails on server-action POST re-renders in Next.js 16. The dashboard layout already uses `getUser()` — all child pages must follow the same pattern.

**Affected:** Every `page.tsx` under `src/app/(dashboard)/dashboard/`.

---

## Server Action Auth Limitation

Server actions under the dashboard layout can fail auth on Next.js 16 POST re-renders because cookies are not forwarded correctly. Known workaround: convert to API route handler pattern (POST endpoint + client-side fetch). `connectStripe` was already converted. Other server actions (`bookings.ts`, `availability.ts`, `profile.ts`) still use `getClaims()` — they work when called from pages but can fail on layout re-renders.
