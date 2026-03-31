# S01: Directory Page & Filters — UAT

**Milestone:** M008
**Written:** 2026-03-31T02:25:36.014Z

## S01 UAT: Directory Page & Filters

### Setup
- Dev server running at localhost:3000
- At least one teacher with is_published=true in the database

### Test Cases

**TC-01: Directory renders**
- Navigate to /tutors
- Expected: Page loads with "Find a Tutor" heading, filter controls, teacher cards

**TC-02: Subject filter**
- Select "Math" from Subject dropdown
- Expected: URL updates to ?subject=Math, only teachers with Math in subjects show, "Math" chip appears below filters

**TC-03: Grade filter**
- Select "5th Grade" from Grade dropdown
- Expected: URL updates to include &grade=5th+Grade, results narrow

**TC-04: City filter**
- Type "Chicago" in city input (wait ~300ms)
- Expected: URL updates to include &city=Chicago, only Chicago teachers show

**TC-05: Price filter**
- Select "$30 – $60"
- Expected: URL updates to include &price=30-60, only teachers in that range show

**TC-06: Combined filters**
- Apply subject + city together
- Expected: URL has both params, results match both criteria

**TC-07: Clear filters**
- With filters active, click "Clear"
- Expected: URL resets to /tutors, all published teachers show

**TC-08: Empty state (filtered)**
- Apply a filter combo that returns no results
- Expected: "No tutors found. Try adjusting or clearing your filters." message shown

**TC-09: Card links**
- Click a teacher card
- Expected: Navigates to /[slug] teacher profile page

**TC-10: Meta tags**
- View page source or use browser dev tools
- Expected: title is "Find a Tutor | Tutelo", canonical is https://tutelo.app/tutors

