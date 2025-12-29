# Security & Production Readiness

## Security Measures Implemented

### 1. Rate Limiting
**Per-Minute Limits:**
- Recommendations: 30 requests/minute per user
- Photo Recognition: 10 requests/minute per user

**Daily Limits:**
- Recommendations: 50 per day per user
- Photo Recognition: 20 per day per user

These limits prevent API cost abuse while allowing legitimate usage.

### 2. Input Sanitization
All user inputs are sanitized to prevent:
- Prompt injection attacks
- Excessive message lengths (2000 char limit)
- Malicious patterns in prompts
- Invalid message structures

### 3. Cost Monitoring
Automatic tracking of API costs with alerts when thresholds are exceeded:
- Daily threshold: $10
- Hourly threshold: $2

Logs are generated every 100 requests to monitor usage patterns.

### 4. Image Upload Validation
- Maximum file size: 5MB
- Validates image format and encoding
- Prevents oversized uploads that could cause memory issues

### 5. Authentication & Authorization
- Supabase JWT-based authentication
- Row-level security (RLS) policies on all database tables
- Service role keys separated from client keys
- API keys stored in environment variables only

## Current Capacity (Free Tier)

### Infrastructure Limits
- **Vercel**: 100GB bandwidth/month, 100 serverless invocations/day
- **Supabase**: 500MB database, 2GB bandwidth/month, 500 concurrent connections
- **Anthropic**: Pay-per-use (no hard limit)

### Estimated User Capacity
- **~1,000 users/month** before hitting free tier bandwidth limits
- **~500 concurrent users** before database connection issues
- **~3,300 recommendations/month** at current daily limits (50/day × 66 users)

### Estimated Monthly Costs
At current usage patterns:
- 0-1,000 users: **$0-50/month** (free tier + minimal API costs)
- 1,000-5,000 users: **$50-295/month** (requires paid tiers)
- 5,000+ users: **$300+/month** (requires scaling)

## Security Best Practices

### Environment Variables
All sensitive keys are stored in environment variables:
- `ANTHROPIC_API_KEY` - Anthropic API key
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key (client-side)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)

**Never commit these to version control.**

### API Endpoint Security
All API endpoints implement:
1. CORS headers (restricted origins in production)
2. Method validation (POST only for sensitive operations)
3. Request body validation
4. Error handling without exposing sensitive details
5. Rate limiting and daily limits

### Database Security
- Row-level security (RLS) enabled on all tables
- Users can only access their own data
- Service role used only for admin operations
- Automatic backups enabled

## Monitoring & Alerts

### Cost Monitoring
Check Vercel logs for cost alerts:
```
[Cost Monitor] ⚠️ Daily cost threshold exceeded: $X.XX
[Cost Monitor] ⚠️ Hourly cost threshold exceeded: $X.XX
```

### Error Monitoring
- Sentry configured for error tracking
- Console logs for API errors
- Rate limit violations logged

### Usage Monitoring
Check these metrics regularly:
- Vercel Analytics: Page views, user sessions
- Supabase Dashboard: Database size, connection count
- Anthropic Dashboard: API usage and costs

## Incident Response

### If Costs Spike
1. Check Vercel logs for unusual activity
2. Identify abusive users/IPs
3. Temporarily reduce daily limits in `api/utils/userLimits.js`
4. Block specific IPs if needed via Vercel settings

### If Database Fills Up
1. Check for duplicate entries
2. Run cleanup scripts in `supabase/` folder
3. Archive old data
4. Consider upgrading to Supabase Pro

### If Site Goes Down
1. Check Vercel deployment status
2. Check Supabase status page
3. Review error logs in Sentry
4. Verify environment variables are set

## Scaling Checklist

When you're ready to scale beyond free tier:

### Immediate (1,000+ users)
- [ ] Upgrade Supabase to Pro ($25/mo) for unlimited connections
- [ ] Upgrade Vercel to Pro ($20/mo) for better bandwidth
- [ ] Set up automated database backups
- [ ] Implement CAPTCHA for signup/photo upload

### Soon (5,000+ users)
- [ ] Add CDN caching for static assets
- [ ] Implement connection pooling for database
- [ ] Set up automated cost alerts via email
- [ ] Add health check monitoring (e.g., UptimeRobot)

### Later (10,000+ users)
- [ ] Consider dedicated database instance
- [ ] Implement request queuing for API calls
- [ ] Add load balancing
- [ ] Set up automated scaling policies

## Testing Security

### Manual Tests
1. Try exceeding rate limits (30 requests in 1 minute)
2. Try exceeding daily limits (50 recommendations in 1 day)
3. Try uploading oversized images (>5MB)
4. Try prompt injection patterns in chat
5. Try accessing other users' data via API

### Automated Tests
Consider adding:
- Unit tests for rate limiting logic
- Integration tests for API endpoints
- Security scanning with tools like Snyk

## Contact

For security issues, contact: sarah@darkridge.com

**Do not disclose security vulnerabilities publicly.**
