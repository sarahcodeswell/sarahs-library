# Books Shared with Me - Testing Guide

## Overview
This test suite validates the complete "Books Shared with Me" feature workflow, including:
- Creating and sharing recommendations
- Auto-inbox creation when viewing share links
- Accept/Decline actions
- Status tracking and history
- RLS security policies

## Prerequisites

### 1. Install Dependencies
```bash
npm install --save-dev @jest/globals @supabase/supabase-js
```

### 2. Configure Environment Variables
Create a `.env.test` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Database Migration
Execute the migration script in your Supabase SQL Editor:
- File: `/supabase/migrations/035_received_recommendations.sql`
- Or copy the SQL from the section below

## Running Tests

### Run All Tests
```bash
npm test tests/booksSharedWithMe.test.js
```

### Run with Coverage
```bash
npm test -- --coverage tests/booksSharedWithMe.test.js
```

### Run Specific Test Suite
```bash
npm test -- --testNamePattern="Accept Recommendation"
```

## Test Coverage

The test suite covers:

### ✅ 1. Create and Share Recommendation
- Creates a book recommendation as User 1
- Generates a shareable link with token

### ✅ 2. View Shared Link and Auto-Inbox Creation
- Retrieves shared recommendation by token
- Auto-creates inbox entry for User 2
- Prevents duplicate inbox entries

### ✅ 3. Fetch Received Recommendations
- Fetches all received recommendations
- Filters by status (pending/accepted/declined)

### ✅ 4. Accept Recommendation
- Updates status to 'accepted'
- Sets `added_to_queue_at` timestamp
- Verifies persistence

### ✅ 5. Decline Recommendation
- Updates status to 'declined'
- Sets `declined_at` timestamp

### ✅ 6. Count and Badge Logic
- Counts recommendations by status
- Validates notification badge logic

### ✅ 7. Delete Recommendation
- Deletes a received recommendation
- Verifies deletion

### ✅ 8. RLS Security Tests
- Prevents cross-user access
- Prevents unauthenticated access

## Manual Testing Checklist

In addition to automated tests, perform these manual UI tests:

### User Flow 1: Share and Receive
1. ✅ Sign in as User A
2. ✅ Create a book recommendation
3. ✅ Generate share link
4. ✅ Copy share URL
5. ✅ Sign out
6. ✅ Sign in as User B
7. ✅ Paste share URL in browser
8. ✅ Verify inbox entry auto-created
9. ✅ Navigate to "Books Shared with Me"
10. ✅ Verify recommendation appears in "Pending" tab
11. ✅ Verify notification badge shows count

### User Flow 2: Accept Recommendation
1. ✅ Click "Add to Queue" on pending recommendation
2. ✅ Verify it moves to "Accepted" tab
3. ✅ Navigate to "My Queue"
4. ✅ Verify book appears with recommender info
5. ✅ Verify notification badge decrements

### User Flow 3: Decline Recommendation
1. ✅ Click "Decline" on pending recommendation
2. ✅ Verify it moves to "Declined" tab
3. ✅ Verify notification badge decrements
4. ✅ Verify can still "Add to Queue" from declined tab

### User Flow 4: Delete Recommendation
1. ✅ Click delete icon on any recommendation
2. ✅ Confirm deletion
3. ✅ Verify recommendation removed from list

## Expected Results

### Database State After Tests
- `received_recommendations` table populated
- Proper status transitions (pending → accepted/declined)
- Timestamps set correctly
- RLS policies enforced

### UI State After Tests
- Notification badges show correct counts
- Tabs filter correctly by status
- Actions update UI immediately
- No cross-user data leakage

## Troubleshooting

### Test Fails: "User already registered"
- Tests automatically handle existing users
- If issues persist, manually delete test users from Supabase Auth

### Test Fails: RLS Policy Error
- Verify migration ran successfully
- Check RLS policies are enabled on `received_recommendations` table

### Test Fails: Foreign Key Constraint
- Ensure `shared_recommendations` table exists
- Verify test recommendation was created successfully

## Cleanup

After testing, you may want to clean up test data:

```sql
-- Delete test users' received recommendations
DELETE FROM received_recommendations 
WHERE recipient_user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE 'test-%@example.com'
);

-- Delete test users' shared recommendations
DELETE FROM user_recommendations 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE 'test-%@example.com'
);
```

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run Books Shared with Me Tests
  run: npm test tests/booksSharedWithMe.test.js
  env:
    VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```
