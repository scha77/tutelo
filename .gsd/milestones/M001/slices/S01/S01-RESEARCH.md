# Phase 1: Foundation - Research

**Researched:** 2026-03-03
**Domain:** Next.js 16 App Router + Supabase Auth/DB + Tailwind v4 + shadcn/ui — greenfield SaaS project scaffolding, authentication, database schema, onboarding wizard, and public profile page
**Confidence:** HIGH (core stack verified from official docs; two key breaking changes identified and confirmed)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Onboarding wizard flow**
- 3 steps: Step 1 = Identity (name, school, city/state, photo, years experience); Step 2 = Teaching (subjects, grade range, hourly rate with local benchmarks); Step 3 = Availability + publish
- Slug auto-generated from teacher name (e.g. "Sarah Johnson" → `sarah-johnson`), shown on Step 3, teacher can edit before publishing; collisions resolved with suffix (-2, -3)
- Preview link on Step 3: opens `/[slug]?preview=true` in a new tab before committing to publish
- Wizard progress saved to DB as teacher advances; if they abandon and return, they resume at the step they left off

**Public profile page layout**
- Section order (top to bottom): Hero → Credentials bar → About → Availability → Reviews → Book Now footer
- Hero above the fold on mobile: banner image (or accent color if none) + circular avatar overlapping + name + tagline + sticky Book Now at bottom of screen
- Reviews section hidden entirely in Phase 1 (no empty state, no placeholder) — section renders only once the first review exists (Phase 5)
- Availability displayed as a weekly grid: days as columns, time blocks as rows; stacks to day-by-day list on mobile
- All availability times displayed in the visitor's browser timezone (converted from teacher's stored IANA timezone)

**Book Now CTA**
- Phase 1 behavior: clicking "Book Now" scrolls to the availability section (anchor link) — no modal, no "coming soon"
- Label: plain "Book Now" — no rate shown on button, no secondary text
- Visibility: sticky bottom bar on mobile; fixed sidebar panel on desktop (scrolls with page or fixed position)
- Phase 2 wires the same CTA to the booking form — no label or layout change needed between phases

**Dashboard structure**
- Layout: left sidebar nav + main content area (standard SaaS pattern — extensible as Phase 2–5 add sections)
- Phase 1 sidebar sections: Page | Availability | Settings
  - Page: Active/Draft toggle at the top + all CUSTOM-* fields (accent color, headline, banner image, social links)
  - Availability: weekly schedule editor (AVAIL-01)
  - Settings: account/profile editing
- Active/Draft toggle lives at the top of the Page section — prominent but not globally persistent
- Post-publish flow: wizard redirects to `/dashboard` automatically; shareable URL shown as a banner/toast on first dashboard visit

### Claude's Discretion
- Exact accent color palette (5–6 colors from CUSTOM-01 — specific colors not specified)
- Avatar fallback when no photo uploaded (initials-based, color derived from accent or name hash)
- Slug generation algorithm details (capitalize-friendly names, special character handling)
- Loading/skeleton states throughout
- Toast/notification styling
- Mobile availability grid interaction details (scroll behavior, slot highlight)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Teacher or parent can sign up with email + password or Google SSO | Supabase Auth + `@supabase/ssr`; Google OAuth provider config; proxy.ts session refresh pattern |
| AUTH-02 | User session persists across browser refresh | Supabase JWT cookie refresh in proxy.ts; `getClaims()` for fast server-side validation |
| ONBOARD-01 | Teacher completes setup wizard (name, school, city/state, years experience, optional profile photo) with no payment required to publish | React Hook Form + Zod multi-step wizard; per-step schema validation; Supabase Storage for photo upload |
| ONBOARD-02 | Teacher selects tutoring subjects (multi-select) | shadcn/ui multi-select or Combobox component; Zod array validation |
| ONBOARD-03 | Teacher selects grade range(s) (multi-select) | Same pattern as ONBOARD-02 |
| ONBOARD-04 | Teacher sets their IANA timezone (required) | shadcn/ui Select populated from Intl.supportedValuesOf('timeZone'); stored as TEXT NOT NULL on teachers table |
| ONBOARD-05 | Teacher sets weekly availability via visual calendar | Custom weekly grid component; `availability` table; defaults to weekday evenings + weekends |
| ONBOARD-06 | Teacher sets hourly rate with local benchmark range shown | Static benchmark data per city/subject; React Hook Form number input; Zod min/max validation |
| ONBOARD-07 | Teacher receives shareable public URL immediately on publish — no Stripe required | slug generation (slugify library); unique constraint on teachers.slug; wizard step 3 publish action |
| PAGE-01 | Auto-generated public page at teacher's slug URL | `/[slug]` RSC; Supabase query by slug; Next.js 16 async params pattern |
| PAGE-02 | Page displays: name, profile photo (or initials avatar), school name, city/state | Supabase Storage signed/public URL; shadcn/ui Avatar fallback |
| PAGE-03 | Page displays: credential bar (verified teacher badge, years experience, subjects, grade levels) | Static rendering from teachers row; shadcn/ui Badge |
| PAGE-04 | Page displays: auto-generated bio if teacher skips writing one | Template string generation from teacher fields at save time OR render time |
| PAGE-05 | Page displays: subjects + hourly rate, interactive availability calendar, reviews section (hidden Phase 1) | Client Component for timezone-converted availability grid |
| PAGE-06 | Sticky "Book Now" CTA visible at all times on mobile | Tailwind v4 fixed/sticky positioning; scrolls to `#availability` anchor |
| PAGE-07 | Page applies teacher's chosen accent color / theme throughout | CSS custom property (`--accent`) set inline from teacher record; Tailwind v4 `@theme` |
| PAGE-08 | Page displays teacher's custom headline / tagline below their name | Optional field on teachers table; conditional render |
| PAGE-09 | Page displays teacher's banner image at the top | Supabase Storage; Next.js `<Image>` component with fallback to accent color |
| PAGE-10 | Page displays teacher's social / contact links | JSON column or discrete TEXT columns on teachers table |
| CUSTOM-01 | Teacher can select accent color from preset palette (5–6 colors) | Color picker in dashboard; string stored on teachers table; applied as CSS var on public page |
| CUSTOM-02 | Teacher can add custom headline / tagline | Text input in dashboard; max length validation |
| CUSTOM-03 | Teacher can add social / contact links | Form fields per link type; optional URL validation |
| CUSTOM-04 | Teacher can upload banner image | Supabase Storage upload; Next.js `<Image>` |
| AVAIL-01 | Teacher can view and edit weekly availability from dashboard | Custom weekly grid editor; availability CRUD Server Actions; `availability` table |
| AVAIL-02 | Available time slots displayed on public landing page | RSC fetches availability rows; Client Component renders grid |
| AVAIL-03 | Public page auto-detects viewer's browser timezone and converts times | `Intl.DateTimeFormat().resolvedOptions().timeZone` in Client Component; `date-fns-tz` conversion |
| VIS-01 | Teacher can toggle page between Active and Draft | `is_published` boolean on teachers table; toggle in dashboard Page section |
| VIS-02 | Visiting hidden page shows graceful "not available" state (not 404) | RSC checks `is_published`; returns custom component instead of redirect/notFound() |
| DASH-06 | Teacher can toggle page Active / Draft from dashboard | Same as VIS-01; toggle UI in dashboard sidebar |
</phase_requirements>

---

## Summary

Phase 1 is a greenfield Next.js 16 App Router project starting from zero. The stack is fully locked. Two critical breaking changes from prior Next.js versions must be set correctly from day one: `proxy.ts` (not `middleware.ts`) for session handling, and `await params` / `await cookies()` everywhere dynamic APIs are used. Getting these wrong means following any pre-2025 tutorial will produce broken code.

Two additional breaking changes in Supabase (post-November 2025) must be accounted for. New Supabase projects no longer use `NEXT_PUBLIC_SUPABASE_ANON_KEY` — they use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (format: `sb_publishable_...`). Similarly, the recommended server-side auth method has shifted from `getUser()` to `getClaims()` for JWT validation. Both are drop-in replacements for their predecessors in terms of permissions, but the env var name and method name differ from older documentation. This is a HIGH confidence finding confirmed via official Supabase docs and community discussion.

The public profile page at `/[slug]` is the core value proposition and the most complex component in this phase. It combines RSC data fetching, a Client Component for timezone-aware availability display, dynamic CSS custom properties for accent color theming, and the Book Now sticky CTA. The onboarding wizard uses React Hook Form with per-step Zod schemas, wizard progress persisted to DB as the teacher advances, and a slug-generation + uniqueness-check flow on Step 3. Supabase Storage handles photo and banner uploads. All of this is buildable within the 80–120 hour total project budget because the stack is standard and well-integrated.

**Primary recommendation:** Scaffold with `create-next-app@latest`, configure Supabase with the new publishable key, build auth + proxy.ts first (validates the session pattern), then schema + RLS, then onboarding wizard, then public page. Never store timestamps without `timestamptz`. Enable RLS on every table the moment it is created and test via the frontend, not Studio.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | Framework (App Router, RSC, Route Handlers) | Locked project decision; latest stable as of Feb 2026 |
| Tailwind CSS | v4.x | Styling (CSS-first via `@theme`) | Locked; v4 released Jan 2025, CSS-first config |
| shadcn/ui | latest (`npx shadcn@latest`) | UI component library | Locked; full Tailwind v4 + React 19 support confirmed |
| Supabase (`@supabase/supabase-js`) | latest | Database client | Locked; PostgreSQL + Auth + Storage |
| `@supabase/ssr` | latest | SSR adapter for Next.js | Locked; replaces deprecated `@supabase/auth-helpers-nextjs` |
| React Hook Form | v7.x | Multi-step form state | Locked; instant field-level validation, wizard state |
| `@hookform/resolvers` | latest | Zod integration for RHF | Required companion package |
| Zod | v3.x (v4 may be available — verify) | Schema validation + TypeScript types | Locked; official Next.js auth guide recommendation |
| date-fns | v4.x | Date manipulation | Locked; tree-shakeable, TypeScript-first |
| date-fns-tz | latest | IANA timezone conversion | Locked; required for AVAIL-03 browser timezone display |
| slugify | latest | Teacher URL slug generation | Standard library for ONBOARD-07 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zustand | latest | Multi-step wizard state | Only if wizard state needs to persist across page navigations; React state may suffice |
| TypeScript | 5.1+ | Type safety | Required by Next.js 16 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@supabase/ssr` | Old `@supabase/auth-helpers-nextjs` | auth-helpers is deprecated — do not use |
| slugify | Custom regex slugger | slugify handles unicode, accents, special chars correctly |
| date-fns-tz | `@date-fns/tz` (new package in date-fns v4) | Either works; date-fns-tz is the proven choice for this stack |
| Custom availability grid | react-big-calendar, FullCalendar | Full calendar libraries are for event management, not weekly availability marking; overkill |

**Installation:**

```bash
# Bootstrap
npx create-next-app@latest tutelo --yes
# Generates: Next.js 16, TypeScript, Tailwind v4, ESLint, App Router, Turbopack

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Forms + Validation
npm install react-hook-form @hookform/resolvers zod

# Dates
npm install date-fns date-fns-tz

# Slugs
npm install slugify

# State (add only if wizard needs it)
npm install zustand

# UI components (interactive — not npm install)
npx shadcn@latest init
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Email/password + Google SSO
│   │   └── callback/route.ts       # Supabase OAuth callback handler
│   ├── (dashboard)/
│   │   └── dashboard/
│   │       ├── layout.tsx          # Sidebar layout (protected)
│   │       ├── page.tsx            # Redirect to /dashboard/page
│   │       ├── page/page.tsx       # Active/Draft toggle + CUSTOM-* fields
│   │       ├── availability/page.tsx  # AVAIL-01 weekly schedule editor
│   │       └── settings/page.tsx   # Account/profile editing
│   ├── onboarding/
│   │   └── page.tsx               # Multi-step wizard (Client Component)
│   ├── [slug]/
│   │   └── page.tsx               # Public profile RSC
│   └── api/
│       └── auth/
│           └── callback/route.ts  # OAuth exchange (if not using app/(auth)/callback)
├── components/
│   ├── ui/                        # shadcn/ui components (auto-generated)
│   ├── onboarding/
│   │   ├── WizardStep1.tsx        # Identity fields
│   │   ├── WizardStep2.tsx        # Teaching fields
│   │   └── WizardStep3.tsx        # Availability + publish
│   ├── profile/
│   │   ├── HeroSection.tsx        # Banner + avatar + name + tagline
│   │   ├── CredentialsBar.tsx     # Badge + subjects + grade levels
│   │   ├── AvailabilityGrid.tsx   # 'use client' — timezone-aware grid
│   │   └── BookNowCTA.tsx         # Sticky mobile / fixed desktop
│   └── dashboard/
│       ├── Sidebar.tsx
│       ├── PageSettings.tsx       # CUSTOM-* fields + Active/Draft toggle
│       └── AvailabilityEditor.tsx # Weekly grid editor
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # createBrowserClient (Client Components)
│   │   ├── server.ts             # createServerClient (RSC + Server Actions)
│   │   └── service.ts            # Admin client — API routes only
│   ├── schemas/
│   │   ├── onboarding.ts         # Zod schemas per wizard step
│   │   └── availability.ts       # Zod schema for availability slots
│   └── utils/
│       ├── slugify.ts            # Slug generation + collision check
│       └── timezone.ts           # date-fns-tz conversion helpers
├── actions/
│   ├── onboarding.ts             # Server Actions for wizard steps
│   ├── profile.ts                # Server Actions for dashboard updates
│   └── availability.ts           # CRUD Server Actions for availability
├── emails/                       # react-email templates (Phase 2+)
├── proxy.ts                      # Supabase session refresh (NOT middleware.ts)
└── supabase/
    └── migrations/               # SQL migration files
        └── 0001_initial_schema.sql
```

### Pattern 1: proxy.ts Session Refresh (Next.js 16)

**What:** Intercepts every request, refreshes the Supabase JWT cookie, and gates protected routes.
**When to use:** Required — without this, sessions expire silently.

```typescript
// proxy.ts (project root — NOT middleware.ts)
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
//         https://supabase.com/docs/guides/auth/server-side/nextjs

import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,  // NEW key name (not ANON_KEY)
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  // Refresh session — REQUIRED. Use getClaims() (faster, JWT-local verification)
  // Fall back to getUser() if you need real-time revocation detection.
  const { data: { claims } } = await supabase.auth.getClaims()

  // Route protection
  const isProtected =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/onboarding')

  if (isProtected && !claims) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 2: Supabase Client Setup (Three Clients)

```typescript
// lib/supabase/client.ts — Client Components
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!  // NEW: was ANON_KEY
  )
}

// lib/supabase/server.ts — RSC + Server Actions
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()  // REQUIRED: await in Next.js 16
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {
            // Server Component — cookies are read-only here
          }
        },
      },
    }
  )
}

// lib/supabase/service.ts — API Routes ONLY (bypasses RLS)
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_SECRET_KEY!  // NEW: was SERVICE_ROLE_KEY
)
```

### Pattern 3: Next.js 16 Async Params in Route Handlers and Pages

**What:** All dynamic APIs (params, searchParams, cookies, headers) are now Promises.
**When to use:** Every page with `[slug]`, every route handler with dynamic segments.

```typescript
// app/[slug]/page.tsx — Public profile RSC
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/proxy (version history)

export default async function TeacherProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { slug } = await params           // REQUIRED: await params
  const { preview } = await searchParams  // REQUIRED: await searchParams

  const supabase = await createClient()
  const { data: teacher } = await supabase
    .from('teachers')
    .select('*, availability(*)')
    .eq('slug', slug)
    .single()

  if (!teacher) return notFound()

  const isPreview = preview === 'true'
  if (!teacher.is_published && !isPreview) {
    return <DraftPage />  // VIS-02: graceful "not available" state
  }

  return <TeacherProfile teacher={teacher} />
}
```

### Pattern 4: Multi-Step Wizard with React Hook Form + Per-Step Zod Schemas

**What:** RHF instance spans all steps; each step validates its own fields before advancing.
**When to use:** Onboarding wizard (ONBOARD-01 through ONBOARD-07).

```typescript
// components/onboarding/OnboardingWizard.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { OnboardingStep1Schema, FullOnboardingSchema } from '@/lib/schemas/onboarding'
import type { FullOnboardingData } from '@/lib/schemas/onboarding'

export function OnboardingWizard({ initialStep, savedData }: {
  initialStep: number
  savedData: Partial<FullOnboardingData>
}) {
  const [currentStep, setCurrentStep] = useState(initialStep)

  const form = useForm<FullOnboardingData>({
    resolver: zodResolver(FullOnboardingSchema),
    defaultValues: savedData,
    mode: 'onBlur',
  })

  const advanceStep = async () => {
    // Validate only the fields in the current step before advancing
    const stepFields = STEP_FIELDS[currentStep]
    const isValid = await form.trigger(stepFields)
    if (!isValid) return

    // Save progress to DB
    await saveWizardProgress(form.getValues(), currentStep)
    setCurrentStep(prev => prev + 1)
  }

  // Final submit only on last step
  const onSubmit = async (data: FullOnboardingData) => {
    await publishTeacherProfile(data)
    redirect('/dashboard?welcome=true')
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {currentStep === 1 && <WizardStep1 form={form} />}
      {currentStep === 2 && <WizardStep2 form={form} />}
      {currentStep === 3 && <WizardStep3 form={form} onPreview={openPreview} />}
      <WizardNav step={currentStep} onNext={advanceStep} />
    </form>
  )
}
```

### Pattern 5: Timezone Conversion for Availability Display

**What:** Stored availability uses teacher's IANA timezone; displayed in visitor's browser timezone.
**When to use:** AvailabilityGrid Client Component (AVAIL-03).

```typescript
// components/profile/AvailabilityGrid.tsx
'use client'

import { formatInTimeZone, toZonedTime } from 'date-fns-tz'

interface AvailabilitySlot {
  day_of_week: number   // 0=Sun, stored in teacher's timezone
  start_time: string    // e.g. "17:00"
  end_time: string      // e.g. "19:00"
}

export function AvailabilityGrid({
  slots,
  teacherTimezone,
}: {
  slots: AvailabilitySlot[]
  teacherTimezone: string  // e.g. "America/New_York"
}) {
  // Detect visitor's timezone in the browser
  const visitorTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const convertedSlots = slots.map(slot => {
    // Build a reference date in teacher's timezone
    const baseDate = new Date()
    // Convert to visitor's timezone for display
    const displayTime = formatInTimeZone(
      buildSlotDateTime(slot, teacherTimezone),
      visitorTimezone,
      'h:mm a zzz'
    )
    return { ...slot, displayTime }
  })

  // Render weekly grid
  return (
    <div id="availability" className="grid grid-cols-7 gap-1">
      {/* days as columns, slots as rows */}
    </div>
  )
}
```

### Pattern 6: Page Visibility — Draft vs Active (VIS-01, VIS-02)

**What:** Draft pages render a graceful "not available" UI, not a 404.
**When to use:** Public `/[slug]` page when `is_published = false`.

```typescript
// app/[slug]/page.tsx
const isPreview = (await searchParams).preview === 'true'

if (!teacher.is_published && !isPreview) {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Page not available</h1>
        <p className="text-muted-foreground mt-2">
          This teacher's page is not currently active.
        </p>
      </div>
    </main>
  )
}
```

### Anti-Patterns to Avoid

- **Using `middleware.ts` instead of `proxy.ts`:** Works but is deprecated in Next.js 16. Every tutorial written before mid-2025 uses middleware.ts. Start with proxy.ts.
- **Syncing params without `await`:** `const { slug } = params` throws in Next.js 16. Must be `const { slug } = await params`.
- **Calling `supabase.auth.getSession()` on the server:** Does not verify with the auth server; can be spoofed. Use `getClaims()` in proxy.ts and Server Actions.
- **Hardcoding `NEXT_PUBLIC_SUPABASE_ANON_KEY`:** New Supabase projects (post-Nov 2025) use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Verify key names in Supabase dashboard during setup.
- **Testing RLS from Supabase Studio:** Studio uses service role, bypassing RLS. Always test as an authenticated frontend user.
- **Storing availability times as bare `time` or `timestamp` (no tz):** Silent data corruption across timezone boundaries. Always `timestamptz`.
- **Calling `notFound()` for draft pages:** Returns a 404. VIS-02 requires a graceful "not available" state.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slug generation from teacher name | Custom regex function | `slugify` library | Handles unicode, accents, hyphens, special chars, multiple spaces |
| Slug uniqueness | Optimistic insert + catch | DB unique constraint + suffix loop in Server Action | Race condition safe; DB enforces uniqueness |
| Multi-step form state | useState for every field | React Hook Form with per-step validation | Built-in dirty tracking, field-level errors, trigger validation by field name |
| Timezone conversion | Manual UTC offset math | `date-fns-tz` formatInTimeZone | DST transitions, edge cases, and cross-browser compatibility |
| UI components (button, input, select, avatar, badge) | Raw HTML + custom CSS | shadcn/ui | Accessible Radix UI primitives; Tailwind v4 native |
| Image optimization | `<img>` tags | Next.js `<Image>` | Automatic WebP, lazy loading, LCP optimization |
| Session refresh logic | Manual cookie parsing | `@supabase/ssr` with proxy.ts | JWT rotation edge cases are handled correctly |
| RLS for public teacher profiles | None / application-level gate | Supabase RLS `USING (true)` policy | Anon key is public; without RLS, any row is readable |

**Key insight:** Every item in this list has non-obvious edge cases that will surface in production (unicode slugs, DST bugs, concurrent slug conflicts). The libraries and platform features handle them.

---

## Common Pitfalls

### Pitfall 1: Old Env Var Names (ANON_KEY / SERVICE_ROLE_KEY)
**What goes wrong:** Project scaffolded using old docs or tutorials sets `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. New Supabase projects created post-November 2025 do not have these keys — they only have `sb_publishable_...` and `sb_secret_...` format keys.
**Why it happens:** Most online tutorials predate the key migration. `create-next-app` Supabase templates may not yet be updated.
**How to avoid:** When creating the Supabase project, check the API settings page for the actual key names. If the keys start with `sb_publishable_` and `sb_secret_`, use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_SECRET_KEY`. If the project shows `anon` and `service_role` (legacy project), use the old names.
**Warning signs:** `Invalid API key` error on first Supabase query.
**Confidence:** HIGH — confirmed via official Supabase API keys docs and community issues.

### Pitfall 2: `middleware.ts` / `export function middleware()` Instead of `proxy.ts`
**What goes wrong:** Next.js 16 deprecated `middleware.ts`. If you start with `middleware.ts`, it still works but is on a deprecation path. More importantly, all `@supabase/ssr` docs and the Next.js SSR auth guide now reference `proxy.ts` and `export function proxy()`.
**Why it happens:** Every tutorial, Stack Overflow answer, and code snippet predating mid-2025 uses `middleware.ts`.
**How to avoid:** Create `proxy.ts` at project root from day one. Export function as `proxy`, not `middleware`. A codemod is available: `npx @next/codemod@canary middleware-to-proxy .`
**Warning signs:** Auth works but IDE or Next.js throws deprecation warnings.

### Pitfall 3: Synchronous Params / Cookies Causing Runtime Errors
**What goes wrong:** Code that follows Next.js 14/15 patterns does `const { slug } = params` or `const cookieStore = cookies()`. Next.js 16 requires `await` — both will throw at runtime.
**Why it happens:** Massive volume of tutorials using the old synchronous pattern. TypeScript types catch this at compile time but only if configured correctly.
**How to avoid:** Treat all dynamic APIs as async from day one. `await params`, `await searchParams`, `await cookies()`, `await headers()`. Set strict TypeScript mode.
**Warning signs:** `TypeError: Cannot destructure property 'slug' of 'params' as it is not an object` or similar.

### Pitfall 4: RLS Silent Failures Masking as UI Bugs
**What goes wrong:** An RLS policy with a logic error returns 0 rows silently (no error, empty result). Developer sees blank UI and starts debugging React state instead of the database policy.
**Why it happens:** Supabase Studio uses service role (bypasses RLS). Development testing via Studio always succeeds. The bug only appears in the browser as the authenticated user.
**How to avoid:** Test every RLS policy from the browser (as an authenticated user with the correct role). Write a one-time test page that reads from each table and logs results. Enable RLS on every table immediately when created.
**Warning signs:** Works in Studio, blank in the app; empty arrays where data should be.

### Pitfall 5: Timezone Bugs in Stored Availability
**What goes wrong:** Availability stored without timezone context ("3pm") displays as the wrong time for visitors in different timezones. A teacher in EST setting "3pm" availability and a parent in PST seeing "3pm" = different actual times.
**Why it happens:** PostgreSQL `time` columns have no timezone. Developers store `start_time: '15:00'` and assume it means the same thing everywhere.
**How to avoid:** IANA timezone column (`TEXT NOT NULL`) on teachers table is required. All availability display goes through `date-fns-tz`. Never display bare time strings without timezone conversion.
**Warning signs:** Teachers in different timezones getting correct bookings; teachers in same timezone getting 1-hour offset bookings after DST switch.

### Pitfall 6: Supabase Storage — Public vs. Private Buckets
**What goes wrong:** Profile photos and banner images stored in a private bucket require signed URLs that expire. If the signed URL generation is missed or cached improperly, images 404 after expiry.
**Why it happens:** Private bucket is the default. Public bucket URLs are simpler for user-generated profile media.
**How to avoid:** Create a `profile-images` public bucket for teacher photos and banners. RLS on storage uses the teacher's `user_id` for write access, but reads are public. This avoids signed URL management entirely.
**Warning signs:** Images show for 1 hour then 404.

### Pitfall 7: Slug Collision Race Condition
**What goes wrong:** Two teachers with the same name register simultaneously. Both get slug "sarah-johnson". The uniqueness check passes for both, then one INSERT fails with a constraint violation.
**Why it happens:** Check-then-insert is two separate database operations with no atomicity guarantee.
**How to avoid:** Use a DB-level unique constraint on `teachers.slug`. In the Server Action, attempt INSERT and catch a `23505 unique_violation` error — retry with `-2` suffix. This is simpler and safer than a pre-check.
**Warning signs:** `duplicate key value violates unique constraint "teachers_slug_key"` errors in logs.

---

## Code Examples

### Database Schema for Phase 1

```sql
-- Source: .planning/research/ARCHITECTURE.md + Phase 1 requirements

-- Teachers table (core of Phase 1)
CREATE TABLE teachers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  school          TEXT,
  city            TEXT,
  state           CHAR(2),
  years_experience SMALLINT,
  subjects        TEXT[] DEFAULT '{}',
  grade_levels    TEXT[] DEFAULT '{}',
  hourly_rate     NUMERIC(10,2),
  bio             TEXT,
  photo_url       TEXT,
  banner_url      TEXT,
  headline        TEXT,                          -- CUSTOM-02
  accent_color    TEXT DEFAULT '#3B82F6',        -- CUSTOM-01
  social_instagram TEXT,                         -- CUSTOM-03
  social_email    TEXT,
  social_website  TEXT,
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  timezone        TEXT NOT NULL DEFAULT 'America/New_York',  -- ONBOARD-04: IANA
  wizard_step     SMALLINT NOT NULL DEFAULT 1,   -- Resume abandoned wizard
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teachers_slug ON teachers(slug);
CREATE INDEX idx_teachers_user_id ON teachers(user_id);

-- Availability table (recurring weekly slots)
CREATE TABLE availability (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  start_time  TIME NOT NULL,   -- Stored in teacher's IANA timezone context
  end_time    TIME NOT NULL,
  UNIQUE(teacher_id, day_of_week, start_time)
);

CREATE INDEX idx_availability_teacher ON availability(teacher_id);

-- Bookings table (Phase 1: state machine stub + unique constraint)
CREATE TABLE bookings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id            UUID NOT NULL REFERENCES teachers(id),
  parent_id             UUID REFERENCES auth.users(id),
  parent_email          TEXT NOT NULL,
  student_name          TEXT NOT NULL,
  subject               TEXT NOT NULL,
  booking_date          DATE NOT NULL,
  start_time            TIME NOT NULL,
  end_time              TIME NOT NULL,
  status                TEXT NOT NULL DEFAULT 'requested'
                          CHECK (status IN ('requested','pending','confirmed','completed','cancelled')),
  stripe_payment_intent TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, booking_date, start_time)  -- BOOK-04: double-booking prevention
);

CREATE INDEX idx_bookings_teacher_date ON bookings(teacher_id, booking_date);

-- Reviews table (Phase 1: stub only — no UI until Phase 5)
CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL UNIQUE REFERENCES bookings(id),
  teacher_id  UUID NOT NULL REFERENCES teachers(id),
  parent_id   UUID REFERENCES auth.users(id),
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies for teachers Table

```sql
-- Source: .planning/research/ARCHITECTURE.md (verified pattern)

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Public can read ALL teacher profiles (needed for /[slug] page)
CREATE POLICY "teachers_public_read"
  ON teachers FOR SELECT USING (true);

-- Teachers can only insert their own record
CREATE POLICY "teachers_insert_own"
  ON teachers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Teachers can only update their own record
CREATE POLICY "teachers_update_own"
  ON teachers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No direct deletes
CREATE POLICY "teachers_no_delete"
  ON teachers FOR DELETE USING (false);

-- Availability: public read, teacher write
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_public_read"
  ON availability FOR SELECT USING (true);

CREATE POLICY "availability_teacher_write"
  ON availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = availability.teacher_id
        AND teachers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = availability.teacher_id
        AND teachers.user_id = auth.uid()
    )
  );
```

### Slug Generation with Collision Handling

```typescript
// lib/utils/slugify.ts
import slugifyLib from 'slugify'

export function generateSlug(fullName: string): string {
  return slugifyLib(fullName, {
    lower: true,
    strict: true,       // remove special chars
    trim: true,
  })
}

// actions/onboarding.ts (Server Action)
export async function checkSlugAvailability(slug: string): Promise<{
  available: boolean
  suggestion: string
}> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('teachers')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()

  if (!data) return { available: true, suggestion: slug }

  // Find next available suffix
  for (let i = 2; i <= 99; i++) {
    const candidate = `${slug}-${i}`
    const { data: conflict } = await supabase
      .from('teachers')
      .select('slug')
      .eq('slug', candidate)
      .maybeSingle()
    if (!conflict) return { available: false, suggestion: candidate }
  }

  // Fallback: timestamp suffix (extremely unlikely to need this)
  return { available: false, suggestion: `${slug}-${Date.now()}` }
}
```

### shadcn/ui Initialization for Tailwind v4

```bash
# Source: https://ui.shadcn.com/docs/tailwind-v4
npx shadcn@latest init
# CLI auto-detects Tailwind v4, generates globals.css with:
# :root { --background: hsl(0 0% 100%); ... }
# @theme inline { --color-background: var(--background); ... }
```

The `@theme inline` directive (not just `@theme`) is the Tailwind v4 pattern for shadcn/ui. This maps CSS custom properties to Tailwind color utilities.

### Auto-Generated Bio (PAGE-04)

```typescript
// lib/utils/bio.ts
export function generateBio(teacher: {
  full_name: string
  school?: string
  city?: string
  state?: string
  subjects?: string[]
  grade_levels?: string[]
  years_experience?: number
}): string {
  const subjectList = teacher.subjects?.join(', ') || 'multiple subjects'
  const gradeList = teacher.grade_levels?.join(', ') || 'K-12'
  const location = [teacher.city, teacher.state].filter(Boolean).join(', ')
  const experience = teacher.years_experience
    ? `${teacher.years_experience} years of classroom experience`
    : 'a classroom teacher'

  return `${teacher.full_name} is ${experience}${
    teacher.school ? ` at ${teacher.school}` : ''
  }${location ? ` in ${location}` : ''}, specializing in ${subjectList} for ${gradeList} students.`
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` + `export function middleware()` | `proxy.ts` + `export function proxy()` | Next.js v16.0.0 | Must use proxy.ts for new projects |
| Sync `params` / `cookies()` | `await params` / `await cookies()` | Next.js v15+ (required in v16) | Breaking change — old tutorials are wrong |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Nov 2025 | New projects only have publishable keys |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_SECRET_KEY` | Supabase Nov 2025 | New projects only have secret keys |
| `supabase.auth.getUser()` in proxy | `supabase.auth.getClaims()` in proxy | Supabase 2025 | getClaims() is faster (local JWT verification), preferred |
| `supabase.auth.getSession()` | Never use server-side | Ongoing | getSession() is insecure on server |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | Supabase 2024 | auth-helpers is deprecated |
| Tailwind v3 `tailwind.config.js` | Tailwind v4 `@theme` in CSS | Jan 2025 | No config file for new projects |
| `@tailwind base/components/utilities` | `@import "tailwindcss"` | Jan 2025 | Single import line |
| shadcn/ui `:root` vars in `@layer base` | `:root` vars outside `@layer` + `@theme inline` | 2025 | New shadcn/ui v4 CSS structure |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: deprecated, replaced by `@supabase/ssr`
- `middleware.ts`: deprecated in Next.js 16, replaced by `proxy.ts`
- JWT-based anon/service_role keys: legacy, new projects use publishable/secret keys
- `supabase.auth.getSession()` server-side: insecure, replaced by `getClaims()`

---

## Open Questions

1. **`getClaims()` vs `getUser()` in proxy.ts for session refresh**
   - What we know: `getClaims()` is now recommended by Supabase for proxy/middleware because it is faster (local JWT signature verification, no network call). `getUser()` still works and is more secure for session revocation detection.
   - What's unclear: The existing STACK.md research uses `getUser()`. Supabase docs now show `getClaims()`. For a small-scale MVP with no high-security revocation requirements, `getClaims()` is appropriate.
   - Recommendation: Use `getClaims()` in `proxy.ts` for performance. Use `getUser()` in Server Actions and server-side auth checks where you need to verify a live session (e.g., before updating teacher data). This is the pattern the Supabase docs indicate.

2. **Exact Supabase key env var names for new project**
   - What we know: Post-November 2025 projects use `sb_publishable_...` and `sb_secret_...` format keys. The env var names in documentation are `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_SECRET_KEY`.
   - What's unclear: Some Supabase Vercel integration templates may still use legacy names, or may use both.
   - Recommendation: When creating the Supabase project, check the API settings page in the Supabase dashboard and use whatever key names are shown there. Do not assume — verify before writing any `.env.local`.

3. **Supabase Storage bucket configuration for profile images**
   - What we know: Public buckets are simpler (no signed URL expiry) and appropriate for teacher profile photos and banners.
   - What's unclear: Storage RLS policies for public buckets still need to restrict write access to the owning teacher. The exact RLS syntax for Storage (which uses a different schema than the main DB) should be verified during implementation.
   - Recommendation: Create a `profile-images` public bucket during Plan 01-01. Bucket-level policy: anyone can read, only authenticated owner can upload/update.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (recommended — integrates with Next.js App Router and Tailwind v4) |
| Config file | `vitest.config.ts` — does not exist yet; Wave 0 task |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

Note: `nyquist_validation` key is absent from `.planning/config.json` — validation architecture included per spec.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Teacher can sign up with email+password and Google SSO | integration | `npx vitest run tests/auth/signup.test.ts` | ❌ Wave 0 |
| AUTH-02 | Session persists after browser refresh | integration | `npx vitest run tests/auth/session.test.ts` | ❌ Wave 0 |
| ONBOARD-01–07 | Wizard completes and publishes teacher profile | integration | `npx vitest run tests/onboarding/wizard.test.ts` | ❌ Wave 0 |
| PAGE-01 | `/[slug]` renders for published teacher | unit/integration | `npx vitest run tests/profile/slug-page.test.ts` | ❌ Wave 0 |
| VIS-02 | Draft page shows graceful message, not 404 | unit | `npx vitest run tests/profile/draft-visibility.test.ts` | ❌ Wave 0 |
| AVAIL-03 | Timezone conversion from teacher TZ to visitor TZ | unit | `npx vitest run tests/availability/timezone.test.ts` | ❌ Wave 0 |
| ONBOARD-07 | Slug generated from name, collisions resolved | unit | `npx vitest run tests/utils/slugify.test.ts` | ❌ Wave 0 |
| PAGE-04 | Auto-bio generated from teacher fields | unit | `npx vitest run tests/utils/bio.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/utils/` (unit tests only, fast)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — Vitest configuration for Next.js App Router
- [ ] `tests/utils/slugify.test.ts` — covers ONBOARD-07 slug generation + collision
- [ ] `tests/utils/bio.test.ts` — covers PAGE-04 auto-bio generation
- [ ] `tests/utils/timezone.test.ts` — covers AVAIL-03 timezone conversion
- [ ] `tests/profile/draft-visibility.test.ts` — covers VIS-02 graceful draft state
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react jsdom` — if none detected

---

## Sources

### Primary (HIGH confidence)
- Next.js 16 proxy.ts official docs: https://nextjs.org/docs/app/api-reference/file-conventions/proxy (fetched 2026-03-03, version 16.1.6)
- Supabase SSR + Next.js guide: https://supabase.com/docs/guides/auth/server-side/nextjs (fetched 2026-03-03)
- Supabase API keys guide: https://supabase.com/docs/guides/api/api-keys (fetched 2026-03-03)
- Supabase getClaims() reference: https://supabase.com/docs/reference/javascript/auth-getclaims (fetched 2026-03-03)
- shadcn/ui Tailwind v4 docs: https://ui.shadcn.com/docs/tailwind-v4 (fetched 2026-03-03)
- .planning/research/STACK.md — prior project stack research (2026-03-03)
- .planning/research/ARCHITECTURE.md — prior schema + RLS research (2026-03-03)
- .planning/research/PITFALLS.md — prior critical pitfalls research (2026-03-03)

### Secondary (MEDIUM confidence)
- Supabase Google OAuth guide: https://supabase.com/docs/guides/auth/social-login/auth-google (fetched 2026-03-03)
- Supabase creating client guide: https://supabase.com/docs/guides/auth/server-side/creating-a-client (fetched 2026-03-03)
- Supabase API key migration discussion: https://github.com/orgs/supabase/discussions/29260
- React Hook Form multi-step wizard patterns: https://blog.logrocket.com/building-reusable-multi-step-form-react-hook-form-zod/ (multiple verified sources)
- date-fns-tz npm: https://www.npmjs.com/package/date-fns-tz

### Tertiary (LOW confidence)
- shadcn/ui Tailwind v4 search result: https://ui.shadcn.com/docs/tailwind-v4 (confirmed HIGH via direct fetch)
- Supabase exact `SUPABASE_SERVICE_SECRET_KEY` env var name — inferred from new key scheme; verify in Supabase dashboard at project creation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all core libraries verified from official docs; new key names confirmed
- Architecture: HIGH — proxy.ts pattern fetched from official Next.js docs; Supabase SSR pattern confirmed
- Pitfalls: HIGH — all critical pitfalls are confirmed breaking changes or well-documented Supabase/Next.js behaviors
- Timezone handling: HIGH — date-fns-tz is the established standard; IANA timezone requirement is unambiguous
- Supabase key migration: HIGH — confirmed via official docs and community discussion

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (30 days — stack is stable; Supabase key migration is complete, not actively changing)

**Critical note for implementation:** Two confirmed breaking changes from prior research docs:
1. `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (new projects)
2. `supabase.auth.getUser()` → `supabase.auth.getClaims()` in proxy.ts (performance + recommended pattern)

Verify both at project creation time against the actual Supabase dashboard values.