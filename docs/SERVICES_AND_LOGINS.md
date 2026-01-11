# Sarah's Books - Services & Logins

A comprehensive list of all external services, tools, and accounts required to run Sarah's Books.

---

## Monthly Cost Summary

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Vercel | Pro | $20 |
| Supabase | Pro | $25 |
| GitHub | Free | $0 |
| AWS Route53 | Pay-as-you-go | ~$1 |
| Domain (annual) | - | ~$15/year |
| Google Cloud | Free tier | $0 |
| Apple Developer | Annual | $99/year |
| Google Analytics | Free | $0 |
| Sentry | Developer (Free) | $0 |
| UptimeRobot | Free | $0 |
| Termly | Free | $0 |
| OpenAI | Pay-as-you-go | ~$10-50 (usage) |
| Upstash | Free tier | $0 |
| **Total (estimated)** | | **~$56-96/month** |

---

## Hosting & Deployment

### Vercel
- **URL:** https://vercel.com/dashboard
- **What it does:** Hosts the website, handles deployments from GitHub, runs serverless API functions, manages SSL certificates and custom domains
- **Plan:** Pro
- **Cost:** $20/month
- **Account:** sarah@darkridge.com
- **Project:** sarahs-library
- **Domain:** www.sarahsbooks.com

### GitHub
- **URL:** https://github.com/sarahcodeswell/sarahs-library
- **What it does:** Stores all source code, tracks changes with version control, triggers automatic deployments to Vercel on push
- **Plan:** Free
- **Cost:** $0
- **Account:** sarahcodeswell

---

## Database & Backend

### Supabase
- **URL:** https://supabase.com/dashboard
- **What it does:** PostgreSQL database for all app data (users, books, recommendations), handles user authentication (magic links, OAuth), provides file storage, runs edge functions
- **Plan:** Pro
- **Cost:** $25/month
- **Project URL:** https://lxqjzrxqoqvxqxqxqxqx.supabase.co
- **Custom Auth Domain:** auth.sarahsbooks.com
- **Account:** _(add your login email)_

---

## Domain & DNS

### Amazon Route53
- **URL:** https://console.aws.amazon.com/route53
- **What it does:** Manages DNS records for sarahsbooks.com, routes traffic to Vercel and Supabase, handles subdomain configuration (auth.sarahsbooks.com)
- **Plan:** Pay-as-you-go
- **Cost:** ~$0.50-1/month (based on queries)
- **Account:** _(add your AWS account)_

### Domain Registrar
- **Registrar:** _(add registrar name - e.g., Namecheap, GoDaddy)_
- **What it does:** Owns the sarahsbooks.com domain name
- **Cost:** ~$12-15/year
- **Domain:** sarahsbooks.com
- **Renewal Date:** _(add date)_

---

## Authentication Providers

### Google Cloud Console
- **URL:** https://console.cloud.google.com
- **What it does:** Provides "Sign in with Google" OAuth credentials, also hosts Google Books API
- **Plan:** Free tier
- **Cost:** $0
- **Project:** _(add project name)_
- **Account:** sarah@darkridge.com

### Apple Developer
- **URL:** https://developer.apple.com
- **What it does:** Provides "Sign in with Apple" OAuth credentials for iOS-style authentication
- **Plan:** Developer Program
- **Cost:** $99/year
- **Team ID:** YH78GR6773
- **Services ID:** com.sarahsbooks.web.auth
- **Key ID:** ZDWKBQ27KV
- **Account:** _(add Apple ID)_

---

## Analytics & Monitoring

### Google Analytics (GA4)
- **URL:** https://analytics.google.com
- **What it does:** Tracks website visitors, page views, user behavior, traffic sources, and conversion events
- **Plan:** Free
- **Cost:** $0
- **Measurement ID:** G-WTK5C80YC1
- **Account:** sarah@darkridge.com

### Sentry
- **URL:** https://sentry.io
- **What it does:** Captures JavaScript errors in production, provides stack traces and user context for debugging, alerts on new issues
- **Plan:** Developer (Free)
- **Cost:** $0 (5K errors/month)
- **DSN:** _(stored in Vercel env vars as VITE_SENTRY_DSN)_
- **Account:** _(add login email)_
- **Recommendation Monitoring Alerts:**
  - `Catalog returned 0 books for theme` - Data gap, need to tag more books
  - `Recommendation fell back to Claude` - Hallucination risk when catalog is thin
  - `Book enrichment failed - possible hallucination` - Claude may have invented a book title

### UptimeRobot
- **URL:** https://uptimerobot.com
- **What it does:** Pings your site every 5 minutes, sends email alerts if the site goes down, tracks uptime history
- **Plan:** Free
- **Cost:** $0 (50 monitors)
- **Monitors:**
  - Main site: `https://www.sarahsbooks.com`
  - Auth domain: `https://auth.sarahsbooks.com`
  - API ping: `https://www.sarahsbooks.com/api/ping`
- **Account:** sarah@darkridge.com

---

## Privacy & Compliance

### Termly
- **URL:** https://app.termly.io
- **What it does:** Displays cookie consent banner, generates and hosts Privacy Policy and Terms of Use, handles GDPR/CCPA compliance
- **Plan:** Free
- **Cost:** $0 (1 website, basic features)
- **Script ID:** 54f19761-4391-433d-8c4f-a7127e19050f
- **Account:** _(add login email)_

---

## APIs & Integrations

### OpenAI
- **URL:** https://platform.openai.com
- **What it does:** Powers AI chat for book recommendations, generates embeddings for semantic search, processes natural language queries
- **Plan:** Pay-as-you-go
- **Cost:** ~$10-50/month (depends on usage)
- **API Key:** _(stored in Vercel/Supabase env vars)_
- **Account:** _(add login email)_

### Anthropic
- **URL:** https://console.anthropic.com
- **What it does:** Alternative AI provider for book recommendations using Claude models
- **Plan:** Pay-as-you-go
- **Cost:** Included in OpenAI estimate above
- **API Key:** _(stored in Vercel env vars)_
- **Account:** _(add login email)_

### Google Books API
- **URL:** https://console.cloud.google.com
- **What it does:** Fetches book metadata (titles, authors, descriptions, covers, ISBNs) from Google's book database
- **Plan:** Free tier
- **Cost:** $0 (1,000 requests/day free)
- **API Key:** _(stored in env vars)_

### Open Library
- **URL:** https://openlibrary.org
- **What it does:** Fallback source for book metadata when Google Books doesn't have data, provides cover images
- **Plan:** Public API
- **Cost:** $0
- **API Key:** None required

---

## Email

### Resend (Transactional Emails)
- **URL:** https://resend.com/overview
- **What it does:** Sends branded transactional emails (waitlist confirmations, beta signups, curator notes, daily digest)
- **Plan:** Free tier
- **Cost:** $0 (3,000 emails/month, 100/day)
- **From Address:** hello@sarahsbooks.com (requires domain verification)
- **Account:** _(add login email)_
- **Env Vars:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- **Email Types:**
  - Curator waitlist confirmation
  - Beta tester (Read with Friends) confirmation
  - Curator personal notes (from Admin Dashboard)
  - Daily admin digest
  - Product updates (future)

### Supabase Auth Emails
- **Configured in:** Supabase Dashboard → Auth → Email Templates
- **What it does:** Magic link sign-in, email confirmation, password reset
- **Custom SMTP:** Can be configured in Supabase for branded auth emails
- **Templates customized:** Yes (branded HTML templates)

---

## Caching & Rate Limiting

### Upstash Redis
- **URL:** https://console.upstash.com
- **What it does:** Distributed rate limiting to prevent API abuse, ensures rate limits work across multiple serverless instances
- **Plan:** Free tier
- **Cost:** $0 (10K requests/day free)
- **Database:** `sarahs-books-rate-limit`
- **Region:** us-east-1
- **Account:** sarah@darkridge.com
- **Env Vars:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

---

## Environment Variables

All sensitive keys are stored in **Vercel Environment Variables**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SENTRY_DSN`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_BOOKS_API_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

---

## Notes

- **Password Manager:** Store all credentials in a secure password manager (1Password, Bitwarden, etc.)
- **2FA:** Enable two-factor authentication on all accounts where available
- **Backup Contacts:** Consider adding a backup admin email for critical services
- **Cost Optimization:** Monitor OpenAI usage - this is the main variable cost

---

*Last updated: January 8, 2026*
