# Regression Test Checklist - January 7, 2026

## Recent Changes Summary
- Redesigned How it Works page (4 steps, transparent visual)
- Fixed rating persistence (RLS policies + SECURITY DEFINER)
- Reordered footer navigation
- Improved mobile UX
- Integrated Read with Friends into Share section
- Updated Recommend button to one-way sharing with shareable links

## Critical User Flows to Test

### 1. Authentication
- [ ] Sign in with Google SSO
- [ ] Sign out
- [ ] Auth state persists across page refresh
- [ ] Protected routes redirect to auth when not logged in

### 2. Home Page / Chat Interface
- [ ] Theme buttons display and are clickable
- [ ] Chat input accepts text
- [ ] Recommendations load after query
- [ ] Book cards display properly
- [ ] "Show me more" pagination works
- [ ] New search clears previous results

### 3. My Collection Page
- [ ] Books display with ratings
- [ ] Rating hearts are clickable
- [ ] **CRITICAL**: Ratings persist after page refresh
- [ ] Search/filter by letter works
- [ ] Filter by rating works
- [ ] Recommend button generates shareable link
- [ ] Remove book works

### 4. My Reading Queue
- [ ] Books display in correct status sections
- [ ] Status changes work (Want to Read → Reading → Finished)
- [ ] Remove from queue works
- [ ] Books move to My Collection when marked Finished

### 5. My Books (Upload)
- [ ] CSV upload works
- [ ] Manual book entry works
- [ ] Books appear in collection after upload

### 6. How it Works Page
- [ ] Visual displays correctly (transparent background, 4 icons with arrows)
- [ ] All 4 sections display: Discover, Collect, Share, Curate
- [ ] Buttons work (Browse Curator Themes, Add books, Invite Friend, etc.)
- [ ] Read with Friends promo appears in Share section
- [ ] Mobile layout is responsive

### 7. Footer Navigation
- [ ] Links in correct order: Our Mission, Shop, Our Practices, Privacy, Terms, Contact
- [ ] All links navigate correctly
- [ ] Footer displays on all pages

### 8. Informational Pages
- [ ] Our Mission loads
- [ ] Our Practices loads
- [ ] Shop loads
- [ ] Privacy Policy loads
- [ ] Terms of Use loads
- [ ] Meet Sarah loads
- [ ] Curator Themes loads

### 9. Mobile Responsiveness
- [ ] Home page mobile layout
- [ ] My Collection mobile layout
- [ ] How it Works mobile layout (buttons not pushed off screen)
- [ ] Navigation menu works on mobile
- [ ] Footer wraps properly on mobile

### 10. Shareable Recommendations
- [ ] Recommend button creates shareable link
- [ ] Modal displays link with copy button
- [ ] Copy to clipboard works
- [ ] Shared link loads for recipient (one-way sharing)

## Console Errors to Check
- [ ] No errors on Home page
- [ ] No errors on My Collection
- [ ] No errors on My Reading Queue
- [ ] No errors on How it Works
- [ ] No 403 Forbidden errors on rating changes
- [ ] No RLS policy errors

## Database Migrations Applied
- [x] 036_fix_reading_queue_rls.sql - Fixed INSERT permissions
- [x] 037_fix_exclusion_view_trigger.sql - Fixed SECURITY DEFINER for trigger

## Known Non-Issues
- Google SSO telemetry errors (ERR_BLOCKED_BY_CLIENT) - harmless, caused by ad blockers

## Issues Found
_To be filled in during testing_

## Test Results
_To be filled in during testing_
