# S02: Booking Calendar Restructure & Polish — Research

**Gathered:** 2026-04-03
**Calibration:** Targeted research — technology well-understood, codebase moderately complex. The booking flow is intricate (3 paths, 7 step states) but all the code is readable and the decomposition seams are obvious.

---

## Summary

BookingCalendar.tsx is 933 lines of working, tested code handling 3 booking paths (deferred, direct, recurring) across 7 UI step states. The file is a monolith not because of circular coupling but because everything was added incrementally without extraction. The logic is actually well-organized internally — step state machine at the top, handlers in the middle, JSX at the bottom — which makes decomposition tractable. The visual baseline from S01 is the design reference: rounded-xl cards, accent chips via color-mix() inline styles, elevated shadows, icon-paired meta items.

**The core challenge:** decompose without breaking the 3 booking paths or the `booking-child-selector.test.ts` and `rebook.test.ts` tests, which import `BookingCalendar` directly and assert on its render and state behavior.

---

## Requirements This Slice Owns

- **UI-02** — Booking calendar step flow restructure + visual polish. Primary owner.
- **UI-08** — Never looks like a template. Applies to the session type selector cards, time slot buttons, booking form, and all step panels.
- **UI-09** — Never feels clunky. The multi-step flow is a clear usability target — step transitions, form clarity, payment step confidence all matter.

---

## Existing File Map

### `src/components/profile/BookingCalendar.tsx` — 933 lines, the decomposition target

**Structure:**
- Lines 1–55: Imports + `BookingCalendarProps` interface + `SessionType` type alias
- Lines 56–102: State declarations (14 useState + 1 useEffect for children loading)
- Lines 103–165: Memos (`visitorTimezone`, `availableDays`, `overrideDatesSet`, `calendarDays`, `timeSlotsForDay`)
- Lines 166–200: Event handlers (`isAvailable`, `handleDateClick`, `handleSlotClick`, `handleBack`, `handleBookAnother`)
- Lines 201–270: `createPaymentIntent()` async — calls `/api/direct-booking/create-intent`, sets `clientSecret`, transitions to `payment` step
- Lines 271–340: `createRecurringIntent()` async — calls `/api/direct-booking/create-recurring`, sets `clientSecret`, transitions to `payment` step
- Lines 341–380: `handleRecurringConfirm()` — entry point from RecurringOptions; branches on frequency (one-time vs recurring), checks auth, dispatches to correct intent creator
- Lines 381–430: `handleAuthSuccess()` — post-auth continuation for direct booking
- Lines 431–480: `handleSubmit()` — form submit: deferred path (no Stripe) vs direct (go to `recurring` step)
- Lines 481–500: `firstName`, `timezoneLabel` derived values + early return for empty-slots state
- Lines 501–934: JSX — giant switch-on-step. 7 step branches, ~430 lines of JSX

**7 step states (step machine):**
1. `calendar` — session type selector sub-step (if `hasSessionTypes && !selectedSessionType`) OR calendar grid + time slots panel
2. `form` — booking form (student name, subject, email, notes, phone/SMS)
3. `recurring` — RecurringOptions component (only for direct booking path)
4. `auth` — InlineAuthForm (only for direct booking path)
5. `payment` — PaymentStep with Stripe Elements
6. `success` — confirmation (different copy for deferred vs direct vs recurring)
7. `error` — error state with back button

**3 booking paths:**
- **Deferred** (`stripeConnected = false`): calendar → form → success (no auth, no payment)
- **Direct** (`stripeConnected = true`, one-time): calendar → form → recurring (one-time chosen) → auth → payment → success
- **Direct recurring** (`stripeConnected = true`, weekly/biweekly): calendar → form → recurring → auth → payment → success

**Already-extracted sub-components:**
- `RecurringOptions.tsx` — 250 lines, fully independent, clean interface
- `PaymentStep.tsx` — 80 lines, Stripe Elements wrapper, clean interface
- `src/components/auth/InlineAuthForm.tsx` — auth step, already its own file

**Internal sub-component (end of file):**
- `TimeSlotButton` — 20 lines, manages its own hover state, could stay inline or extract

### `src/components/profile/PaymentStep.tsx` — 80 lines
Already extracted. Uses Stripe Elements. Has modest styling (p-6 space-y-4). Could get visual polish: better heading, better button, maybe a security/lock cue.

### `src/components/profile/RecurringOptions.tsx` — 250 lines
Already extracted. Has a clean header + frequency toggle + session count slider + projected dates list. Visually functional. Needs:
- Elevated card treatment consistent with S01 visual language
- Better typography on section headers
- The projected dates list could get a bit more polish (currently plain `divide-y border rounded-lg`)

### `src/components/profile/AtCapacitySection.tsx` — ~50 lines
Good visual treatment already (accent circle with Clock icon, rounded-xl border bg-muted/30). No changes needed for S02.

### `src/app/[slug]/page.tsx`
BookingCalendar is passed all 9 props (slots, overrides, teacherTimezone, teacherName, accentColor, subjects, teacherId, submitAction, stripeConnected, teacherStripeAccountId, sessionTypes). Any decomposition must preserve the same external interface — the page.tsx call site must not need to change (or changes must be trivial).

---

## What the Decomposition Looks Like

The natural seams for extraction from BookingCalendar.tsx:

### 1. `BookingStepHeader` (small, reusable within the file)
The "date · time · session type" header with optional back chevron appears in 4 step panels (form, recurring, auth, payment) with nearly identical markup. Extract as a tiny internal component to eliminate ~20 lines of duplicated JSX.

### 2. `SessionTypeSelector` (new sub-component file)
Lines ~560–600 in the current JSX: the "Choose a session type" grid. It's stateless (calls `setSelectedSessionType` via callback). Props: `sessionTypes`, `accentColor`, `onSelect`. Clean extraction, no state ownership.

**Visual upgrade needed:** The current session type cards (`border rounded-lg px-5 py-4`) should match S01's elevated card style: `rounded-xl border shadow-sm hover:shadow-md transition-shadow`. The price display could use the accent color more intentionally.

### 3. `CalendarGrid` (new sub-component file or inline)
Lines ~600–680: month navigation + day-of-week headers + date grid. Pure display component — takes `calendarDays`, `currentMonth`, `selectedDate`, `today`, `accentColor` + callbacks. Could extract or keep inline. Extraction is cleaner.

**Visual state:** The date grid is already well-designed (rounded-full date buttons, accent selected state). Minor polish: today indicator (ring-1 ring-inset ring-current) is subtle — consider `ring-accent` instead. No major rework needed.

### 4. `TimeSlotsPanel` (new sub-component file or inline)
Lines ~681–710: the right panel showing time slots for selected date. Props: `selectedDate`, `timeSlotsForDay`, `accentColor`, `onSlotClick`. Contains `TimeSlotButton` usage.

**Visual upgrade needed:** The panel has `bg-muted/20` background. Could elevate with a subtle separator/heading treatment. Currently says just "EEEE, MMMM d" — could be improved.

### 5. `BookingForm` (new sub-component file)
Lines ~715–920: the full booking form — child selector, subject dropdown, email, notes, phone, SMS opt-in, submit button. This is the largest self-contained block. 

**Extraction concern:** `BookingForm` needs to read/write `form` state, `submitting`, `creatingIntent`, `children`, `childrenLoaded`. Two options:
- Pass `form`, `setForm`, `submitting`, `creatingIntent` as props (prop-drilling but clean)
- Keep form state in BookingCalendar (preferred — avoids lifting/lifting-back)

Recommended: extract `BookingForm` as a component that receives `form`, `setForm`, `submitting`, `creatingIntent`, `firstName`, `subjects`, `hasSessionTypes`, `children`, `childrenLoaded`, `selectedDate`, `selectedSlot`, `selectedSessionType`, `stripeConnected`, `accentColor` and calls `onSubmit`. This is a lot of props but it's just prop-drilling of existing state — no logic changes.

**Visual upgrades needed for BookingForm:**
- Form fields: use S01's elevated card outer wrapper — the form currently has no outer card, it's just `p-6 space-y-5`. Wrapping in a card with subtle shadow would elevate it.
- Step header: already has the date/time/session breadcrumb — could add a subtle progress indicator
- Submit button: already uses accentColor — fine

### 6. `SuccessState` and `ErrorState` (tiny extractions)
The success and error panels are 30–60 lines each, pure presentation. Not strictly necessary to extract but cleaner.

---

## Visual Polish Inventory

Going through every visual surface in the booking flow:

| Surface | Current State | Needed |
|---|---|---|
| Outer wrapper | `border rounded-xl overflow-hidden shadow-sm` | Good — matches S01 card elevation |
| Session type cards | `border rounded-lg px-5 py-4 hover:bg-muted/50` | Upgrade to `rounded-xl shadow-sm hover:shadow-md` |
| Date grid cells | `h-9 w-9 rounded-full` | Good — selected uses accentColor |
| Today indicator | `ring-1 ring-inset ring-current` | Minor: could be ring-accent but current is fine |
| Time slot panel | `bg-muted/20` right panel | Add subtle section heading treatment |
| TimeSlotButton | accent border + fill on hover | Good pattern — matches S01 style |
| Step header (breadcrumb) | `flex items-center gap-3 border-b px-6 py-4` | Fine but could add session type chip (accent treatment) |
| Booking form | `p-6 space-y-5 max-w-md` | Consider outer card or subtle bg for the form area |
| Form labels | shadcn Label default | Fine |
| Form inputs | shadcn Input default | Fine |
| Submit button | `w-full font-semibold` accentColor | Fine |
| Payment step | `p-6 space-y-4 max-w-md mx-auto` | Add a "Secure payment" label, better heading |
| Recurring options frequency toggle | 3-button grid, accent bg when active | Good — already has accent treatment |
| Recurring projected dates | `divide-y border rounded-lg` | Could elevate with `rounded-xl` |
| Success state | `CheckCircle2` + centered text | Good — already uses accentColor |
| Error state | destructive text + back button | Fine |
| "Book a session" heading | `text-2xl font-semibold` | Fine — consistent with profile headings |
| Timezone indicator | Globe icon + muted text | Fine |

**Primary visual gaps:**
1. Session type selector cards: need rounded-xl + shadow-sm elevation (2 lines of change)
2. Form area: subtle background differentiation between step header and form body
3. Payment step: could use a "lock" icon and "Secure payment" label for trust signal
4. RecurringOptions projected dates list: rounded-xl upgrade
5. Step header: session type chip display could use accent treatment (consistent with CredentialsBar chips)

---

## Test Invariants to Preserve

Two test files import BookingCalendar directly:

**`booking-child-selector.test.ts`** — Tests:
- Component renders without error (`screen.getByText('Book a Session')`)
- Children loading from `/api/parent/children`
- `form.childId` state transitions
- Submission payload shape (deferred, direct, recurring all include `child_id`)

**`rebook.test.ts`** — Tests `getInitialSubject()` logic (pure function, not a component test)

**Key constraint:** If `BookingForm` is extracted, the child selector state logic moves with it. The `booking-child-selector.test.ts` tests cover the component-level behavior (render assertions) via the parent `BookingCalendar`, so as long as BookingCalendar still renders the form correctly and the exports haven't changed, they'll pass.

The `rebook.test.ts` tests are pure function tests that don't import `BookingCalendar` at all — they're safe.

**`booking-routing.test.ts`** — Tests the API route (`/api/direct-booking/create-intent/route`), not the component. Safe.

---

## Decomposition Strategy

The monolith can be decomposed into these files:

```
src/components/profile/
  BookingCalendar.tsx          ← orchestrator (~250 lines after extraction)
  BookingCalendarTypes.ts      ← shared types (optional, if cleaner)
  SessionTypeSelector.tsx      ← new, ~60 lines
  CalendarGrid.tsx             ← new, ~100 lines  
  TimeSlotsPanel.tsx           ← new, ~50 lines (includes TimeSlotButton)
  BookingForm.tsx              ← new, ~200 lines
  BookingSuccessState.tsx      ← new, ~60 lines (optional)
  RecurringOptions.tsx         ← already extracted, needs visual polish
  PaymentStep.tsx              ← already extracted, minor polish
```

`BookingCalendar.tsx` becomes a ~250-line orchestrator: state declarations + handlers + step-router JSX that renders sub-components.

**Extraction order (risk-ordered):**
1. `BookingForm` — largest, most prop-heavy extraction; test riskiest; do first to catch issues early
2. `SessionTypeSelector` — stateless, safe; also visual upgrade
3. `CalendarGrid` — stateless, safe
4. `TimeSlotsPanel` — stateless, safe
5. Polish pass — RecurringOptions, PaymentStep, BookingSuccessState visual upgrades
6. Final: verify all 3 booking paths still work visually/logically, run tests

---

## Decomposition Risk Notes

- **`children` state and `useEffect`**: Lives in BookingCalendar today. If `BookingForm` is extracted, the children loading logic stays in `BookingCalendar` (the `useEffect` runs on mount and is owned by the orchestrator). `BookingForm` receives `children`, `childrenLoaded` as props.
- **`form` state**: Owned by `BookingCalendar`. `BookingForm` receives `form`, `setForm` as props. This is the standard prop-drilling pattern.
- **`handleSubmit`**: The submit handler is deeply coupled to `selectedDate`, `selectedSlot`, `stripeConnected`, `recurringData`, `form`, and all the intent-creation functions. Safest to keep it in `BookingCalendar` and pass `onSubmit` to `BookingForm`.
- **Test mock**: `booking-child-selector.test.ts` mocks `PaymentStep`, `RecurringOptions`, and `InlineAuthForm`. It does NOT mock any proposed new components (`BookingForm`, `SessionTypeSelector`, etc.) — so new extractions are automatically exercised in tests without needing mock updates.

---

## Patterns to Follow from S01

From S01 Summary forward-intelligence:

1. **Accent chip pattern**: `color-mix(in srgb, var(--accent) 15%, transparent)` for backgrounds, `var(--accent)` for text — applies to session type chips in `SessionTypeSelector`
2. **Card elevation**: `rounded-xl shadow-sm hover:shadow-md transition-shadow` — apply to session type cards and booking form wrapper
3. **Icon-paired meta items**: The step header breadcrumb (`date · time · price · label`) could get icon treatment — `CalendarDays` for date, `Clock` for time — though this is already compact
4. **textWrap balance/pretty**: Applied to any multi-line display text via `style={{ textWrap: 'pretty' } as React.CSSProperties}`

---

## Task Breakdown for Planner

### Task 1: Extract `BookingForm` sub-component + visual polish
- Extract the form JSX (student name/child selector, subject dropdown, email, notes, phone/SMS, submit button) into `src/components/profile/BookingForm.tsx`
- Props: `form`, `setForm`, `onSubmit`, `submitting`, `creatingIntent`, `firstName`, `subjects`, `hasSessionTypes`, `children`, `childrenLoaded`, `selectedDate`, `selectedSlot`, `selectedSessionType`, `stripeConnected`, `accentColor`
- The step header (back button + date/time/session breadcrumb) stays in `BookingCalendar.tsx` wrapping `<BookingForm>`, OR is included in BookingForm's own header
- Visual: give the form a subtle background/card treatment; session type is shown as an accent-colored chip in the header
- Verify: `npx vitest run --reporter=dot` → 474 pass; `npx tsc --noEmit` clean

### Task 2: Extract `SessionTypeSelector`, `CalendarGrid`, `TimeSlotsPanel` + visual polish
- Extract `SessionTypeSelector` → `src/components/profile/SessionTypeSelector.tsx` with visual upgrade (rounded-xl + shadow-sm cards, accent price color, hover:shadow-md)
- Extract `CalendarGrid` → `src/components/profile/CalendarGrid.tsx` (month nav + day headers + date grid)
- Extract `TimeSlotsPanel` → `src/components/profile/TimeSlotsPanel.tsx` (includes `TimeSlotButton`)
- `BookingCalendar.tsx` becomes an orchestrator ~250 lines
- Verify: `npx vitest run --reporter=dot` → 474 pass; `npx tsc --noEmit` clean

### Task 3: Visual polish pass — RecurringOptions, PaymentStep, step transitions
- `RecurringOptions.tsx`: upgrade projected dates list to `rounded-xl`, add `Repeat` icon to section header, refine frequency toggle spacing
- `PaymentStep.tsx`: add a "lock" shield icon + "Secure payment" label above Stripe Elements for trust signal
- `BookingCalendar.tsx` step header: use accent chip treatment for session type display (matching CredentialsBar chip pattern)
- Consider adding `AnimatePresence` + `motion.div` for step-to-step transitions (fade+slide, consistent with `slideStep` from animation.ts) — only if clean to add without breaking tests
- Verify: `npx vitest run --reporter=dot` → 474 pass; `npx tsc --noEmit` clean; `npx next build` success

---

## Skills Discovered

No new skills needed. This slice uses:
- React component decomposition (standard pattern)
- Tailwind CSS + inline styles (established S01 pattern)
- Framer Motion / motion/react (already used in AnimatedProfile, animation.ts)
- Stripe Elements (already used in PaymentStep — not changing)
- No unfamiliar APIs or new libraries required

---

## Verification Commands

```bash
npx vitest run --reporter=dot          # 474 tests must pass
npx tsc --noEmit                       # must exit 0
npx next build                         # must exit 0 (run after final task)
```

The booking-child-selector and booking-routing tests are the highest-signal regression tests for this slice. A clean run on those 2 test files confirms the extraction didn't break any component behavior or API contracts.
