# Specification Updates Summary
## Based on User Feedback - January 7, 2026

---

## Changes Made

### 1. ✅ Simplified Sharing Flow

**Previous Flow:**
```
Browse → Add to Queue → Recommend → Save to "Books I've Shared" → 
Go to "Books I've Shared" → Click Share
```

**New Flow:**
```
Find any book → Click "Share" button
```

**Impact:**
- Share button available on: search results, book detail pages, reading queue, collection, anywhere a book appears
- "Books I've Shared" becomes a **record/history page** only, not a required step
- Much simpler user experience
- Reduces friction for sharing

**Implementation Notes:**
- Add "Share" button to all book card components
- Share modal can create recommendation on-the-fly if it doesn't exist yet
- "Books I've Shared" page shows history of all shares (both link and direct)

---

### 2. ✅ Email Privacy in Search Results

**Previous Design:**
```
✓ Sarah Johnson
  sarah.j@example.com      ← REMOVED
  Member since Jan 2025
```

**New Design:**
```
✓ Sarah Johnson
  Member since Jan 2025
  Favorite Genres: Mystery, Thriller
```

**Changes:**
- ❌ Email addresses NOT displayed in search results
- ❌ Email NOT searchable (name only)
- ✅ Show: Name, Member Since, Favorite Genres
- ✅ Better privacy protection

**Rationale:**
- Email addresses are personal information
- Not necessary for identifying users (name + genres sufficient)
- Reduces spam/harassment risk
- Better GDPR compliance

---

### 3. ✅ Comprehensive Notifications Strategy

**New Document Created:** `/docs/NOTIFICATIONS_STRATEGY.md`

**Default Settings for New Users:**
- ✅ **In-app notifications:** Always ON (cannot disable badge counts)
- ✅ **Email for book recommendations:** ON (instant delivery)
- ✅ **Email for security alerts:** ON (required)
- ✅ **Email for platform updates:** ON

**User Controls:**
Users can configure:
- Email frequency: **Instant**, **Daily Digest**, or **Off**
- Daily digest time (default: 9am local time)
- Turn off email for recommendations (in-app still active)
- Turn off email for announcements
- Cannot disable security emails (verification, password reset)

**Notification Types Covered:**
1. **Book Recommendations** (direct shares)
   - In-app: Badge count, notification center, real-time toast
   - Email: Immediate or daily digest
   - Default: Both ON

2. **Email Invitations** (non-registered users)
   - Email only (always sent)
   - Invitation to join + book recommendation

3. **Security Alerts**
   - Email verification (required)
   - Password reset (required)
   - New device login (optional)

4. **Platform Announcements**
   - New features, updates
   - In-app banner + email
   - Can disable email

**Email Frequency Options:**

**Instant (Default):**
- Email sent within 1 minute of share
- Best for active users

**Daily Digest:**
- Batch all shares from past 24 hours
- Send once per day at user's preferred time
- Example: "You received 3 book recommendations today"
- Best for users who don't want email overload

**Off:**
- No email notifications
- In-app notifications still work
- Badge counts still show

**Technical Implementation:**
- Supabase Realtime for in-app notifications
- SendGrid recommended for email delivery
- Daily digest cron job
- Comprehensive tracking (opens, clicks, bounces)
- Unsubscribe mechanism (granular by type)

---

## Updated Age Restrictions

**Confirmed: 18+ for ALL Direct Sharing**

| Feature | Under 13 | 13-17 | 18+ |
|---------|----------|-------|-----|
| Create account | ❌ | ✅ | ✅ |
| View public share links | ❌ | ✅ | ✅ |
| **Receive direct shares** | ❌ | ❌ | ✅ |
| **Send direct shares** | ❌ | ❌ | ✅ |
| **Be searchable** | ❌ | ❌ | ✅ |

**Rationale:**
- Under 13: COPPA compliance
- 13-17: Can use app but not participate in direct sharing (requires additional due diligence)
- 18+: Full access to all features

---

## Database Schema Updates

### New Tables for Notifications

```sql
-- User notification preferences
CREATE TABLE user_notification_preferences (
  user_id UUID PRIMARY KEY,
  email_recommendations BOOLEAN DEFAULT TRUE,
  email_frequency TEXT DEFAULT 'instant', -- 'instant', 'daily', 'off'
  daily_digest_time TIME DEFAULT '09:00:00',
  daily_digest_timezone TEXT DEFAULT 'America/Los_Angeles',
  email_new_device_login BOOLEAN DEFAULT TRUE,
  email_announcements BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications log (in-app + email tracking)
CREATE TABLE notifications_log (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  sent_in_app BOOLEAN DEFAULT TRUE,
  sent_email BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  email_opened_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily digest queue
CREATE TABLE daily_digest_queue (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_id UUID NOT NULL,
  scheduled_send_time TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## UI Components to Build

### New Components

1. **NotificationPreferencesPage**
   - Email frequency selector (instant/daily/off)
   - Daily digest time picker
   - Toggle switches for each notification type
   - Preview of what emails look like

2. **NotificationCenter**
   - List of all notifications
   - Mark as read/unread
   - Dismiss individual or all
   - Filter by type

3. **ToastNotification**
   - Real-time popup for new shares
   - Auto-dismiss after 5 seconds
   - Click to view or dismiss

4. **Enhanced Share Button**
   - Add to all book card components
   - Available everywhere a book appears
   - Opens share modal directly

### Modified Components

1. **ShareModal**
   - No longer requires recommendation to exist first
   - Creates recommendation on-the-fly if needed
   - Personal note is optional

2. **UserSearchModal**
   - Remove email from results display
   - Show genres instead
   - Search by name only

3. **BooksSharedWithMePage**
   - Already exists, no changes needed
   - Accept/Decline actions already implemented

---

## API Functions to Add

### Notifications
```javascript
// Preferences
getUserNotificationPreferences(userId)
updateNotificationPreferences(userId, preferences)

// Notification management
createNotification(userId, type, title, message, link, sendEmail)
getNotifications(userId, filters)
markNotificationAsRead(notificationId)
dismissNotification(notificationId)
getUnreadNotificationCount(userId)

// Email sending
sendNotificationEmail(userId, notificationId)
queueForDailyDigest(userId, notificationId)
sendDailyDigests() // cron job
```

### Sharing (Updated)
```javascript
// Share from anywhere (not just "Books I've Shared")
shareBook(userId, bookDetails, recipients, note, shareType)
  // Creates recommendation if doesn't exist
  // Creates direct shares or generates link
  // Sends notifications
```

---

## Email Templates Needed

1. **Instant Recommendation Email**
   - Subject: "📚 [Sender] shared a book with you"
   - Book details + sender's note
   - CTA: "View Recommendation"

2. **Daily Digest Email**
   - Subject: "📚 Your Daily Book Recommendations ([count] new)"
   - List of all shares from past 24 hours
   - CTA: "View All Recommendations"

3. **Email Invitation**
   - Subject: "📚 [Sender] wants to share a book with you"
   - Book details + invitation to join
   - CTA: "View Recommendation & Join"

4. **Welcome Email** (Enhanced)
   - Include notification preferences info
   - Explain how to manage settings

---

## Implementation Priority

### Phase 1: Core Sharing (Week 1)
1. ✅ Add "Share" button to all book components
2. ✅ Update share modal to work from anywhere
3. ✅ Remove email from search results
4. ✅ User search by name only
5. ✅ Basic direct sharing works

### Phase 2: Notifications (Week 2)
1. ✅ Create notification preferences table
2. ✅ Build notification preferences UI
3. ✅ Implement in-app notifications (real-time)
4. ✅ Set up email service (SendGrid)
5. ✅ Create email templates
6. ✅ Implement instant email notifications

### Phase 3: Advanced Notifications (Week 3)
1. ✅ Build notification center
2. ✅ Implement daily digest
3. ✅ Add toast notifications
4. ✅ Email tracking (opens, clicks)
5. ✅ Unsubscribe mechanism
6. ✅ Admin analytics dashboard

---

## Key Decisions Confirmed

1. ✅ **Sharing Flow:** Share from anywhere, not just "Books I've Shared"
2. ✅ **Email Privacy:** Never show email addresses in search results
3. ✅ **Search:** Name only, not email
4. ✅ **Notifications Default:** Both in-app and email ON
5. ✅ **Email Frequency:** Instant by default, with daily digest option
6. ✅ **Age Restriction:** 18+ for all direct sharing features
7. ✅ **User Control:** Can disable email notifications but not in-app badges

---

## Next Steps

1. **Review all three spec documents:**
   - `/docs/DIRECT_SHARING_SPEC.md` (main feature spec)
   - `/docs/USER_JOURNEY_MAP.md` (user flows and dependencies)
   - `/docs/NOTIFICATIONS_STRATEGY.md` (notification system)

2. **Confirm approach:**
   - Simplified sharing flow
   - Email privacy in search
   - Notification defaults and controls

3. **Choose email provider:**
   - SendGrid (recommended)
   - AWS SES
   - Supabase Auth

4. **Begin Phase 1 implementation:**
   - Database migrations
   - Share button on all book components
   - Updated share modal
   - User search (name only)

---

## Questions Still Open

1. **Email Provider:** SendGrid, AWS SES, or Supabase Auth?
2. **Timeline:** 3-week implementation or different pace?
3. **Beta Testing:** Test with small group first?
4. **Legal Review:** Who will review updated Terms/Privacy Policy?
5. **Daily Digest Default Time:** 9am good for most users?

---

## Files Updated

- ✅ `/docs/DIRECT_SHARING_SPEC.md` - Updated age restrictions, removed email from search
- ✅ `/docs/USER_JOURNEY_MAP.md` - Simplified sharing flow, removed email from results
- ✅ `/docs/NOTIFICATIONS_STRATEGY.md` - **NEW** - Complete notification system spec

---

## Summary

**Major Improvements:**
1. **Simpler UX:** Share from anywhere, not multi-step process
2. **Better Privacy:** Email addresses never exposed in search
3. **Clear Notifications:** Comprehensive strategy with user control
4. **Default Settings:** Sensible defaults (both notifications ON)
5. **User Control:** Can adjust email frequency or turn off

**Ready for Implementation:** All specs are complete and aligned with user requirements.
