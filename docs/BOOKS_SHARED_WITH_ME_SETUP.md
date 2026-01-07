# Books Shared with Me - Setup & Deployment Guide

## 📋 Quick Setup Checklist

### 1. Run Database Migration ✅

**Go to Supabase Dashboard → SQL Editor → New Query**

Paste and run this SQL:

```sql
-- Create received_recommendations table for tracking books shared with users
CREATE TABLE IF NOT EXISTS received_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shared_recommendation_id UUID REFERENCES shared_recommendations(id) ON DELETE CASCADE NOT NULL,
  recommender_name TEXT NOT NULL,
  book_title TEXT NOT NULL,
  book_author TEXT,
  book_isbn TEXT,
  book_description TEXT,
  recommendation_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  added_to_queue_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_received_recommendations_recipient ON received_recommendations(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_received_recommendations_status ON received_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_received_recommendations_received_at ON received_recommendations(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_received_recommendations_shared_rec ON received_recommendations(shared_recommendation_id);
CREATE INDEX IF NOT EXISTS idx_received_recommendations_recipient_status ON received_recommendations(recipient_user_id, status);

-- Enable Row Level Security
ALTER TABLE received_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own received recommendations"
  ON received_recommendations FOR SELECT
  USING (auth.uid() = recipient_user_id);

CREATE POLICY "Users can create own received recommendations"
  ON received_recommendations FOR INSERT
  WITH CHECK (auth.uid() = recipient_user_id);

CREATE POLICY "Users can update own received recommendations"
  ON received_recommendations FOR UPDATE
  USING (auth.uid() = recipient_user_id);

CREATE POLICY "Users can delete own received recommendations"
  ON received_recommendations FOR DELETE
  USING (auth.uid() = recipient_user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_received_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_received_recommendations_updated_at
  BEFORE UPDATE ON received_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_received_recommendations_updated_at();

-- Add columns to reading_queue to preserve recommendation context
ALTER TABLE reading_queue 
  ADD COLUMN IF NOT EXISTS recommended_by TEXT,
  ADD COLUMN IF NOT EXISTS recommendation_note TEXT,
  ADD COLUMN IF NOT EXISTS received_recommendation_id UUID REFERENCES received_recommendations(id) ON DELETE SET NULL;

-- Index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_reading_queue_received_rec ON reading_queue(received_recommendation_id);
```

**Verify Migration Success:**
```sql
-- Check table exists
SELECT * FROM received_recommendations LIMIT 1;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'received_recommendations';

-- Check policies exist
SELECT policyname FROM pg_policies 
WHERE tablename = 'received_recommendations';
```

---

### 2. Install Test Dependencies (Optional) ✅

```bash
npm install --save-dev jest @jest/globals
```

---

### 3. Run Automated Tests (Optional) ✅

```bash
# Run the test suite
npm run test:shared

# Run with coverage report
npm run test:shared:coverage
```

---

### 4. Build & Deploy ✅

```bash
# Build the application
npm run build

# Commit changes
git add -A
git commit -m "Add Books Shared with Me feature with inbox, accept/decline actions, and notification badges"

# Deploy to production
git push origin main
```

---

## 🧪 Manual Testing Workflow

### Test Scenario 1: Share and Receive Flow

**As User A (Sharer):**
1. Sign in to www.sarahsbooks.com
2. Navigate to "Books I've Shared" (hamburger menu)
3. Click "Share New Book"
4. Fill in book details and personal note
5. Click "Generate Share Link"
6. Copy the share URL (e.g., `www.sarahsbooks.com/r/abc123xyz`)

**As User B (Recipient):**
1. Open the share URL in browser
2. Sign in (or sign up if new user)
3. Verify the recommendation page displays:
   - Book title and author
   - Recommender's name
   - Personal note from recommender
4. Navigate to "Books Shared with Me" (hamburger menu)
5. Verify recommendation appears in **Pending** tab
6. Verify notification badge shows count

---

### Test Scenario 2: Accept Recommendation

**As User B:**
1. Go to "Books Shared with Me"
2. Click **Pending** tab
3. Find the test recommendation
4. Click "Add to Queue" button
5. Verify recommendation moves to **Accepted** tab
6. Navigate to "My Queue"
7. Verify book appears with:
   - Recommender name displayed
   - Original recommendation note preserved
8. Verify notification badge decremented

---

### Test Scenario 3: Decline Recommendation

**As User B:**
1. Go to "Books Shared with Me"
2. Click **Pending** tab
3. Find a recommendation
4. Click "Decline" button
5. Verify recommendation moves to **Declined** tab
6. Verify notification badge decremented
7. In **Declined** tab, verify can still "Add to Queue" if changed mind

---

### Test Scenario 4: Notification Badge

**As User B:**
1. Have multiple pending recommendations
2. Check hamburger menu
3. Verify "Books Shared with Me" shows dusty rose badge with count
4. Accept or decline one recommendation
5. Verify badge count updates immediately

---

## 🔍 Verification Queries

Run these in Supabase SQL Editor to verify data:

```sql
-- Check received recommendations for a user
SELECT 
  r.book_title,
  r.recommender_name,
  r.status,
  r.received_at,
  r.added_to_queue_at
FROM received_recommendations r
WHERE recipient_user_id = 'USER_ID_HERE'
ORDER BY received_at DESC;

-- Count by status
SELECT 
  status,
  COUNT(*) as count
FROM received_recommendations
WHERE recipient_user_id = 'USER_ID_HERE'
GROUP BY status;

-- Check reading queue entries with recommendation context
SELECT 
  rq.book_title,
  rq.recommended_by,
  rq.recommendation_note,
  rq.status
FROM reading_queue rq
WHERE user_id = 'USER_ID_HERE'
  AND recommended_by IS NOT NULL;
```

---

## 📊 Database Schema

### New Table: `received_recommendations`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `recipient_user_id` | UUID | User who received the recommendation |
| `shared_recommendation_id` | UUID | Reference to shared_recommendations |
| `recommender_name` | TEXT | Name of person who recommended |
| `book_title` | TEXT | Book title |
| `book_author` | TEXT | Book author |
| `book_isbn` | TEXT | ISBN if available |
| `book_description` | TEXT | Book description |
| `recommendation_note` | TEXT | Personal note from recommender |
| `status` | TEXT | 'pending', 'accepted', 'declined', 'archived' |
| `added_to_queue_at` | TIMESTAMPTZ | When accepted |
| `declined_at` | TIMESTAMPTZ | When declined |
| `archived_at` | TIMESTAMPTZ | When archived |
| `received_at` | TIMESTAMPTZ | When first viewed |
| `created_at` | TIMESTAMPTZ | Record creation time |
| `updated_at` | TIMESTAMPTZ | Last update time |

### Enhanced Table: `reading_queue`

**New Columns:**
- `recommended_by` (TEXT) - Name of recommender
- `recommendation_note` (TEXT) - Original recommendation note
- `received_recommendation_id` (UUID) - Link to received_recommendations

---

## 🎯 Feature Highlights

### For Recipients:
✅ **Inbox for all recommendations** - Never lose track of books friends share  
✅ **Accept/Decline actions** - Control what goes in your queue  
✅ **Full history** - See all recommendations ever received  
✅ **Context preserved** - Know who recommended and why  
✅ **Notification badges** - See pending count at a glance  

### For Sharers:
✅ **Same sharing flow** - No changes to existing workflow  
✅ **Track acceptance** - See when recommendations are accepted  
✅ **View counts** - Know how many people viewed your share  

---

## 🚀 Production Deployment

After successful testing:

1. **Verify migration ran successfully** in production Supabase
2. **Deploy frontend** via Git push to main
3. **Monitor Sentry** for any errors
4. **Check analytics** for feature adoption

---

## 🐛 Troubleshooting

### Issue: "Table does not exist"
**Solution:** Run the migration script in Supabase SQL Editor

### Issue: "RLS policy violation"
**Solution:** Verify RLS policies were created correctly:
```sql
SELECT * FROM pg_policies WHERE tablename = 'received_recommendations';
```

### Issue: Notification badge not updating
**Solution:** Check browser console for errors, verify context provider is wrapped correctly

### Issue: Duplicate inbox entries
**Solution:** The system prevents duplicates automatically. Check `checkReceivedRecommendationExists` function

---

## 📞 Support

For issues or questions:
- Check test suite output for specific errors
- Review Supabase logs for database errors
- Check browser console for frontend errors
- Review Sentry for production errors
