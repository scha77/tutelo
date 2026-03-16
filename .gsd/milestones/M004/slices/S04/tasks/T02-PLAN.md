---
estimated_steps: 4
estimated_files: 2
---

# T02: Add Cancel Session button with confirmation dialog to ConfirmedSessionCard and wire into sessions page

**Slice:** S04 — Last-Minute Session Cancellation
**Milestone:** M004

## Description

Add the "Cancel Session" button to `ConfirmedSessionCard` alongside the existing "Mark Complete" button, with a `window.confirm` dialog to prevent accidental cancellation. Wire the `cancelSession` server action from T01 into the sessions page by passing it as a prop.

## Steps

1. **Update `ConfirmedSessionCard` props** — Add `cancelSessionAction: (id: string) => Promise<{ success?: true; error?: string }>` prop alongside existing `markCompleteAction`. Add a second `useTransition` for cancel pending state (`isCancelPending`).

2. **Add Cancel Session button** — Place a "Cancel Session" button next to "Mark Complete" in the card's action area. Style it as destructive (red outline / ghost variant). Disable both buttons while either action is pending. The cancel button shows "Cancelling…" while `isCancelPending`.

3. **Add confirmation dialog** — On cancel click, call `window.confirm('Cancel this session? The parent will be notified and the payment authorization will be released.')`. Only proceed with `startTransition` → `cancelSessionAction(booking.id)` if confirmed. On success: `toast.success('Session cancelled — parent notified')`. On error: `toast.error(\`Failed to cancel: \${result.error}\`)`.

4. **Wire into sessions page** — In `src/app/(dashboard)/dashboard/sessions/page.tsx`, import `cancelSession` from `@/actions/bookings` and pass as `cancelSessionAction` prop to each `ConfirmedSessionCard`. Verify `npm run build` passes with zero errors.

## Must-Haves

- [ ] `cancelSessionAction` prop added to `ConfirmedSessionCard`
- [ ] "Cancel Session" button rendered alongside "Mark Complete"
- [ ] `window.confirm` dialog fires before action executes
- [ ] Success toast: "Session cancelled — parent notified"
- [ ] Error toast shows server action error message
- [ ] Both buttons disabled while either action is pending
- [ ] Sessions page passes `cancelSession` as `cancelSessionAction`
- [ ] `npm run build` passes with zero errors

## Verification

- `npm run build` — zero errors
- Visual: ConfirmedSessionCard renders both "Mark Complete" and "Cancel Session" buttons

## Observability Impact

- Signals added/changed: None (UI layer; observability is in the server action from T01)
- How a future agent inspects this: Browser DevTools / accessibility tree shows both action buttons on confirmed session cards
- Failure state exposed: Toast error message surfaces server action failure to teacher

## Inputs

- `src/actions/bookings.ts` — `cancelSession` export from T01
- `src/components/dashboard/ConfirmedSessionCard.tsx` — existing component with `markCompleteAction` pattern
- `src/app/(dashboard)/dashboard/sessions/page.tsx` — sessions page RSC that passes action props

## Expected Output

- `src/components/dashboard/ConfirmedSessionCard.tsx` — updated with `cancelSessionAction` prop, cancel button, confirm dialog, toast feedback
- `src/app/(dashboard)/dashboard/sessions/page.tsx` — imports and passes `cancelSession` as `cancelSessionAction`
