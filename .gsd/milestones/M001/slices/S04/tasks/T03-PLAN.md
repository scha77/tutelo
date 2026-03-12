# T03: 04-direct-booking-parent-account 03

**Slice:** S04 — **Milestone:** M001

## Description

Build the parent-facing `/account` route (PARENT-02), the rebook shortcut URL param pre-fill in BookingCalendar (PARENT-03), middleware protection for `/account`, and login redirect support for `?redirect=` param.

Purpose: Parents who complete a direct booking need a place to see their session history and rebook. The `/account` route is completely separate from `/dashboard` (teacher-only). The rebook shortcut pre-fills subject so parents just pick a new time slot.
Output: /account page live with upcoming + past sections and rebook buttons. Role-based redirect logic keeps teachers in /dashboard. BookingCalendar reads ?subject= on mount for rebook pre-fill.

## Must-Haves

- [ ] "Unauthenticated parent visiting /account is redirected to /login?redirect=/account"
- [ ] "Authenticated teacher visiting /account is redirected to /dashboard"
- [ ] "Authenticated parent sees Upcoming (confirmed, future) and Past (completed or past) sessions"
- [ ] "Each past session has a Rebook button that navigates to /[teacher-slug]#booking?subject=Math"
- [ ] "Parent /account page shows teacher name for each booking"
- [ ] "Empty state renders (not a blank page) when parent has no bookings"
- [ ] "Login page supports ?redirect= param so parent lands back at /account after login"
- [ ] "BookingCalendar reads ?subject= URL param on mount and pre-fills subject field when teacher has multiple subjects"

## Files

- `src/app/account/page.tsx`
- `src/app/(auth)/login/page.tsx`
- `middleware.ts`
- `src/components/profile/BookingCalendar.tsx`
- `src/__tests__/parent-account.test.ts`
- `src/__tests__/rebook.test.ts`
