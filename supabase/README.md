# Supabase Setup for Sarah's Books

## Overview
This directory contains database migrations and setup instructions for the Supabase backend.

## Database Schema

### Existing Tables
1. **taste_profiles** - User taste preferences and liked books
2. **reading_queue** - User's saved books and reading list

### Analytics Tables (New)
1. **user_events** - Generic event tracking
2. **book_interactions** - Book-specific interactions (saves, clicks, expansions)
3. **search_queries** - Search and filter usage
4. **theme_interactions** - Theme filter selections
5. **user_sessions** - Session tracking with duration

## Setup Instructions

### 1. Run Database Migrations

**Performance Optimization (Required):**
In your Supabase dashboard:
1. Go to SQL Editor
2. Copy the contents of `migrations/001_add_indexes.sql`
3. Run the SQL script

This adds critical indexes for:
- Faster reading queue queries
- Optimized user profile lookups
- Better query performance at scale

**Analytics Schema (Optional):**
If you want analytics tracking:
1. Go to SQL Editor
2. Copy the contents of `migrations/001_analytics_schema.sql`
3. Run the SQL script

Or using Supabase CLI:
```bash
supabase db push
```

### 2. Set Environment Variables

Add to your `.env` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Important:** The `SUPABASE_SERVICE_ROLE_KEY` is needed for the analytics API endpoint to write data. Keep this secret and never expose it to the client.

### 3. Verify Tables

Run this query in Supabase SQL Editor to verify tables were created:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see:
- book_interactions
- reading_queue
- search_queries
- taste_profiles
- theme_interactions
- user_events
- user_sessions

## Analytics Events Being Tracked

### Book Interactions
- `recommendation_saved` - User saves a book to reading queue
- `recommendation_expanded` - User expands a recommendation card
- `buy_dropdown_opened` - User opens buy options
- `goodreads_link_click` - User clicks Goodreads link
- `bookshop_link_click` - User clicks Bookshop link
- `share_recommendation` - User shares a book
- `collection_book_expanded` - User expands a book in collection

### Theme Interactions
- `theme_filter_selected` - User selects a theme filter
- `theme_filter_removed` - User removes a theme filter

### Search & Navigation
- `collection_search` - User searches collection
- `alphabet_navigation_click` - User clicks alphabet navigation

### Session Tracking
- `session_start` - User starts a session
- `session_end` - User ends a session (with duration)

## Admin Dashboard

The `admin_analytics` view provides aggregated data for the admin dashboard.

Access restricted to: `sarah@darkridge.com`

## Data Privacy

- All tables have Row Level Security (RLS) enabled
- Users can only view their own data
- Analytics API uses service role for write access
- No personally identifiable information is stored beyond user_id

## Future Enhancements

1. Voice annotation storage for curator notes
2. Recommendation quality feedback
3. A/B testing framework
4. Cohort analysis views
