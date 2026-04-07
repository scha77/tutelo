---
estimated_steps: 5
estimated_files: 5
skills_used: []
---

# T01: Replace zodResolver in LoginForm and OnboardingWizard

1. Read LoginForm.tsx — replace zodResolver with native HTML validation (required, type=email, minLength) or manual checks in onSubmit
2. Read OnboardingWizard.tsx and WizardStep1-3 — replace zodResolver with manual validation
3. Remove zod and @hookform/resolvers imports from both components
4. If react-hook-form is only used in these 2 components, consider replacing with native form handling
5. Verify build output has no ZodObject in client chunks

## Inputs

- `src/components/auth/LoginForm.tsx`
- `src/components/onboarding/OnboardingWizard.tsx`

## Expected Output

- `Modified LoginForm.tsx`
- `Modified OnboardingWizard.tsx and step components`

## Verification

npx next build && node -e 'check no ZodObject in chunks' && npx vitest run
