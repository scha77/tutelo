# S03: Category Pages & Sitemap — UAT

**Milestone:** M008
**Written:** 2026-03-31T02:31:53.808Z

## S03 UAT: Category Pages & Sitemap

### Test Cases

**TC-01: Subject category page**
- Navigate to /tutors/math
- Expected: Page title "Math Tutors | Tutelo", only Math teachers shown, back-link to /tutors

**TC-02: Subject with hyphen slug**
- Navigate to /tutors/sat-prep
- Expected: Page title "SAT Prep Tutors | Tutelo", SAT Prep teachers shown

**TC-03: Location category page**
- Navigate to /tutors/chicago
- Expected: Page title "Tutors in Chicago | Tutelo", teachers with city=Chicago shown

**TC-04: Canonical tag**
- View page source of /tutors/math
- Expected: `<link rel="canonical" href="https://tutelo.app/tutors/math" />`

**TC-05: Sitemap reachable**
- Navigate to /sitemap.xml
- Expected: Valid XML with at least one entry for https://tutelo.app/tutors

**TC-06: Teacher URLs in sitemap**
- View /sitemap.xml source
- Expected: Entries for https://tutelo.app/{teacher-slug} for published teachers

