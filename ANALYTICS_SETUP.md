# Analytics Setup Guide

## ✅ What's Been Done

1. **Created Analytics Schema** (`supabase/migrations/001_analytics_schema.sql`)
   - 5 analytics tables to track user interactions
   - Row Level Security (RLS) policies
   - Admin analytics view
   - Indexes for performance

2. **Created Analytics API Endpoint** (`api/analytics.js`)
   - Serverless function to collect analytics data
   - Routes events to appropriate tables
   - Uses service role key for secure writes

3. **Already Implemented Client-Side Tracking**
   - All tracking events are already firing via Vercel Analytics
   - Events include: saves, expansions, clicks, searches, sessions

## 🚀 Next Steps

### Step 1: Run the Database Migration

**Option A: Using Supabase Dashboard (Recommended)**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/001_analytics_schema.sql`
5. Paste and click **Run**
6. Verify success (should see "Success. No rows returned")

**Option B: Using Supabase CLI**
```bash
# If you have Supabase CLI installed
supabase db push
```

### Step 2: Add Service Role Key to Environment

1. In Supabase Dashboard, go to **Settings** → **API**
2. Copy your **service_role** key (keep this secret!)
3. Add to Vercel environment variables:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `SUPABASE_SERVICE_ROLE_KEY` = `your_service_role_key`
4. Redeploy your app for the env var to take effect

### Step 3: Verify Tables Were Created

Run this query in Supabase SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_events',
  'book_interactions', 
  'search_queries',
  'theme_interactions',
  'user_sessions'
)
ORDER BY table_name;
```

You should see all 5 tables listed.

### Step 4: Test Analytics Collection

After deploying with the service role key:

1. Visit your app
2. Interact with it (save a book, expand a card, search, etc.)
3. Check Supabase Dashboard → **Table Editor**
4. Look at the `book_interactions` table
5. You should see new rows appearing!

## 📊 What Data Gets Collected

### Book Interactions
- When users save books
- When users expand recommendation cards
- When users click Buy/Reviews/Share buttons
- Source (recommendation vs collection page)
- Chat mode (library vs discover)

### Search & Navigation
- Collection page searches
- Alphabet navigation clicks
- Theme filter selections/removals

### Session Data
- Session start/end times
- Session duration
- Screen size
- User agent

## 🔒 Privacy & Security

- **Row Level Security (RLS)** enabled on all tables
- Users can only view their own data
- Analytics API uses service role (server-side only)
- No PII stored beyond user_id (which is hashed)
- Anonymous users tracked with session_id only

## 📈 Using the Data

### Query Examples

**Most saved books:**
```sql
SELECT book_title, book_author, COUNT(*) as save_count
FROM book_interactions
WHERE interaction_type = 'save'
GROUP BY book_title, book_author
ORDER BY save_count DESC
LIMIT 20;
```

**Most popular themes:**
```sql
SELECT theme_key, COUNT(*) as selection_count
FROM theme_interactions
WHERE action = 'selected'
GROUP BY theme_key
ORDER BY selection_count DESC;
```

**User engagement metrics:**
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as active_users,
  COUNT(*) as total_interactions
FROM book_interactions
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Average session duration:**
```sql
SELECT AVG(duration_seconds) / 60 as avg_minutes
FROM user_sessions
WHERE duration_seconds IS NOT NULL;
```

## 🎯 Next Phase: Admin Dashboard

Once data is collecting, we'll build an admin dashboard at `/admin` that shows:
- Daily active users
- Most saved books
- Popular themes
- Search patterns
- Session metrics
- Recommendation quality indicators

This dashboard will be restricted to `sarah@darkridge.com`.

## 🎤 Future: Voice Annotation

After analytics is working, we'll add:
- Voice recording interface for curator notes
- Storage in Supabase Storage
- Transcription via OpenAI Whisper API
- Structured data extraction for training

## 🐛 Troubleshooting

**Analytics not collecting?**
- Check Vercel logs for API errors
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check Supabase logs in Dashboard → Logs

**Tables not created?**
- Re-run the migration SQL
- Check for error messages in SQL Editor
- Verify you have proper permissions

**RLS blocking writes?**
- The API uses service role which bypasses RLS
- Client-side code should NOT write directly to these tables

## 📝 Notes

- The analytics API endpoint is at `/api/analytics`
- Currently, Vercel Analytics is collecting the data
- Once Supabase is set up, we can dual-track or migrate fully
- All tracking code is already in place and working
