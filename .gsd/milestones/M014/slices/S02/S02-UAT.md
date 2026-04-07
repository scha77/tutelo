# S02: Eliminate Client-Side Zod — UAT

**Milestone:** M014
**Written:** 2026-04-07T16:41:19.546Z

## UAT: Eliminate Client-Side Zod

### Test 1: Login Validation
1. Navigate to `/login`
2. Click 'Sign in' with empty fields → **Expected:** Email and password error messages appear
3. Enter invalid email (e.g., 'notanemail') → **Expected:** 'Please enter a valid email address' error
4. Enter valid email but short password (e.g., 'abc') → **Expected:** 'Password must be at least 8 characters' error
5. Enter valid credentials → **Expected:** Login succeeds, redirected to dashboard

### Test 2: Sign Up Validation
1. Switch to 'Create account' mode
2. Same validation behavior as sign in

### Test 3: Google SSO
1. Click 'Continue with Google'
2. **Expected:** Redirected to Google OAuth flow
