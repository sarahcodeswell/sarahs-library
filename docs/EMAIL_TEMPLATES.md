# Sarah's Books - Email Specification

Comprehensive specification for all transactional emails. All emails sent via **Resend**.

**Last Updated:** January 8, 2026

---

## Table of Contents
1. [Brand Elements](#brand-elements)
2. [Email 1: Curator Personal Note](#email-1-curator-personal-note)
3. [Email 2: Daily Admin Digest](#email-2-daily-admin-digest)
4. [Email 3: Curator Waitlist Confirmation](#email-3-curator-waitlist-confirmation)
5. [Email 4: Beta Tester Confirmation](#email-4-beta-tester-confirmation-read-with-friends)
6. [Email 5: Invite Friends](#email-5-invite-friends-new)
7. [Email 6: What's New at Sarah's Books](#email-6-whats-new-at-sarahs-books)
8. [Auth Emails (Supabase)](#auth-emails-supabase)
9. [Implementation Status](#implementation-status)

---

## Brand Elements

| Element | Value |
|---------|-------|
| **Logo** | https://www.sarahsbooks.com/linkedin-logo.png |
| **Header** | Gradient #5F7252 → #4A5940 (sage green) |
| **Background** | #FDFBF4 (cream) |
| **Card** | #FFFFFF (white) |
| **Footer** | #F8F6EE (light cream) |
| **Text Dark** | #4A5940 |
| **Text Medium** | #5F7252 |
| **Text Light** | #7A8F6C / #96A888 |
| **Accent (Rose)** | #c96b6b |
| **Button (Primary)** | Gradient #5F7252 → #4A5940 |
| **Button (Rose)** | Gradient #c96b6b → #b55a5a |

### Logo Placement
- Logo in header (centered, below green gradient bar)
- All emails use the LinkedIn logo (`/linkedin-logo.png`)

### Consistent Footer (All Emails)
```
─────────────────────────────────────────
[Reason for receiving this email]
Sarah's Books • For the ♥ of reading
www.sarahsbooks.com
```

---

## Email 1: Curator Personal Note

**Purpose:** Curator sends a personalized note about a book in user's queue  
**Trigger:** Admin/Curator sends note from dashboard  
**File:** `api/admin/send-note.js`  
**Access Control:** Curator role only (to be enforced in Curator Tools spec)

### Subject Line
`A personal note about "[Book Title]" 📚`

### Layout (UPDATED)
```
┌─────────────────────────────────────────┐
│  [GREEN HEADER BAR]                     │
│  [LOGO - centered]                      │
│  📚 A Note from [Curator Name],         │
│     Your Curator                        │
├─────────────────────────────────────────┤
│                                         │
│  I see you've added "[Book Title]" to   │
│  your reading queue. Here's why I love  │
│  this book:                             │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  [BOOK COVER    ]  [BOOK TITLE] │    │
│  │  [IMAGE         ]  by [Author]  │    │
│  │  [              ]               │    │
│  │  [              ]  ABOUT THIS   │    │
│  │  [              ]  BOOK         │    │
│  │                    [Description │    │
│  │                    from catalog]│    │
│  └─────────────────────────────────┘    │
│                                         │
│  WHY I LOVE THIS BOOK...                │
│  [Personal note content from curator]   │
│                                         │
│  ┌──────────────────┐                   │
│  │ [♥] [Curator     │                   │
│  │     Name]        │                   │
│  │     Your curator │                   │
│  └──────────────────┘                   │
│                                         │
│  [ View Your Reading Queue → ]          │
│                                         │
├─────────────────────────────────────────┤
│  [FOOTER]                               │
│  You're receiving this because you      │
│  added "[Book Title]" to your queue.    │
│  Sarah's Books • For the ♥ of reading   │
└─────────────────────────────────────────┘
```

### Data Required
- `curatorName` - Name of curator sending the note (default: "Sarah")
- `bookTitle` - Title of the book
- `bookAuthor` - Author name
- `bookCoverUrl` - URL to book cover image
- `bookDescription` - "About this book" text from catalog
- `noteContent` - Curator's personal note
- `userEmail` - Recipient

### Future Enhancement
When Curator Tools launch, dynamically populate `curatorName` from the curator's profile.

---

## Email 2: Daily Admin Digest

**Purpose:** Daily stats summary for admin  
**Trigger:** Cron job (daily) or manual trigger  
**File:** `api/admin/digest.js`  
**Access Control:** Admin only

### Subject Line
- Normal: `Sarah's Books Daily Digest - X new users, Y books queued`
- Spike: `⚡ Sarah's Books: Activity Spike Detected - X new users`

### Layout (No changes needed - admin only)
```
┌─────────────────────────────────────────┐
│  [GREEN HEADER BAR]                     │
│  [LOGO - centered]                      │
│  Sarah's Books Daily Digest             │
├─────────────────────────────────────────┤
│                                         │
│  [Date]                                 │
│                                         │
│  ⚡ Activity Spike Detected (if any)    │
│  [Spike details]                        │
│                                         │
│  ─── LAST 24 HOURS ───                  │
│  New Users          5 (avg 2.3/day)     │
│  Books Queued       12                  │
│  Books Read         3                   │
│  Recommendations    8                   │
│  Referrals          1                   │
│  Curator Signups    2                   │
│                                         │
│  ─── ALL TIME TOTALS ───                │
│  Total Users        156                 │
│  Books in Queues    423                 │
│  Books Read         89                  │
│  Curator Waitlist   34                  │
│                                         │
│  NEW USERS TODAY                        │
│  • user1@email.com                      │
│  • user2@email.com                      │
│                                         │
│  [ View Full Dashboard ]                │
│                                         │
├─────────────────────────────────────────┤
│  [FOOTER]                               │
│  Sarah's Books • Daily Admin Digest     │
└─────────────────────────────────────────┘
```

---

## Email 3: Curator Waitlist Confirmation

**Purpose:** Confirm user joined curator waitlist + gather feedback  
**Trigger:** User signs up at /become-curator  
**File:** `api/utils/email.js` → `sendCuratorWaitlistEmail()`

### Subject Line
`You're #X on the Curator Waitlist! ✨`

### Layout (UPDATED)
```
┌─────────────────────────────────────────┐
│  [GREEN HEADER BAR]                     │
│  [LOGO - centered]                      │
│  ✨ You're #[X] on the Curator Waitlist!│
├─────────────────────────────────────────┤
│                                         │
│  Thanks for your interest in becoming   │
│  a curator on Sarah's Books!            │
│                                         │
│  We're building something special—a     │
│  platform where passionate readers like │
│  you can share their curated book       │
│  collections and help others discover   │
│  their next great read.                 │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ What's next?                    │    │
│  │ We'll reach out when curator    │    │
│  │ accounts are ready. In the      │    │
│  │ meantime, we'd love your input! │    │
│  └─────────────────────────────────┘    │
│                                         │
│  HELP US BUILD THE RIGHT TOOLS          │
│                                         │
│  Which curator features interest you    │
│  most?                                  │
│  □ Build my own book catalog            │
│  □ Create themed reading lists          │
│  □ Write personal notes about books     │
│  □ Share recommendations with friends   │
│  □ Track my reading community           │
│                                         │
│  What else would you love to do as a    │
│  curator?                               │
│  [Open text field]                      │
│                                         │
│  [ Submit Feedback → ]                  │
│                                         │
│  ─── OR ───                             │
│                                         │
│  [ Explore Sarah's Books → ]            │
│                                         │
├─────────────────────────────────────────┤
│  [FOOTER]                               │
│  You're receiving this because you      │
│  joined the curator waitlist.           │
│  Sarah's Books • For the ♥ of reading   │
└─────────────────────────────────────────┘
```

### Data Required
- `email` - Recipient
- `waitlistPosition` - Their position number on the waitlist

### Notes
- Survey can link to a simple form (Typeform, Google Form, or custom page)
- Position number creates FOMO and engagement

---

## Email 4: Beta Tester Confirmation (Read with Friends)

**Purpose:** Confirm beta signup + encourage invites  
**Trigger:** User signs up at /read-with-friends  
**File:** `api/utils/email.js` → `sendBetaTesterEmail()`

### Subject Line
`You're #X on the Beta List! 💜`

### Layout (UPDATED)
```
┌─────────────────────────────────────────┐
│  [GREEN HEADER BAR]                     │
│  [LOGO - centered]                      │
│  💜 You're #[X] on the Beta List!       │
├─────────────────────────────────────────┤
│                                         │
│  You're officially signed up for        │
│  Read with Friends beta access!         │
│                                         │
│  We're building a thoughtful way to     │
│  share book recommendations with the    │
│  people you care about—no more lost     │
│  screenshots or forgotten titles.       │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Coming soon:                    │    │
│  │ • Find friends on the platform  │    │
│  │ • Share recommendations directly│    │
│  │ • See what friends are reading  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  📚 READING WITH FRIENDS IS MORE FUN    │
│                                         │
│  Know someone who'd love this? Invite   │
│  them to join the beta waitlist!        │
│                                         │
│  [ Invite Friends → ]  (ROSE button)    │
│                                         │
├─────────────────────────────────────────┤
│  [FOOTER]                               │
│  You're receiving this because you      │
│  signed up for Read with Friends beta.  │
│  Sarah's Books • For the ♥ of reading   │
└─────────────────────────────────────────┘
```

### Data Required
- `email` - Recipient
- `betaPosition` - Their position number on the beta list
- `inviteLink` - Unique referral link for inviting friends

---

## Email 5: Invite Friends (NEW - Replaces Supabase Default)

**Purpose:** Branded invitation email when user invites a friend  
**Trigger:** User clicks "Invite Friends" and enters friend's email  
**Current Implementation:** `api/invite.js` uses Supabase's `inviteUserByEmail()` which sends Supabase's default template  
**New Implementation:** `api/utils/email.js` → `sendInviteFriendsEmail()` via Resend

### Migration Note
Currently, invites go through Supabase Auth which sends their default invite email. To use our branded template:
1. Create custom invite flow that sends via Resend
2. Generate a magic link or signup URL with referral tracking
3. Record referral in `referrals` table (already exists)

### Subject Line
`[Inviter Name] thinks you'd love Sarah's Books 📚`

### Layout (PROPOSED)
```
┌─────────────────────────────────────────┐
│  [GREEN HEADER BAR]                     │
│  [LOGO - centered]                      │
│                                         │
│  📚 You've Been Invited!                │
├─────────────────────────────────────────┤
│                                         │
│  [Inviter Name] thinks you'd love       │
│  Sarah's Books—a place to discover      │
│  your next great read.                  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │  "[Optional personal message    │    │
│  │   from inviter - if provided]"  │    │
│  │                                 │    │
│  │                  — [Inviter]    │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ─── WHAT IS SARAH'S BOOKS? ───         │
│                                         │
│  A curated book recommendation          │
│  platform built for readers who love    │
│  discovering their next great book.     │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 📖 Personalized Recommendations │    │
│  │    Tell us what you love, and   │    │
│  │    we'll find your next read.   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 📚 Build Your Reading Queue     │    │
│  │    Save books you want to read  │    │
│  │    and track what you've loved. │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 💜 Share with Friends           │    │
│  │    Recommend books to people    │    │
│  │    you care about. (Coming soon)│    │
│  └─────────────────────────────────┘    │
│                                         │
│  [ Join Sarah's Books → ]               │
│                                         │
├─────────────────────────────────────────┤
│  [FOOTER]                               │
│  [Inviter Name] ([inviter@email.com])   │
│  invited you to join Sarah's Books.     │
│  Sarah's Books • For the ♥ of reading   │
└─────────────────────────────────────────┘
```

### Data Required
- `inviterName` - Name of person who sent the invite
- `inviterEmail` - For attribution/display
- `recipientEmail` - Who's being invited
- `personalMessage` - Optional message from inviter (can be null)
- `referralCode` - For tracking conversions
- `signupUrl` - URL with referral code embedded

### UX Flow
1. User clicks "Invite Friends" (from beta email, profile, or share button)
2. Modal/page asks for friend's email + optional personal message
3. API creates referral record + sends branded email via Resend
4. Friend clicks "Join Sarah's Books" → lands on signup with referral tracked
5. When friend signs up, referral status updates to "converted"

---

## Email 6: What's New at Sarah's Books

**Purpose:** Product update announcements  
**Trigger:** Manual send to opted-in users  
**File:** `api/utils/email.js` → `sendProductUpdateEmail()` (to be updated)

### Subject Line
`What's New at Sarah's Books 📚`

### Layout (UPDATED)
```
┌─────────────────────────────────────────┐
│  [GREEN HEADER BAR]                     │
│  [LOGO - centered]                      │
│  📚 What's New at Sarah's Books         │
├─────────────────────────────────────────┤
│                                         │
│  Hi [Name],                             │
│                                         │
│  We've been busy building new features  │
│  to make your reading experience even   │
│  better. Here's what you can now do:    │
│                                         │
│  ─── NEW FEATURES ───                   │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ [Icon] Feature Title            │    │
│  │ Description of what this        │    │
│  │ feature lets you do...          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ [Icon] Feature Title            │    │
│  │ Description of what this        │    │
│  │ feature lets you do...          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ [Icon] Feature Title            │    │
│  │ Description of what this        │    │
│  │ feature lets you do...          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [ Try It Now → ]                       │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Know someone who'd love Sarah's Books? │
│                                         │
│  [ Invite Friends → ]                   │
│                                         │
├─────────────────────────────────────────┤
│  [FOOTER]                               │
│  You're receiving this because you      │
│  opted in to product updates.           │
│  Manage preferences                     │
│  Sarah's Books • For the ♥ of reading   │
└─────────────────────────────────────────┘
```

### Data Required
- `recipientName` - User's name (or "there" if unknown)
- `recipientEmail` - Recipient
- `features` - Array of { icon, title, description }
- `ctaText` - Primary button text
- `ctaUrl` - Primary button link

### Style Notes
- Feature cards match the style of /become-curator page
- Each feature has an icon, title, and short description
- Always include "Invite Friends" as secondary CTA

---

## Auth Emails (Supabase)

Configured in **Supabase Dashboard → Auth → Email Templates**

| Email | Purpose |
|-------|---------|
| Magic Link | Sign-in link for passwordless auth |
| Confirm Email | Verify new email address |
| Reset Password | Password reset link |
| Invite User | Admin invites new user |

**Note:** These use Supabase's built-in email system. To use custom SMTP with Resend for auth emails, configure in Supabase Dashboard → Settings → Auth → SMTP Settings.

---

## Implementation Status

| Email | Status | Priority | Notes |
|-------|--------|----------|-------|
| Curator Personal Note | 🟡 Needs update | High | Add cover image, book description, dynamic curator name |
| Daily Admin Digest | 🟡 Needs update | Low | Add logo only |
| Curator Waitlist | 🟡 Needs update | Medium | Add position #, link to survey form |
| Beta Tester | 🟡 Needs update | Medium | Add position #, invite friends CTA |
| Invite Friends | 🔴 New | Medium | Replace Supabase default with branded Resend email |
| What's New | 🟡 Needs update | Low | New feature card format, invite friends CTA |
| Add logo to all | 🔴 Pending | High | LinkedIn logo in header |

### Implementation Order (Recommended)
1. **Add logo to shared template** - affects all emails
2. **Curator Personal Note** - highest user impact, already in use
3. **Beta Tester + Curator Waitlist** - add position numbers
4. **Invite Friends** - new email, requires new API endpoint
5. **What's New** - lower priority, manual sends only

---

## Technical Notes

### Email Service Location
- Shared utilities: `api/utils/email.js`
- Curator notes: `api/admin/send-note.js`
- Daily digest: `api/admin/digest.js`
- Waitlist endpoints: `api/waitlist/curator.js`, `api/waitlist/beta.js`
- Current invite (Supabase): `api/invite.js` (to be replaced)

### Environment Variables
```
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=hello@sarahsbooks.com
```

### Testing
Test emails appear in Resend dashboard: https://resend.com/emails

### Logo URL
```
https://www.sarahsbooks.com/linkedin-logo.png
```

### Curator Access Control
Curator note sending must be restricted to users with `role: 'curator'` in their profile. This will be defined in the Curator Tools specification.

---

## Related Specifications

- **Curator Tools Spec** - Defines curator role, permissions, and tools (TBD)
- **Referral System** - Existing `referrals` table tracks invites and conversions

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-08 | Initial spec created with all 6 email templates |
| 2026-01-08 | Added Invite Friends detailed mockup and UX flow |
