# S04: Requirements Rebuild — UAT

**Milestone:** M013
**Written:** 2026-04-07T15:51:21.680Z

## UAT: S04 — Requirements Rebuild

### Preconditions
- `.gsd/REQUIREMENTS.md` exists and is rendered from the GSD database
- All tasks T01–T03 completed

### Test 1: Total Entry Count
**Steps:**
1. Run `grep -c '^### ' .gsd/REQUIREMENTS.md`
**Expected:** Output is ≥ 146 (actual: 151)
**Result:** ✅ PASS

### Test 2: No Untitled Entries
**Steps:**
1. Run `grep -c 'Untitled' .gsd/REQUIREMENTS.md`
**Expected:** Output is 0 (exit code 1 = no matches)
**Result:** ✅ PASS

### Test 3: R005 Validated
**Steps:**
1. Run `grep -A2 'R005' .gsd/REQUIREMENTS.md`
**Expected:** Status shows "validated" with proof text referencing 151 entries
**Result:** ✅ PASS

### Test 4: M001 MVP Coverage (12 capability groups)
**Steps:**
1. Run `grep -c 'Legacy: AUTH' .gsd/REQUIREMENTS.md` → expect 2
2. Run `grep -c 'Legacy: ONBOARD' .gsd/REQUIREMENTS.md` → expect 7
3. Run `grep -c 'Legacy: PAGE' .gsd/REQUIREMENTS.md` → expect 10
4. Run `grep -c 'Legacy: CUSTOM' .gsd/REQUIREMENTS.md` → expect 4
5. Run `grep -c 'Legacy: AVAIL' .gsd/REQUIREMENTS.md` → expect ≥3
6. Run `grep -c 'Legacy: VIS' .gsd/REQUIREMENTS.md` → expect 2
7. Run `grep -c 'Legacy: BOOK' .gsd/REQUIREMENTS.md` → expect 6
8. Run `grep -c 'Legacy: STRIPE' .gsd/REQUIREMENTS.md` → expect 7
9. Run `grep -c 'Legacy: NOTIF' .gsd/REQUIREMENTS.md` → expect 6
10. Run `grep -c 'Legacy: DASH' .gsd/REQUIREMENTS.md` → expect 6
11. Run `grep -c 'Legacy: PARENT' .gsd/REQUIREMENTS.md` → expect ≥3
12. Run `grep -c 'Legacy: REVIEW' .gsd/REQUIREMENTS.md` → expect 3
**Expected:** All counts match expected values — full M001 coverage

### Test 5: Post-MVP Milestone Coverage
**Steps:**
1. Run `grep -c "source: M003" .gsd/REQUIREMENTS.md` → expect 17
2. Run `grep -c "source: M004" .gsd/REQUIREMENTS.md` → expect 5
3. Run `grep -c "source: M005" .gsd/REQUIREMENTS.md` → expect 7
4. Run `grep -c "source: M006" .gsd/REQUIREMENTS.md` → expect 5
5. Run `grep -c "source: M007" .gsd/REQUIREMENTS.md` → expect 9
6. Run `grep -c "source: M008" .gsd/REQUIREMENTS.md` → expect 7
7. Run `grep -c "source: M009" .gsd/REQUIREMENTS.md` → expect 9
8. Run `grep -c "source: M010" .gsd/REQUIREMENTS.md` → expect 14
9. Run `grep -c "source: M012" .gsd/REQUIREMENTS.md` → expect 3
**Expected:** All milestone sources represented with correct counts

### Test 6: UI Entries Have Proper Descriptions
**Steps:**
1. Run `grep 'UI-01\|UI-02\|UI-03\|UI-04\|UI-05\|UI-06\|UI-07\|UI-08\|UI-09' .gsd/REQUIREMENTS.md | grep -c 'Untitled'`
**Expected:** 0 — all UI entries have real descriptions

### Test 7: Traceability — Every Entry Has Legacy ID
**Steps:**
1. Run `grep -c 'Legacy:' .gsd/REQUIREMENTS.md`
**Expected:** ≥ 135 (all entries registered via T01–T03 have Legacy notes)

### Edge Cases
- R065 is a known harmless duplicate of R063 (created during T01 render troubleshooting)
- R066 exists in DB but not rendered (duplicate of R064, also harmless)
- These do not affect contract completeness — the canonical entries have correct IDs
