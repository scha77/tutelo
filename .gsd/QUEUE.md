# Queued Milestones

<!-- Items here are future milestone ideas, not yet planned. They'll be picked up after the current milestone completes or when explicitly scheduled. -->

## Dynamic Social Previews (The "iMessage Business Card")

**Added:** 2026-03-11
**Requested by:** User
**Priority:** TBD

**Problem:** When a teacher texts their Tutelo link to a parent or drops it in a Facebook group, it shows up as a blank grey box. Links need to "unfurl" into a beautiful preview card with the teacher's name, photo, subjects, and a call-to-action.

**Desired behavior:**
- Open Graph / Twitter Card meta tags on teacher profile pages (`/[slug]`)
- Dynamic OG image generation (teacher photo, name, subjects, hourly rate, tagline)
- Works in iMessage, Facebook, LinkedIn, WhatsApp, Slack, and Discord link previews
- Fallback to a branded Tutelo card if teacher has no photo

**Rough scope:**
- Dynamic OG image generation (Next.js `ImageResponse` or similar)
- Meta tags on slug page with teacher-specific data
- Verify unfurling in major platforms (iMessage, Facebook, WhatsApp)
- May overlap with existing `og-metadata` test patterns

---

## Auto-Generated QR Codes

**Added:** 2026-03-11
**Requested by:** User
**Priority:** TBD

**Problem:** Education is heavily reliant on physical paper — take-home folders, back-to-school night flyers, syllabus printouts. Teachers need a dead-simple way to get their Tutelo booking link onto paper.

**Desired behavior:**
- Teacher dashboard has a "Download QR Code" button
- QR code encodes the teacher's public profile URL (`tutelo.com/[slug]`)
- Downloadable as PNG (for print) at high resolution
- Optionally: a printable "mini-flyer" template with QR code, teacher name, subjects, and "Book a session" CTA

**Rough scope:**
- QR code generation (client-side library like `qrcode` or server-side)
- Dashboard UI: preview + download button
- Optional: printable flyer template (PDF or styled HTML-to-image)
- No database changes needed — purely derived from existing teacher profile data

---

## The "Copy-Paste" Swipe File

**Added:** 2026-03-11
**Requested by:** User
**Priority:** TBD

**Problem:** Teachers experience decision fatigue by 3:30 PM. They shouldn't have to figure out how to announce their new tutoring business. Give them exact scripts they can copy and paste.

**Desired behavior:**
- After onboarding (or accessible from dashboard), show pre-written announcement templates
- Templates for: email signature block, parent newsletter blurb, Facebook/social post, back-to-school night handout text
- Each template is pre-filled with the teacher's name, subjects, link, and rate
- One-click copy to clipboard for each template

**Rough scope:**
- Template engine that interpolates teacher profile data into pre-written copy
- Dashboard page or modal with template categories
- Copy-to-clipboard functionality per template
- No database changes — purely derived from existing profile data
- Content writing: craft compelling, teacher-voice templates

---

## The "At Capacity / Waitlist" State

**Added:** 2026-03-11
**Requested by:** User
**Priority:** TBD

**Problem:** A side-hustling teacher might only have room for 3 students. Once those slots are booked, you don't want them removing their Tutelo link from their email signature, but you also don't want parents frustrated by an empty calendar.

**Desired behavior:**
- Teacher sets a "max active students" or "max weekly sessions" capacity in dashboard settings
- When capacity is reached, profile page shows "Currently at capacity" instead of the booking calendar
- Optional waitlist: parent can enter email to be notified when a spot opens
- Teacher can see waitlist in dashboard and manually open spots
- When a booking is cancelled or a student leaves, capacity updates automatically

**Rough scope:**
- New `capacity_limit` column on `teachers` table (nullable — null means unlimited)
- Dashboard settings UI for setting capacity
- Logic to count active bookings/students against capacity
- Profile page state: normal calendar vs "at capacity" with optional waitlist form
- Waitlist table: `(id, teacher_id, parent_email, created_at, notified_at)`
- Notification trigger when capacity frees up (email to waitlisted parents)
- Edge cases: concurrent bookings near capacity, teacher manually overriding

---

## Variable Pricing by Session Type

**Added:** 2026-03-11
**Requested by:** User
**Priority:** TBD (after M004 or M005)

**Problem:** Currently teachers have a single `hourly_rate` on the `teachers` table. Some teachers want to charge differently based on session type — e.g. $35 for a general session, $45 for test prep, $50 for college essay review.

**Desired behavior:**
- Default: single price point (most teachers just have one rate) — no UX change needed
- Optional: teacher can define per-subject or per-session-type pricing that overrides the default rate
- The booking flow should surface the correct price based on what the parent selects
- Must be clear and easy for the teacher to set up (not overwhelming)

**Current state:**
- `teachers.hourly_rate` — single integer column (min 10, max 500)
- Onboarding wizard step 2 collects `hourly_rate` via a number input
- Payment intent creation uses `teacher.hourly_rate` to compute amount
- Booking form has a subject selector (when teacher has multiple subjects)

**Design considerations:**
- Could be per-subject pricing (subjects already exist as `text[]` on teacher) or a separate "session types" concept
- Per-subject is simpler but less flexible (what if a teacher charges differently for "SAT Prep" vs "ACT Prep" but both are under "Math"?)
- A separate `session_types` table with `(id, teacher_id, label, price, sort_order)` is more flexible
- Default rate should still work as fallback — if no session types defined, use `hourly_rate`
- Booking calendar needs to show price next to session type selector
- Stripe payment intent amount must use the correct session-type price

**Rough scope:**
- New `session_types` table or pricing on subjects
- Dashboard settings UI for managing session types + prices
- Booking form integration (select session type → price adjusts)
- Payment intent uses session-type price instead of flat hourly_rate
- Migration: existing teachers keep working with single hourly_rate as default
