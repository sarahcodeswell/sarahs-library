# Sarah's Books - Services & Logins

A comprehensive list of all external services, tools, and accounts required to run Sarah's Books.

---

## Hosting & Deployment

### Vercel (Pro)
- **URL:** https://vercel.com/dashboard
- **Purpose:** Hosting, deployments, edge functions, domain management
- **Account:** sarah@darkridge.com
- **Project:** sarahs-library
- **Domain:** www.sarahsbooks.com

### GitHub
- **URL:** https://github.com/sarahcodeswell/sarahs-library
- **Purpose:** Source code repository, version control
- **Account:** sarahcodeswell

---

## Database & Backend

### Supabase (Pro)
- **URL:** https://supabase.com/dashboard
- **Purpose:** PostgreSQL database, authentication, storage, edge functions
- **Project URL:** https://lxqjzrxqoqvxqxqxqxqx.supabase.co
- **Custom Auth Domain:** auth.sarahsbooks.com
- **Account:** _(add your login email)_

---

## Domain & DNS

### Amazon Route53
- **URL:** https://console.aws.amazon.com/route53
- **Purpose:** DNS management for sarahsbooks.com
- **Account:** _(add your AWS account)_

### Domain Registrar
- **Registrar:** _(add registrar name - e.g., Namecheap, GoDaddy)_
- **Domain:** sarahsbooks.com
- **Renewal Date:** _(add date)_

---

## Authentication Providers

### Google Cloud Console
- **URL:** https://console.cloud.google.com
- **Purpose:** Google OAuth for sign-in
- **Project:** _(add project name)_
- **Account:** sarah@darkridge.com

### Apple Developer
- **URL:** https://developer.apple.com
- **Purpose:** Apple Sign-In OAuth
- **Team ID:** YH78GR6773
- **Services ID:** com.sarahsbooks.web.auth
- **Key ID:** ZDWKBQ27KV
- **Account:** _(add Apple ID)_

---

## Analytics & Monitoring

### Google Analytics (GA4)
- **URL:** https://analytics.google.com
- **Purpose:** Website traffic analytics
- **Measurement ID:** G-Y1LG6YHEPC
- **Account:** _(add login email)_

### Sentry
- **URL:** https://sentry.io
- **Purpose:** Error tracking and monitoring
- **DSN:** _(stored in Vercel env vars as VITE_SENTRY_DSN)_
- **Account:** _(add login email)_

### UptimeRobot _(to be set up)_
- **URL:** https://uptimerobot.com
- **Purpose:** Uptime monitoring, downtime alerts
- **Monitor URL:** https://www.sarahsbooks.com
- **Account:** _(add after setup)_

---

## Privacy & Compliance

### Termly
- **URL:** https://app.termly.io
- **Purpose:** Cookie consent banner, privacy policy management
- **Script ID:** 54f19761-4391-433d-8c4f-a7127e19050f
- **Account:** _(add login email)_

---

## APIs & Integrations

### OpenAI
- **URL:** https://platform.openai.com
- **Purpose:** AI-powered book recommendations, chat
- **API Key:** _(stored in Vercel/Supabase env vars)_
- **Account:** _(add login email)_

### Google Books API
- **URL:** https://console.cloud.google.com
- **Purpose:** Book metadata, covers, descriptions
- **API Key:** _(stored in env vars)_

### Open Library
- **URL:** https://openlibrary.org
- **Purpose:** Fallback book metadata
- **API Key:** None required (public API)

---

## Email _(to be configured)_

### Custom SMTP
- **Provider:** _(to be selected - e.g., Resend, Postmark, SendGrid)_
- **Purpose:** Branded transactional emails (magic links, notifications)
- **Status:** Pending setup

---

## Caching _(to be configured)_

### Upstash
- **URL:** https://upstash.com
- **Purpose:** Redis caching, rate limiting
- **Status:** Pending enrollment

---

## Environment Variables

All sensitive keys are stored in **Vercel Environment Variables**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SENTRY_DSN`
- `OPENAI_API_KEY`
- `GOOGLE_BOOKS_API_KEY`
- _(others as needed)_

---

## Notes

- **Password Manager:** Store all credentials in a secure password manager (1Password, Bitwarden, etc.)
- **2FA:** Enable two-factor authentication on all accounts where available
- **Backup Contacts:** Consider adding a backup admin email for critical services

---

*Last updated: January 8, 2026*
