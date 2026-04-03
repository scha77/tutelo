# M011: 

## Vision
Raise every user-facing surface from functional MVP to modern SaaS premium. The teacher profile page (conversion surface), booking flow, mobile navigation, both dashboards, and landing page all get intentional design treatment. No surface should look like a generic template or feel clunky to use.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | Teacher Profile Page Overhaul | medium | — | ✅ | After this: teacher's public /[slug] page looks premium — polished hero with better banner/avatar treatment, refined credentials bar, improved about section layout, elevated review cards, and cohesive social links footer. Parents get a strong first impression. |
| S02 | Booking Calendar Restructure & Polish | high | S01 | ✅ | After this: the booking flow from date selection → time slot → form → payment feels smooth and intentional. The calendar, time slots, form fields, and payment step are visually cohesive with the new profile page. The 935-line monolith is decomposed into maintainable sub-components. |
| S03 | Mobile Navigation Overhaul | medium | — | ✅ | After this: teacher mobile bottom nav shows 4-5 labeled primary tabs with a More menu for remaining items. Parent mobile nav has labeled tabs. Users can navigate without guessing what icons mean. |
| S04 | Dashboard Polish | medium | S03 | ⬜ | After this: all 11 teacher dashboard pages and 5 parent dashboard pages feel premium — better card treatments, visual hierarchy, stats presentation, empty states, and spacing. The dashboards feel like a cohesive, intentionally designed product. |
| S05 | Landing Page & Global Consistency Pass | low | S01, S04 | ⬜ | After this: the landing page is tightened. Typography, spacing, and component patterns are consistent across every surface. The whole app feels like one product, not 10 milestones of accumulated features. |
