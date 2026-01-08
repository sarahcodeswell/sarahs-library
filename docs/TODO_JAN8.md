# TODO - January 8, 2026

## Testing & Monitoring (Priority)
See: `TESTING_MONITORING_STRATEGY.md`

### Immediate Actions
- [ ] Fix Sentry configuration (currently shows "not configured" in console)
- [ ] Set up basic uptime monitoring
- [ ] Review bundle size - consider additional code splitting

---

## UX Issues to Fix

### 1. Referral Details Not Visible
**Problem:** User profile shows "1 friend joined" but no way to see WHO joined.

**Current state:** 
- `referrals` table has `invited_email` column
- Profile only shows count, not details

**Solution:** Add expandable list showing:
- Email/name of person who joined
- Date they joined
- Status (accepted)

### 2. "Shared With" Field Not Showing in Profile
**Problem:** The "shared with" field added to recommendations isn't displaying in the profile history.

**Root causes:**
1. Migration 038 needs to be run on Supabase (adds `shared_with` column)
2. Only NEW recommendations will have this field populated
3. Existing test data doesn't have recipient info

**Solution:** 
1. Run migration 038
2. Field will show for new recommendations where user enters recipient name
3. Consider: Allow editing "shared with" on existing recommendations?

---

## Migrations Pending
- [ ] Migration 037: Fix RLS for anonymous users viewing shared recommendations
- [ ] Migration 038: Add `shared_with` column to `user_recommendations`

---

## Notes
- Google SSO was slow (possible cold start issue)
- Admin Dashboard had temporary access issue (resolved)
- Consider keep-alive pings for critical serverless functions
