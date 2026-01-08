# Testing & Monitoring Strategy

## Current State Assessment (Jan 7, 2026)

### Existing Testing Infrastructure
| Area | Status | Coverage |
|------|--------|----------|
| Unit Tests | ✅ Exists | Limited - only `booksSharedWithMe` feature |
| Integration Tests | ✅ Exists | RLS policies, DB operations |
| E2E Tests (Playwright) | ❌ None | No browser automation |
| Load Testing | ❌ None | No performance benchmarks |
| CI/CD Tests | ⚠️ Partial | Documented but may not be running |

### Recent Issues Observed
- Google SSO spinning for extended time before completing
- Admin Dashboard temporarily inaccessible
- Possible causes: cold starts, connection pooling, no caching, large bundle (918KB)

---

## Recommended Testing Strategy

### 1. Immediate (Low Effort, High Value)

#### Lighthouse CI
- Automated performance scoring on each deploy
- Track Core Web Vitals (LCP, FID, CLS)
- Set performance budgets

#### Uptime Monitoring
- Simple ping test every 5 minutes
- Options: Vercel built-in, UptimeRobot (free tier), Better Uptime
- Alert on downtime via email/Slack

#### Fix Sentry Configuration
- Currently shows "Sentry DSN not configured" in console
- Enable error tracking for production
- Set up alerts for error spikes

### 2. Short-term (Before Beta)

#### Playwright E2E Tests
Critical paths to automate:
1. **Authentication**
   - Google SSO sign in
   - Magic link sign in
   - Sign out
   
2. **Recommendation Flow**
   - Create recommendation from My Collection
   - Generate share link
   - View as signed-out recipient
   - View as signed-in recipient
   - Accept recommendation
   
3. **Admin Dashboard**
   - Access as admin user
   - View user list
   - View recommendation stats

#### API Response Time Logging
- Add timing middleware to API routes
- Log slow queries (>500ms)
- Track Supabase query performance

### 3. Before Public Launch

#### Load Testing (k6 or Artillery)
- Simulate 50-100 concurrent users
- Test critical endpoints:
  - `/api/chat` (AI recommendations)
  - `/api/admin/*` (admin endpoints)
  - Supabase auth endpoints
- Identify bottlenecks

#### Security Audit
- RLS policy review for all tables
- API endpoint authentication checks
- Rate limiting on public endpoints
- CORS configuration review

---

## Implementation Priority

### Tomorrow (Jan 8)
- [ ] Fix Sentry configuration
- [ ] Set up basic uptime monitoring
- [ ] Review bundle size - consider code splitting

### This Week
- [ ] Add Playwright for critical auth flows
- [ ] Add API response time logging
- [ ] Review and optimize slow queries

### Before Beta Launch
- [ ] Complete E2E test coverage
- [ ] Run load tests
- [ ] Security audit
- [ ] Performance optimization based on findings

---

## Performance Optimization Opportunities

### Bundle Size (Currently 918KB)
- Enable more aggressive code splitting
- Lazy load Admin Dashboard (already done)
- Consider lazy loading heavy components

### Cold Starts
- Keep-alive pings for critical serverless functions
- Consider edge functions for auth callbacks

### Database
- Review Supabase connection pooling settings
- Add indexes for frequently queried columns
- Consider caching for static data (book catalog)

---

## Monitoring Dashboard (Future)

Consider setting up a simple dashboard with:
- Uptime status
- Average response times
- Error rates
- Active users
- Recommendation conversion rates
