---
estimated_steps: 5
estimated_files: 2
---

# T03: Build SchoolEmailVerification UI and wire into dashboard settings

**Slice:** S03 — School Email Verification & Badge Gating
**Milestone:** M005

## Description

Create the user-facing UI for the school email verification flow and wire it into the dashboard settings page. This closes the slice by giving teachers a way to initiate verification and see their status. Also handles the URL param feedback after the verify-email redirect (showing success/error messages). Relevant skill: `frontend-design` for UI component quality.

## Steps

1. **Create `src/components/dashboard/SchoolEmailVerification.tsx`:**
   - `'use client'` directive.
   - Import `useState`, `useTransition` from React, `toast` from `sonner`, `requestSchoolEmailVerification` from `@/actions/verification`.
   - Import UI components: `Label`, `Input`, `Button` from `@/components/ui/`.
   - Import `CheckCircle`, `Mail` icons from `lucide-react`.
   - Props: `{ isVerified: boolean; verifiedParam?: boolean; errorParam?: string }`.
   - **Verified state** (`isVerified === true`): render a card/section with green checkmark icon + "School email verified" text + "Your profile displays the Verified Teacher badge" description. Use the project's brand green (`text-emerald-600`) consistent with `CredentialsBar.tsx`.
   - **Unverified state**: render a card/section with:
     - Heading: "Verify your school email"
     - Description: "Verify your school email to earn a Verified Teacher badge on your profile."
     - Email input: `<Input type="email" placeholder="your.name@school.edu" />` with `useState` for the value.
     - Submit button: "Send verification link" — uses `useTransition` for loading state (show spinner/disabled during send). On click, call `requestSchoolEmailVerification(email)`. On success: `toast.success('Verification link sent! Check your inbox.')`. On error: `toast.error(result.error)`. Clear the input on success.
   - **URL param handling**: use `useEffect` on mount to show toasts for redirect feedback:
     - If `verifiedParam === true`: `toast.success('School email verified! Your profile now shows the Verified Teacher badge.')`.
     - If `errorParam === 'invalid'`: `toast.error('Verification link is invalid or has already been used.')`.
     - If `errorParam === 'expired'`: `toast.error('Verification link has expired. Please request a new one.')`.
   - Style the component as a bordered card section (matching the visual language of `AccountSettings`). Use padding, rounded corners, border consistent with the dashboard design system.

2. **Update `src/app/(dashboard)/dashboard/settings/page.tsx`:**
   - Add `verified_at` to the teacher select query: change the `.select(...)` to also include `verified_at`.
   - Read URL search params for redirect feedback. The page component signature needs `searchParams` (Next.js page props):
     ```tsx
     export default async function DashboardSettingsPage({
       searchParams,
     }: {
       searchParams: Promise<{ verified?: string; error?: string }>
     }) {
     ```
     Note: In Next.js 15+, `searchParams` is a Promise. Await it: `const params = await searchParams`.
   - Render `SchoolEmailVerification` below `AccountSettings`:
     ```tsx
     return (
       <div className="space-y-8">
         <AccountSettings teacher={teacher} />
         <SchoolEmailVerification
           isVerified={!!teacher.verified_at}
           verifiedParam={params.verified === 'true'}
           errorParam={params.error}
         />
       </div>
     )
     ```
   - Import `SchoolEmailVerification` from `@/components/dashboard/SchoolEmailVerification`.

3. **Final build verification:**
   - Run `npm run build` and confirm zero errors.
   - Run `npx vitest run src/__tests__/verification.test.ts` to confirm T01 tests still pass.

## Must-Haves

- [ ] `SchoolEmailVerification` component renders verified state with green checkmark when `isVerified` is true
- [ ] `SchoolEmailVerification` component renders email input form when `isVerified` is false
- [ ] Form calls `requestSchoolEmailVerification` action and shows loading state during transition
- [ ] Success and error toasts display correctly after action call
- [ ] URL params from verify-email redirect trigger appropriate toast messages
- [ ] Settings page select query includes `verified_at`
- [ ] Settings page renders `SchoolEmailVerification` below `AccountSettings`
- [ ] `npm run build` passes with zero errors

## Verification

- `npm run build` — zero errors
- `npx vitest run src/__tests__/verification.test.ts` — all tests still pass
- Visual: settings page shows "Verify your school email" section for unverified teachers
- Visual: after verification, settings page shows green verified state

## Inputs

- `src/actions/verification.ts` — `requestSchoolEmailVerification` action (from T02)
- `src/components/dashboard/AccountSettings.tsx` — pattern for `'use client'` component with `useState`, `useTransition`, `toast` (follow same structure)
- `src/components/profile/CredentialsBar.tsx` — verified badge styling reference (emerald-600, CheckCircle icon)
- `src/app/(dashboard)/dashboard/settings/page.tsx` — current page structure to extend (currently renders only `<AccountSettings>`)

## Expected Output

- `src/components/dashboard/SchoolEmailVerification.tsx` — client component with verified/unverified states
- `src/app/(dashboard)/dashboard/settings/page.tsx` — updated to fetch `verified_at`, read `searchParams`, render `SchoolEmailVerification`
