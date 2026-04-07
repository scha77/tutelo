# S02: Eliminate Client-Side Zod

**Goal:** Remove the 296K Zod library from the client JS bundle by replacing zodResolver with native validation in LoginForm and OnboardingWizard.
**Demo:** After this: npx next build shows no chunk containing ZodObject. LoginForm and OnboardingWizard validation still works.

## Tasks
- [x] **T01: Replaced react-hook-form + zodResolver in LoginForm with native form handling — Zod no longer in shared client bundle.** — 1. Read LoginForm.tsx — replace zodResolver with native HTML validation (required, type=email, minLength) or manual checks in onSubmit
2. Read OnboardingWizard.tsx and WizardStep1-3 — replace zodResolver with manual validation
3. Remove zod and @hookform/resolvers imports from both components
4. If react-hook-form is only used in these 2 components, consider replacing with native form handling
5. Verify build output has no ZodObject in client chunks
  - Estimate: 40min
  - Files: src/components/auth/LoginForm.tsx, src/components/onboarding/OnboardingWizard.tsx, src/components/onboarding/WizardStep1.tsx, src/components/onboarding/WizardStep2.tsx, src/components/onboarding/WizardStep3.tsx
  - Verify: npx next build && node -e 'check no ZodObject in chunks' && npx vitest run
