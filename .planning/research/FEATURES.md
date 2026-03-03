# Features Research: Tutelo

**Domain:** Tutoring booking platform / tutor-facing SaaS
**Researched:** 2026-03-03
**Confidence note:** WebSearch and WebFetch were unavailable during this research session. All findings are drawn from training knowledge (cutoff August 2025) of the named competitors. These platforms are well-established with slowly-evolving core feature sets. Commission percentages and exact pricing are MEDIUM confidence — verify against current public pricing pages before using competitively.

---

## Table Stakes

Features users (teachers AND parents) expect to exist. Missing = product feels unfinished or untrustworthy. Bounce rate spikes.

| Feature | Why Expected | Complexity | Confidence | Notes |
|---------|--------------|------------|------------|-------|
| Public profile / landing page | Parents need somewhere to evaluate the teacher before booking. Without it, the teacher is just a stranger. | Low | HIGH | Auto-generation from onboarding is the Tutelo differentiator — but the page itself is table stakes. |
| Booking request or booking form | The core transaction. Without this, it's just a directory. | Low-Med | HIGH | Tutelo uses a two-phase model (request pre-Stripe, direct post-Stripe) — both phases still surface a form to the parent. |
| Availability display | Parents need to know when the teacher is open before they bother reaching out. Calendars or slots both work — but something must show. | Low | HIGH | A static weekly grid is sufficient at MVP. Real-time conflict detection is not table stakes. |
| Email notifications | Booking confirmation, reminders, and status updates are expected by every user who has ever used Calendly, Acuity, or a medical scheduler. Silent booking = no trust. | Low | HIGH | 24hr reminders are the minimum. Both-party notifications required. |
| Mobile-first experience | Teachers are likely on phones between classes. Parents are phone-first. A desktop-only experience loses a significant portion of the target audience immediately. | Low (with Tailwind) | HIGH | Sticky "Book Now" CTA on mobile is correctly identified in PROJECT.md as mandatory. |
| Payment collection | Parents expect professional tools to have professional payments. Venmo/PayPal DMs signal "informal" and reduce perceived trust and legitimacy. | Med | HIGH | Stripe integration is table stakes for credibility. The deferred-until-first-booking approach is a UX innovation, not an avoidance of the feature. |
| Review / social proof | A teacher page with no reviews looks new or suspect. Even one or two reviews create trust. Review system must be visibly present. | Low | HIGH | Post-session review prompt via email is the right delivery mechanism. |
| Shareable URL | Teachers need something to put in their Instagram bio, text to parents, or add to their email signature. Without a clean URL, distribution is broken. | Low | HIGH | tutelo.com/ms-johnson is exactly right. Random UUID URLs kill word-of-mouth. |
| Session history / record | Teachers doing this as a business need to know who they've taught, when, and for how much — for taxes if nothing else. | Low | HIGH | Dashboard with completed sessions, earnings, and student list covers this. |
| Cancellation pathway | Life happens. Teachers and parents need a way to cancel without it being a support ticket. | Low | MEDIUM | MVP can handle this lightly (email + manual). Full policy enforcement is Phase 2. |

---

## Differentiators

Features that create competitive advantage specifically for the K-12 classroom teacher market. These are not available (or not well-executed) in any current competitor.

| Feature | Value Proposition | Complexity | Why Competitors Miss This | Notes |
|---------|-------------------|------------|--------------------------|-------|
| Sub-7-minute onboarding with auto-generated page | Exhausted teachers won't invest in a side hustle setup that takes longer than a planning period. Speed-to-live-page is the hook. | Med | Wyzant/Preply: 30-60 min application + approval wait. Fons: 20-40 min setup. Acuity: no concept of a public-facing profile page. | The auto-bio generator alone removes a major drop-off point. Teachers hate writing about themselves. |
| Deferred Stripe Connect | Removes the "enter bank info before seeing any value" barrier that kills conversion in every competing product. Triggers payment setup at peak motivation — when a parent is waiting with money. | High | No competitor does this. All require payment setup before you can accept bookings. Fons requires subscription before any features. | This is the single most important UX innovation in Tutelo. Protect it. |
| Teacher credential trust signal | "Ms. Johnson teaches 4th grade at Riverside Elementary" is dramatically more trustworthy than "johnsontutor1987" on Wyzant. The school affiliation + classroom teacher identity is the unique trust layer. | Low | Wyzant verifies degrees but has no concept of "active classroom teacher." Preply emphasizes language teachers. Neither surfaces school/classroom context. | This is free trust that Tutelo gets because it knows its user. Auto-pull from onboarding answers, display prominently. |
| 7% fee vs. 18-33% on marketplaces | At $50/hr, teachers keep $46.50 instead of $33-41. That's $5-13.50/hr more per session — over a school year of side hustle work, this compounds significantly. | N/A (business model) | Marketplace model requires high commission to fund matchmaking. Tutelo's self-distribution model (teacher brings own clients) enables the low fee. | The fee advantage must be explicitly called out in teacher-facing marketing. Make the math obvious. |
| "Founding Teacher" badge | Creates exclusivity, community identity, and loss aversion. First cohort has something latecomers can't get. | Low | No competitor has a cohort-based early access program for teachers. | High return on low implementation cost. A badge field on teacher profile + a landing page mentioning it. |
| Area rate benchmarks during onboarding | "Most tutors in your area charge $45-65/hr" removes the anxiety of pricing yourself. Teachers consistently underprice themselves. | Low-Med | Wyzant shows market rates but only after full approval. Fons shows nothing. | Even hardcoded benchmark ranges per city/subject are better than nothing. Start with static data, make it dynamic later. |
| Teacher dashboard designed for side-hustle scale | 2-5 hrs/week. 3-8 students. Not a full-time business. The dashboard should reflect this reality — not show empty enterprise features. | Low | Fons is built for full-time instructors (class schedules, multi-instructor studios). Wyzant dashboard is complex with trial management, session notes, and marketing tools. | Tutelo's dashboard simplicity IS the differentiator. Resist feature bloat here. |

---

## Anti-Features (Don't Build at MVP)

Things competitors do that Tutelo should deliberately not build at MVP. Either complexity traps, wrong-user assumptions, or features that undermine the core value proposition.

| Anti-Feature | Why It's a Trap | What Competitors Do | What Tutelo Does Instead |
|--------------|-----------------|---------------------|--------------------------|
| In-app messaging / chat | Building a real-time messaging system is 3-5x the complexity of everything else in the MVP combined. Teachers already have text, email, and iMessage. Solving "where do they communicate" is not the problem. | Wyzant has full in-app messaging with read receipts. Preply has video+chat integration. | Tutelo tells both parties to communicate externally for now. This is the right MVP call. Flag this explicitly in confirmation emails so no one is confused. |
| Video conferencing | Building or deeply integrating video is a full product in itself (latency, recording, whiteboard, multi-party). Teachers already have Zoom and Google Meet. | Preply has built-in video with whiteboard. This is their core differentiator for online-first tutoring. | Tutelo is for in-person and teacher-managed-online. "Use Zoom" is not a weakness — it's pragmatism. |
| Session notes / progress tracking | Useful feature. Wrong phase. This requires a data model for skill taxonomies, note templates, or free-form notes per student per session. That's a whole sub-product. | Wyzant has session summaries. TutorBird (competitor not listed) has full progress reports. | Phase 2. A teacher can keep notes in their own Google Doc. At MVP, no teacher is expecting this from a booking tool. |
| Discovery / search marketplace | Building a two-sided marketplace from scratch where discovery happens on-platform requires critical mass on both sides. Without 1000+ teachers, the search is useless. With 50 founding teachers, search delivers nothing. | Wyzant and Preply are built around search. Teacher earns only when platform drives traffic. | Teachers drive their own traffic at launch. This IS the model — not a compromise. Teachers who drive their own clients don't need to compete in a race-to-the-bottom search ranking. Phase 2 when there are enough teachers to make search useful. |
| Credential verification | Background checks, degree verification, and teaching license verification add days to onboarding, require third-party integrations (Checkr etc.), and create legal/liability complexity. | Wyzant requires degree verification and does background checks. Takes 1-7 days. | Self-reported at MVP. The trust layer is "active classroom teacher at [school]" — public information that parents can independently verify in 30 seconds. Formal verification is Phase 2+. |
| Recurring / subscription bookings | Subscription billing (e.g., "4 sessions/month at $160") requires dunning management, proration logic, pause/cancel flows, and a different payment model. This is a billing product, not a booking product. | Fons supports recurring appointments and subscription packages. | Manual rebooking for MVP. A parent who wants to rebook opens the page and books again. That friction is acceptable until Volume justifies the complexity. |
| Package / bundle sales | "Buy 10 sessions, get 1 free" requires prepaid session credit ledgers, refund logic for unused sessions, and expiration policy decisions. All of this is non-trivial. | Wyzant supports trial sessions and multi-session bundles. | Single-session billing only at MVP. Clean, simple, auditable. |
| Cancellation policy enforcement | Defining cancellation windows (e.g., 24hr = 50% refund) and enforcing them requires conditional payment capture logic, partial refunds, dispute handling, and policy display. | Wyzant and Preply have formal cancellation policies with tiered refunds. | Handle informally at MVP. Email-based coordination. Add policy enforcement when there are enough sessions that informal handling creates support burden. |
| Teacher marketing tools | SEO tips, social sharing buttons, email templates, referral programs, analytics dashboards — all valuable. All distractions at 80-120 hrs total budget. | Wyzant has extensive tutor success resources and marketing guidance built into the dashboard. | The page IS the marketing tool. The URL IS the distribution. Instagram bio link → done. |
| Multi-teacher / studio accounts | "I want to manage my tutoring center with 5 tutors" is a real need — for a different product and a different user. | Fons supports studios with multiple instructors. | Tutelo is for the individual classroom teacher. One account = one teacher = one page. No multi-user, no agency accounts. |
| Mobile app (native) | Native app = 2x development surface, app store approval latency, push notification infrastructure, and ongoing maintenance. | Most competitors have native apps. | Progressive Web App behavior via responsive web is sufficient at MVP. Teachers access from a browser. Parents book from a browser. No app needed until there is a core workflow that genuinely benefits from native capabilities (push notifications for session reminders being the most likely candidate). |
| Waitlist / intake form | Some tutors use Typeform or Google Forms as a "lead capture" before booking. This is an extra step that adds friction for the parent and complexity for the teacher. | Some smaller tutor tools offer intake form builders. | Book Now → booking request. Direct. One step. |
| Trial session pricing | Discounted first-session offers require special pricing logic, one-time discount codes, or conditional billing rules. | Wyzant has a structured trial session model. | Standard rate from day one. Teachers can choose to discuss pricing with parents informally if they want to offer a discount. |

---

## Phase 2 Candidates

Worth building once MVP is validated and initial teachers have real bookings.

| Feature | Why Phase 2 (Not MVP) | Value When Added | Estimated Complexity |
|---------|----------------------|------------------|---------------------|
| In-app messaging | Once there are enough sessions happening that "text me" creates confusion or missed communication, a message thread per session becomes worth building. | High — reduces session coordination friction | High |
| Recurring bookings | When rebooking friction shows up in retention data (parents not coming back because rebooking is annoying). | High — directly improves LTV | Med |
| Local search / discovery directory | When there are 200+ teachers in multiple cities, a search page becomes useful for new parent acquisition. Before that, it's an empty storefront. | High — changes distribution model | Med-High |
| SEO landing pages (city + subject) | "Math tutor in Austin TX" SEO pages are a real acquisition channel — but only worth building once there are teachers to populate them. | High at scale | Med |
| School / district pages | "Teachers at Riverside Elementary who tutor" — useful trust layer, requires coordination with teachers to tag their school. | Med | Low-Med |
| Session notes | Once a teacher has 5+ recurring students, keeping notes in a Google Doc gets painful. A simple free-form notes field per session is a high-value, low-complexity add. | Med | Low |
| Cancellation policy enforcement | Once informal handling creates a support burden (a handful of disputes per week), enforce policies in the system. | Med | Med |
| Credential / background check | As Tutelo's reputation grows, formal verification becomes a trust moat. Checkr integration adds days but adds significant parent confidence. | Med-High | Med |
| Referral program | "Invite a teacher friend, you both get $X off fees" — classic SaaS growth loop. Worth building when there is a meaningful base to compound. | High at scale | Low-Med |
| Teacher analytics | How many profile views, booking conversion rate, repeat student %, etc. — useful for teacher engagement and retention once there's data to show. | Med | Med |
| Stripe fee pass-through or parent-side fee | Stripe fees can be passed to the parent (parent pays $X + processing fee) which increases teacher take-home. Requires UX explanation and pricing restructure. | Med | Low |
| Package / bundle purchases | Once recurring patterns emerge and teachers want to pre-sell session blocks to committed families. | Med | Med-High |

---

## Phase 3 Candidates

Higher complexity, different user type, or requires Phase 2 features as prerequisites.

| Feature | Why Phase 3 | Prerequisites |
|---------|-------------|---------------|
| Group sessions / cohorts | Different pricing model, waitlist logic, capacity management, per-student payment splitting. A different product. | Session history data, recurring bookings, robust notification system |
| Digital products / downloads | Study guides, practice sets, etc. sold through the teacher page. Requires digital fulfillment, file storage, download management. | High teacher engagement, stable payment infrastructure |
| Workshops / events | Multi-seat events with registration, capacity, and potentially Zoom integration. Biggest scope expansion possible. | Group session model |
| Mobile app | Justified when there's a native-specific workflow (push reminders, camera-based receipt capture, etc.) | Product-market fit confirmed, budget for native development |
| Curriculum marketplace | Teachers selling lesson plans or tutoring materials to other teachers (different audience). | Large teacher base, content moderation |

---

## Competitor Analysis

### Wyzant

**What it does well (for its market):**
- Large tutor supply creates genuine discovery value for parents
- Thorough credentialing (degree verification, background checks) builds parent trust
- In-app video + whiteboard for online sessions
- Session notes and summaries
- Structured trial session model reduces parent risk

**What it does badly for Tutelo's target user:**
- 25-40% commission is a deal-breaker for teachers who already have parent relationships. A classroom teacher doing $200/week in tutoring loses $50-80/week to Wyzant that they'd keep on Tutelo.
- Long onboarding (application review, background check wait). The "under 7 minutes" standard is impossible on Wyzant.
- Wyzant owns the client relationship. If a teacher leaves Wyzant, they lose their reviews, their profile, their booking history. Tutelo's model gives teachers their own URL and their own page — they can take the link with them.
- Platform drives client acquisition, meaning teachers compete against hundreds of other tutors on the same search result page. College students who can charge $20/hr undercut the classroom teacher.
- Complex dashboard and feature set designed for full-time professional tutors, not side-hustle teachers.

**Confidence:** MEDIUM (commission rates change; core model is stable)

---

### Preply

**What it does well (for its market):**
- Strong for language tutoring, international teacher market
- Built-in video with interactive whiteboard
- Student subscription model creates predictable recurring revenue for tutors
- Platform-driven acquisition via SEO and paid marketing

**What it does badly for Tutelo's target user:**
- Heavily language-tutor focused. A 5th grade math teacher at a US elementary school is not Preply's user.
- Commission structure (18-33% declining with hours) still takes a large cut.
- Platform discovery model means teachers compete globally, not locally. A US classroom teacher has a local trust advantage that Preply's model doesn't leverage.
- Requires video integration; in-person tutors have no good fit here.
- Long application process similar to Wyzant.

**Confidence:** MEDIUM

---

### Fons

**What it does well:**
- Built for independent instructors (music teachers, coaches, tutors) — not a marketplace
- Recurring appointment scheduling with smart conflict detection
- Package and subscription billing for sessions
- Client portal so students/parents can self-manage
- Studio/multi-instructor support
- Relatively clean onboarding compared to marketplaces

**What it does badly for Tutelo's target user:**
- Monthly subscription cost (no free tier at last check — ~$29-49/mo). Zero upfront cost is a hard requirement for Tutelo. A teacher needs to see real value (a booking) before paying anything.
- No concept of a public-facing discovery page or profile URL. Fons is a back-office tool, not a front-facing "find me" page. Teachers still need to drive their own traffic but get no shareable public profile.
- Designed for instructors with high session volume (music teachers with 20 students/week). The 2-5 hrs/week classroom teacher side hustle is under-served.
- Onboarding requires payment setup upfront.
- No teacher credential or school-affiliation trust layer.

**Confidence:** MEDIUM (subscription pricing verified to exist; exact tiers from training data, may have changed)

---

### Acuity Scheduling

**What it does well:**
- Extremely polished scheduling experience
- Deep Stripe integration
- Intake forms, packages, gift certificates
- Strong automation (reminders, follow-ups)
- Squarespace acquisition has increased polish and distribution

**What it does badly for Tutelo's target user:**
- Generic scheduling tool — no tutoring or education context whatsoever
- No public profile / discovery page. You get a booking page URL but it's purely functional (pick a time), not a trust-building profile.
- Monthly cost required to use Stripe payments (~$16-20+/mo depending on plan). Zero upfront cost requirement is violated.
- Setup requires meaningful configuration time — it does not auto-generate anything from your identity or credentials.
- No concept of "classroom teacher" identity as a trust signal.
- Parents see a calendar. They don't learn who the teacher is, what school they teach at, what subjects they specialize in.

**Confidence:** MEDIUM

---

### Calendly

**What it does well:**
- Frictionless scheduling link sharing — arguably the best in class
- Strong calendar integrations (Google, Outlook, iCal)
- Clean, professional UX
- Free tier for basic use
- Routing and round-robin for teams (irrelevant here but shows polish)

**What it does badly for Tutelo's target user:**
- No payment integration on free tier; paid tier required for Stripe (~$10-16/mo)
- No public profile page — just a scheduling page
- No concept of teacher identity, credentials, subjects, rates
- No reviews or social proof
- The booking page doesn't convert a skeptical parent — it's purely transactional for people who already trust the person
- No teacher dashboard, earnings tracking, or session history
- In the teacher side-hustle workflow: teacher would need Calendly ($) + Stripe ($) + Venmo + Google Calendar + a separate profile (LinkedIn?) — the fragmentation is exactly what Tutelo solves

**Confidence:** HIGH (Calendly's features are well-documented and stable)

---

## Feature Dependencies

Key dependencies that constrain build order:

```
Teacher Auth
  → Teacher Onboarding Wizard
    → Auto-generated Landing Page
      → Booking Request Form (parent can submit)
        → "Money Waiting" Email (teacher)
          → Stripe Connect Onboarding (teacher)
            → Direct Booking Flow (parent creates account + pays)
              → Payment Authorization at Booking
                → Session Completion → Payment Capture
                  → Review Prompt Email (parent)
                    → Reviews on Landing Page

Teacher Availability Calendar
  → Available Slots on Landing Page
  → Time Slot Selection in Booking Form

Teacher Dashboard
  → Session List (depends on bookings existing)
  → Earnings Display (depends on Stripe Connect)
  → Student List (depends on completed sessions)

Parent Account
  → Booking History (depends on bookings)
  → Rebook (depends on completed sessions + landing page)
```

**Critical path:** Auth → Onboarding → Landing Page → Booking Request → Stripe Trigger. Everything else hangs off this chain.

---

## Teacher-Specific Needs vs. Generic Tutoring Platform Needs

This table is the lens through which every feature decision should be evaluated.

| Dimension | Generic Tutoring Platform Assumption | K-12 Classroom Teacher Reality |
|-----------|--------------------------------------|-------------------------------|
| Time available | Tutors have flexible schedules to manage a full client book | Weekday evenings + weekends only; during term, energy is low |
| Client source | Platform drives discovery | Teacher already knows or is introduced to every parent |
| Volume | 10-20+ students for a full-time tutor | 2-6 students; this is a side hustle, not a business |
| Tech comfort | Comfortable setting up and managing SaaS tools | Varies widely; needs dead-simple setup |
| Trust signal | Resume, degree, star rating | "I teach their kid" is the ultimate trust signal |
| Price sensitivity | Professional tutors want maximum earning tools | $29/mo subscription feels like a side hustle tax; 7% at point of payment does not |
| Competition | Competes with other tutors for new clients | Doesn't need to compete — the parent already chose this teacher |
| Session format | Mix of in-person and online | Primarily in-person in early adopter cohort |
| Scheduling complexity | Full-time tutors need sophisticated scheduling with buffers, travel time, multi-location | Weekly availability grid + specific slot selection is sufficient |
| Motivation to set up | Tutoring is their income — high motivation to configure tools | Side hustle — activation energy is real; must minimize setup cost |

**The core insight:** Every feature built for a professional full-time tutor is likely overkill or wrong-fit for a classroom teacher doing this as a side hustle. Tutelo's moat is being the only product that builds *from* the classroom teacher's reality, not *down to* it.

---

## Sources

- Competitor knowledge from training data (August 2025 cutoff). Platforms analyzed: Wyzant, Preply, Fons, Acuity Scheduling, Calendly.
- WebSearch and WebFetch were unavailable during this research session. Verify commission rates and subscription pricing against current public pages before using in competitive positioning.
- PROJECT.md context from `/Users/soosupcha/Projects/Tutelo/.planning/PROJECT.md` — treated as HIGH confidence for Tutelo-specific decisions.
- Fons pricing: MEDIUM confidence — had free trial but required paid subscription for core features as of training data. Verify current pricing at fons.com/pricing.
- Wyzant commission: MEDIUM confidence — ranged 25-40% historically with a "new tutor" rate structure. Verify at wyzant.com/tutor/resources.
- Calendly features/pricing: HIGH confidence — stable, well-documented product.
