# T02: 02-booking-requests 02

**Slice:** S02 — **Milestone:** M001

## Description

Build the teacher-facing booking requests dashboard: the /dashboard/requests page, RequestCard client component with accept/decline, Sidebar update with Requests nav item + badge, and the layout-level Stripe warning banner.

Purpose: Closes the teacher side of the booking loop — teachers see incoming requests and can act on them.
Output: /dashboard/requests page, RequestCard component, updated Sidebar, updated layout with pending count + Stripe banner.

## Must-Haves

- [ ] "Teacher sees 'Requests' as first item in the sidebar nav"
- [ ] "Sidebar badge shows the count of pending requests when count > 0"
- [ ] "Each pending request card shows: student name, subject, date/time (teacher timezone), parent email, submitted-ago timestamp"
- [ ] "Accept and Decline buttons are inline on the card — no modal, no reason required"
- [ ] "Accepting changes booking status to 'pending'; Declining changes status to 'cancelled'"
- [ ] "Empty state shows 'No pending requests yet' + copy-link button with teacher's slug URL"
- [ ] "Dashboard shows a sticky banner when teacher has pending requests AND has not connected Stripe (STRIPE-02 in-app)"

## Files

- `src/app/(dashboard)/dashboard/requests/page.tsx`
- `src/components/dashboard/RequestCard.tsx`
- `src/components/dashboard/Sidebar.tsx`
- `src/app/(dashboard)/dashboard/layout.tsx`
- `tests/bookings/booking-action.test.ts`
