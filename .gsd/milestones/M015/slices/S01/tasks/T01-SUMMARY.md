---
id: T01
parent: S01
milestone: M015
key_files:
  - (none)
key_decisions:
  - DMARC starts at p=none — safe monitor mode, no enforcement risk
  - rua points to personal Gmail — reports visible immediately, no mail-forwarding infra needed
  - fo=1 enabled to receive forensic reports on SPF/DKIM failures
duration: 
verification_result: passed
completed_at: 2026-04-10T04:03:24.880Z
blocker_discovered: false
---

# T01: DMARC monitoring record live on _dmarc.tutelo.app via Vercel DNS, resolves in &lt;5s.

**DMARC monitoring record live on _dmarc.tutelo.app via Vercel DNS, resolves in &lt;5s.**

## What Happened

Added the DMARC TXT record to _dmarc.tutelo.app via `vercel dns add`. Used `p=none` (monitor mode, no enforcement) to avoid the risk of accidentally quarantining legitimate outbound mail before we've observed a few days of reports. `fo=1` ensures we get forensic reports on any authentication failure (SPF or DKIM mismatch). Aggregate reports (rua) go to soosup.cha@gmail.com. After propagation (~5s), `dig +short TXT _dmarc.tutelo.app` returns the record verbatim.

## Verification

`dig +short TXT _dmarc.tutelo.app` → `"v=DMARC1; p=none; rua=mailto:soosup.cha@gmail.com; fo=1"`. Record visible in Vercel DNS dashboard (rec_7ee5f9bca3e7089e65804dee).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `dig +short TXT _dmarc.tutelo.app` | 0 | ✅ pass | 100ms |

## Deviations

None.

## Known Issues

None. Note: DMARC starts in monitor mode. Bump to `p=quarantine` only after 1-2 weeks of clean reports showing no legitimate-mail authentication failures.

## Files Created/Modified

None.
