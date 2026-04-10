---
estimated_steps: 5
estimated_files: 1
skills_used: []
---

# T01: Add DMARC TXT record to Vercel DNS

Add the DMARC monitoring record to `_dmarc.tutelo.app` via the Vercel CLI. Start in p=none (monitor only) to avoid accidentally quarantining legitimate email. Include `fo=1` to receive reports on any authentication failure.

Steps:
1. Run `vercel dns add tutelo.app _dmarc TXT 'v=DMARC1; p=none; rua=mailto:soosup.cha@gmail.com; fo=1'`
2. Verify with `dig +short TXT _dmarc.tutelo.app` (wait up to 60s for propagation)
3. Verify Vercel sees the record with `vercel dns ls tutelo.app`

## Inputs

- None specified.

## Expected Output

- `Live DMARC TXT record on _dmarc.tutelo.app`

## Verification

dig +short TXT _dmarc.tutelo.app | grep -q 'v=DMARC1; p=none'
