# Sarah's Books - Referral System Specification

## Overview

The referral system enables users to invite friends and track attribution for viral growth. Referral codes are generated early (at waitlist/beta signup) and persist through the user journey.

## Key Principle: Email-Based Referral Codes

**The email is the consistent identifier across all touchpoints.**

A single referral code is generated per email address, regardless of when or how the user first interacts with Sarah's Books. This ensures:
- No duplicate codes for the same person
- Early attribution (waitlist users can share immediately)
- Seamless linking when they eventually sign up

---

## Database Schema

### `referral_codes` Table

```sql
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,        -- The email this code belongs to
  code TEXT UNIQUE NOT NULL,         -- The referral code (e.g., "CHAPTER7A3")
  user_id UUID,                      -- Linked when user signs up (nullable)
  source TEXT NOT NULL,              -- Where code was generated
  created_at TIMESTAMPTZ,
  linked_at TIMESTAMPTZ              -- When user_id was linked
);
```

### Source Values
| Source | Description |
|--------|-------------|
| `curator_waitlist` | Generated when joining curator waitlist |
| `beta_signup` | Generated when signing up for beta |
| `profile` | Generated when creating taste profile |
| `invite` | Generated when user invites a friend |

### `referrals` Table (existing)

Tracks the actual referral relationships:

```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY,
  inviter_id UUID,           -- Who sent the invite
  invited_email TEXT,        -- Who was invited
  invited_user_id UUID,      -- Linked when invitee signs up
  status TEXT,               -- 'pending' | 'accepted' | 'expired'
  referral_type TEXT,        -- 'email' | 'link'
  created_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
);
```

---

## Code Generation

Referral codes are book-themed for brand consistency:

```javascript
const bookWords = [
  'CHAPTER', 'NOVEL', 'STORY', 'READER', 'PAGES', 'PROSE', 
  'SHELF', 'SPINE', 'COVER', 'WORDS', 'TALES', 'BOOKS',
  'PLOT', 'QUEST', 'SAGA', 'EPIC', 'VERSE', 'INK'
];

// Example output: "CHAPTER7A3", "NOVEL5B2", "STORY9C1"
```

---

## User Journey & Trigger Points

### Scenario 1: Curator Waitlist → Signup → Profile

```
1. User enters email on /become-curator
   └─ referral_codes entry created (source: 'curator_waitlist')
   └─ Code returned in API response
   └─ Confirmation email sent

2. User signs up with same email
   └─ referral_codes.user_id updated
   └─ referral_codes.linked_at set

3. User creates profile
   └─ Existing code found, no new code generated
   └─ taste_profiles.referral_code synced (backward compat)
```

### Scenario 2: Beta Signup → Invite Friends

```
1. User enters email on /read-with-friends
   └─ referral_codes entry created (source: 'beta_signup')
   └─ Confirmation email includes "Invite Friends" CTA

2. User clicks "Invite Friends" in email
   └─ Lands on /invite page (or modal)
   └─ Their referral code is used in invite links
```

### Scenario 3: Existing User Invites Friend

```
1. User clicks "Invite Friends" on About page
   └─ getOrCreateReferralCode() called
   └─ Returns existing code or creates new one
   └─ Invite email sent with ?ref=CODE link

2. Friend clicks link and signs up
   └─ referral_code stored in localStorage
   └─ On signup, /api/record-referral called
   └─ Referral recorded with inviter attribution
```

---

## API Endpoints

### `/api/waitlist/curator` (POST)
- Creates curator waitlist entry
- Generates referral code
- Returns `{ position, referralCode }`

### `/api/waitlist/beta` (POST)
- Creates beta tester entry
- Generates referral code
- Returns `{ position, referralCode }`

### `/api/invite` (POST)
- Sends branded invite email
- Uses inviter's referral code in signup URL
- Records pending referral

### `/api/record-referral` (POST)
- Called on signup when `?ref=CODE` was present
- Links inviter to new user
- Updates referral status to 'accepted'

---

## Utility Functions

Located in `/api/utils/referralCodes.js`:

### `generateReferralCode(identifier)`
Generates a book-themed code from email or user ID.

### `getOrCreateReferralCode(supabase, email, source, userId?)`
- Checks if code exists for email
- Returns existing code or creates new one
- Links user_id if provided

### `lookupReferralCode(supabase, code)`
- Finds inviter by referral code
- Returns `{ inviterId, inviterEmail }`

### `linkUserToReferralCode(supabase, email, userId)`
- Links user_id to existing code on signup

---

## Frontend Integration

### Capturing Referral Codes

In `App.jsx`:
```javascript
const urlParams = new URLSearchParams(window.location.search);
const refCode = urlParams.get('ref');
if (refCode) {
  localStorage.setItem('referral_code', refCode);
  // Clean URL
  window.history.replaceState({}, '', window.location.pathname);
}
```

### Recording on Signup

In `UserContext.jsx`:
```javascript
if (_event === 'SIGNED_IN' || _event === 'SIGNED_UP') {
  const referralCode = localStorage.getItem('referral_code');
  if (referralCode) {
    await fetch('/api/record-referral', {
      method: 'POST',
      body: JSON.stringify({
        referralCode,
        newUserId: session.user.id,
        newUserEmail: session.user.email
      })
    });
    localStorage.removeItem('referral_code');
  }
}
```

---

## Admin Dashboard Analytics

### Metrics Displayed
- **Referrals Sent/Accepted** - Total counts with conversion rate
- **Platform K-Factor** - Viral coefficient (accepted / total users)
- **Top Referrers Leaderboard** - Users ranked by successful referrals

### Data Sources
- `referrals` table for relationship data
- `referral_codes` table for source attribution

---

## Email Integration

### Invite Friends Email
- Sent via Resend (branded template)
- Includes inviter's name and optional personal message
- CTA links to `sarahsbooks.com/?ref=CODE`

### Waitlist/Beta Confirmation Emails
- Include "Invite Friends" CTA
- Link uses the user's newly generated referral code

---

## Migration Notes

### Backward Compatibility
- `taste_profiles.referral_code` still exists
- `record-referral` checks both tables
- New codes go to `referral_codes` table

### Migration Script
The `039_referral_codes_table.sql` migration:
1. Creates new `referral_codes` table
2. Migrates existing codes from `taste_profiles`
3. Preserves user_id linkage

---

## Future Enhancements

1. **Referral Rewards** - Track and reward top referrers
2. **Referral Tiers** - Different rewards for different referral counts
3. **Referral Dashboard** - User-facing view of their referrals
4. **Expiring Codes** - Time-limited referral campaigns

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-08 | Initial referral system specification |
| 2026-01-08 | Created `referral_codes` table for email-based codes |
| 2026-01-08 | Updated waitlist/beta APIs to generate codes |
| 2026-01-08 | Updated invite flow to use centralized codes |
