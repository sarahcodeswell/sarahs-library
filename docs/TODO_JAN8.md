# TODO - January 8, 2026

## Priority Tasks

### 1. Setup Testing Strategy
See: `TESTING_MONITORING_STRATEGY.md`
- [ ] Fix Sentry configuration
- [ ] Set up uptime monitoring
- [ ] Consider Lighthouse CI

### 2. Finish Upstash Enrollment
- [ ] Complete setup (for rate limiting / caching?)

### 3. Setup Google Analytics
- [ ] Add GA4 tracking
- [ ] Configure key events

### 4. Update Admin Panel
- [ ] Add recommendations made stats
- [ ] Add beta user signups tracking

### 5. Personalize Emails (Custom SMTP)
**Goal:** Emails come from `@sarahsbooks.com` instead of `@supabase.co`

**Options:**
- Resend (free tier: 3k emails/month) - recommended
- Postmark
- SendGrid

**Setup steps:**
1. Sign up for Resend at resend.com
2. Add DNS records to verify domain (sarahsbooks.com)
3. In Supabase Dashboard → Settings → Authentication → SMTP Settings:
   - Host: `smtp.resend.com`
   - Port: `465`
   - User: `resend`
   - Password: Your Resend API key
   - Sender email: `noreply@sarahsbooks.com`
   - Sender name: `Sarah's Books`

### 6. Write Curator Tools Spec
- [ ] Define curator capabilities
- [ ] Theme management
- [ ] Book curation workflow

### 7. Write Author Portal Spec (Initial)
- [ ] Define what authors can see
- [ ] Anonymized data access
- [ ] Privacy considerations

### 8. Configure Apple Auth
- [ ] Check if dev account approved
- [ ] If yes, configure in Supabase

### 9. Design In-App Feedback
- [ ] Allow users to submit feedback
- [ ] Include screenshot capability
- [ ] Route to you (email? dashboard?)

### 10. Research Margin App
- [ ] Margin - book tracker app (9.5k reviews, 4.9 rating on App Store)
- [ ] Study their "search by vibes" feature
- [ ] Compare to our curator themes approach
- [ ] Note: Otis (Goodreads founder) compared our themes to their vibes

---

## Completed (Jan 7)
- [x] Migration 037: RLS for anonymous users ✓
- [x] Migration 038: `shared_with` column ✓
- [x] Referral details visibility (shows who joined) ✓
- [x] Mobile copy button overflow fix ✓
- [x] Recommendation history enhancements ✓

---

## Notes
- Google SSO was slow (possible cold start issue)
- Admin Dashboard had temporary access issue (resolved)
- Consider keep-alive pings for critical serverless functions
- Supabase Pro plan enables custom auth domain (auth.sarahsbooks.com)
