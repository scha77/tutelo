# S02: Full-Text Search — UAT

**Milestone:** M008
**Written:** 2026-03-31T02:28:49.894Z

## S02 UAT: Full-Text Search

**Prerequisite:** Migration 0012 applied to the database.

### Test Cases

**TC-01: Search by teacher name**
- Type a known teacher's first name in the search box
- Expected: That teacher appears in results

**TC-02: Search by subject keyword**
- Type "SAT" in search box
- Expected: Teachers with SAT in subjects or bio appear

**TC-03: Search + filter combined**
- Search "math" + filter to a specific city
- Expected: Only math teachers in that city appear

**TC-04: Search chip appears**
- After typing a search term, a chip showing `"SAT"` appears below filters
- Clicking the chip removes the search param and resets results

**TC-05: Empty search**
- Clear the search box
- Expected: URL drops the q param, full unfiltered list returns

