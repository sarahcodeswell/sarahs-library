# Upstash Redis Setup for Distributed Rate Limiting

## Why Upstash Redis?

Sarah's Books uses **distributed rate limiting** to protect against abuse at scale. When deployed on Vercel Edge Functions, multiple instances run simultaneously. In-memory rate limiting doesn't work because each instance has its own memory.

Upstash Redis provides:
- ✅ **Serverless-friendly** - Pay per request, no idle costs
- ✅ **Global replication** - Low latency worldwide
- ✅ **REST API** - Works in Edge runtime (no TCP connections)
- ✅ **Free tier** - 10,000 requests/day free

---

## Setup Instructions

### 1. Create Upstash Account

1. Go to [https://upstash.com](https://upstash.com)
2. Sign up with GitHub or email
3. Verify your email

### 2. Create Redis Database

1. Click **"Create Database"**
2. Choose:
   - **Name:** `sarahs-books-rate-limit`
   - **Type:** Regional (cheaper) or Global (faster)
   - **Region:** Choose closest to your users (e.g., `us-east-1`)
3. Click **"Create"**

### 3. Get Connection Details

1. Click on your database
2. Scroll to **"REST API"** section
3. Copy these values:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 4. Add to Vercel Environment Variables

#### Via Vercel Dashboard:
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project: `sarahs-library`
3. Go to **Settings** → **Environment Variables**
4. Add two variables:

```
UPSTASH_REDIS_REST_URL = https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN = your-token-here
```

5. Select **Production**, **Preview**, and **Development**
6. Click **Save**

#### Via Vercel CLI:
```bash
vercel env add UPSTASH_REDIS_REST_URL
# Paste your URL when prompted

vercel env add UPSTASH_REDIS_REST_TOKEN
# Paste your token when prompted
```

### 5. Redeploy

```bash
git push origin main
```

Or trigger a redeploy in Vercel dashboard.

---

## Rate Limits Configured

### Per-Minute Limits (Prevents Spam)
- **Chat API:** 30 requests/minute per user
- **Embeddings API:** 60 requests/minute per user
- **Image Recognition:** 10 requests/minute per user

### Daily Limits (Prevents Cost Overruns)
- **All API calls:** 100 requests/day per user
- Resets at midnight UTC

---

## Fallback Behavior

If Upstash Redis is not configured or unavailable:
- ✅ **Graceful degradation** - Falls back to in-memory rate limiting
- ⚠️ **Warning logged** - "Upstash Redis not configured"
- ✅ **App continues working** - No downtime

**However:** In-memory fallback won't work properly at scale (multiple Edge instances).

---

## Monitoring

### Check Usage
1. Go to Upstash dashboard
2. Click on your database
3. View **Metrics** tab:
   - Daily requests
   - Storage used
   - Response time

### Free Tier Limits
- **10,000 requests/day** free
- **256 MB storage** free
- After that: $0.20 per 100K requests

### Expected Usage
- **1,000 active users:** ~50,000 requests/day = $10/month
- **10,000 active users:** ~500,000 requests/day = $100/month

---

## Testing

### Test Rate Limiting Locally

1. Add to `.env.local`:
```bash
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

2. Make multiple rapid requests:
```bash
# Should succeed
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "test"}]}'

# After 30 requests in 1 minute, should return 429
```

### Verify in Production

Check response headers:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 2026-01-07T10:30:00.000Z
```

---

## Troubleshooting

### "Upstash Redis not configured" Warning
- ✅ Check environment variables are set in Vercel
- ✅ Redeploy after adding variables
- ✅ Check variable names match exactly

### Rate Limiting Not Working
- ✅ Verify Redis is accessible (check Upstash dashboard)
- ✅ Check logs for connection errors
- ✅ Ensure REST API is enabled (not TCP)

### High Costs
- ✅ Monitor daily request count in Upstash
- ✅ Check for abuse patterns (same IP making many requests)
- ✅ Consider lowering rate limits if needed

---

## Security Notes

- ✅ **Never commit** Redis credentials to Git
- ✅ **Use environment variables** only
- ✅ **Rotate tokens** if exposed
- ✅ **Enable IP allowlist** in Upstash (optional, for extra security)

---

## Alternative: Vercel KV

If you prefer Vercel's native solution:

1. Go to Vercel dashboard → **Storage**
2. Create **KV** database
3. Connect to your project
4. Update code to use `@vercel/kv` instead of `@upstash/redis`

**Note:** Vercel KV is built on Upstash Redis, so functionality is identical.

---

## Support

- **Upstash Docs:** [https://docs.upstash.com/redis](https://docs.upstash.com/redis)
- **Upstash Discord:** [https://upstash.com/discord](https://upstash.com/discord)
- **Vercel Support:** [https://vercel.com/support](https://vercel.com/support)
