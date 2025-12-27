# Profile Features Regression Test Checklist

## Test Environment Setup
- [ ] Clear browser cache and local storage
- [ ] Open browser console (F12) to monitor errors
- [ ] Test with fresh login (sign out and sign back in)
- [ ] Verify Supabase connection is active

## 1. Profile Photo Upload
### Pre-conditions
- [ ] User is logged in
- [ ] Navigate to Profile page
- [ ] Verify storage bucket exists in Supabase: `profile-photos`
- [ ] Verify RLS policies are active on storage.objects

### Test Cases
- [ ] Upload image < 5MB (should succeed)
  - Expected: Photo displays, success message in green
  - Check: Supabase Storage > profile-photos bucket for file
  - Check: taste_profiles.profile_photo_url is populated
- [ ] Upload image > 5MB (should fail gracefully)
  - Expected: Error message "Image must be less than 5MB"
- [ ] Upload non-image file (should fail)
  - Expected: Error message "Please upload an image file"
- [ ] Console errors to check:
  - Storage upload errors
  - RLS policy violations
  - Network errors

### Debug Points
- Check: `taste_profiles` table has `profile_photo_url` column
- Check: User has INSERT/UPDATE permissions on taste_profiles
- Check: Storage bucket is public for reads
- Check: File path format: `{user_id}/{timestamp}.{ext}`

## 2. Reading Preferences Save
### Pre-conditions
- [ ] User is logged in
- [ ] Navigate to Profile page
- [ ] Verify auth.users table allows user_metadata updates

### Test Cases
- [ ] Enter text in Reading Preferences field
- [ ] Click "Save Preferences"
  - Expected: "Saved successfully!" in green
  - Check: Refresh page - text should persist
  - Check: auth.users.raw_user_meta_data contains reading_preferences
- [ ] Save empty preferences (should show error)
  - Expected: "Please enter your reading preferences"

### Debug Points
- Check: `updateUserMetadata` function exists in UserContext
- Check: Supabase auth.updateUser() succeeds
- Check: Local user state updates after save
- Console log: user.user_metadata.reading_preferences value

## 3. Favorite Authors
### Pre-conditions
- [ ] User is logged in
- [ ] Navigate to Profile page
- [ ] Verify taste_profiles has favorite_authors column

### Test Cases
- [ ] Add author name, click + button
  - Expected: Author appears as tag, "Author added!" in green
  - Check: taste_profiles.favorite_authors array updated
- [ ] Try to add duplicate author
  - Expected: "Author already in your favorites"
- [ ] Remove author by clicking X
  - Expected: Author removed, no error
- [ ] Add multiple authors
  - Expected: All appear, recommendation algorithm boosts them

### Debug Points
- Check: upsertTasteProfile includes favorite_authors field
- Check: Recommendations show +25 boost for favorite authors

## 4. User Stats Display
### Pre-conditions
- [ ] User has books in reading_queue with various statuses
- [ ] User has created recommendations

### Test Cases
- [ ] Collection count
  - Expected: Count of reading_queue items with status='finished'
  - Verify: SELECT COUNT(*) FROM reading_queue WHERE user_id='...' AND status='finished'
- [ ] Reading Queue count
  - Expected: Count of items with status='want_to_read' OR status='reading'
  - Verify: SELECT COUNT(*) FROM reading_queue WHERE user_id='...' AND status IN ('want_to_read', 'reading')
- [ ] Shared count
  - Expected: Count from user_recommendations table
  - Verify: SELECT COUNT(*) FROM user_recommendations WHERE user_id='...'

### Debug Points
- Check: loadStats() function queries correct tables
- Check: Status filtering matches My Collection page logic
- Console log: Actual counts vs displayed counts

## 5. Recommendation Algorithm - Exclude Read Books
### Pre-conditions
- [ ] User has books marked as 'finished' in reading_queue
- [ ] User requests recommendations

### Test Cases
- [ ] Request recommendations
  - Expected: NO books with status='finished' appear
  - Check: buildLibraryContext excludes finishedTitles
  - Check: System prompt includes exclusion rules
- [ ] Add book to finished, request again
  - Expected: That book never appears again

### Debug Points
- Check: finishedTitles Set is populated correctly
- Check: Title matching is case-insensitive and trimmed
- Check: Score of -1000 applied to finished books
- Console log: finishedTitles array before scoring

## Common Issues & Solutions

### Photo Upload Fails
1. Check Supabase Storage bucket exists
2. Verify RLS policies on storage.objects
3. Check upsertTasteProfile includes profile_photo_url
4. Verify user.id is valid UUID

### Preferences Don't Persist
1. Check updateUserMetadata exists in UserContext
2. Verify auth.updateUser() returns success
3. Check user.user_metadata updates locally
4. Refresh page to verify persistence

### Stats Show Wrong Counts
1. Verify status values: 'finished', 'want_to_read', 'reading'
2. Check SQL queries match filter logic
3. Console log raw data vs filtered data
4. Verify reading_queue table has correct data

### Claude Recommends Read Books
1. Check finishedBooks filter in buildLibraryContext
2. Verify title matching logic (lowercase, trim)
3. Check score assignment (-1000 for finished)
4. Review system prompt exclusion rules

## Debugging Commands

### Check Database State
```sql
-- Check taste_profiles schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'taste_profiles';

-- Check user's profile
SELECT * FROM taste_profiles WHERE user_id = 'YOUR_USER_ID';

-- Check reading queue
SELECT book_title, status, added_at 
FROM reading_queue 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY added_at DESC;

-- Check storage bucket
SELECT * FROM storage.buckets WHERE name = 'profile-photos';

-- Check storage policies
SELECT * FROM storage.policies WHERE bucket_id = 'profile-photos';
```

### Browser Console Checks
```javascript
// Check user object
console.log('User:', user);
console.log('User metadata:', user?.user_metadata);

// Check taste profile
console.log('Taste profile:', tasteProfile);

// Check reading queue
console.log('Reading queue:', readingQueue);

// Check stats
console.log('Stats:', stats);
```
