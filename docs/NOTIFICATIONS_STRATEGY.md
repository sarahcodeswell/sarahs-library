# Notifications Strategy Specification

## Overview
Comprehensive notification system for Sarah's Books, covering in-app notifications, email notifications, and user preferences. Designed to keep users informed without overwhelming them.

---

## 1. Notification Types

### A. Book Recommendations (Direct Shares)
**Trigger:** Another user shares a book directly with you

**In-App Notification:**
- Badge count on "Books Shared with Me" menu item
- Notification center entry
- Real-time update (if user is online)

**Email Notification:**
```
Subject: 📚 [Sender Name] shared a book with you

Hi [Recipient Name],

[Sender Name] thinks you'd love this book:

"[Book Title]" by [Author]

[Sender's personal note]

[View Recommendation]

You can manage your notification preferences in Settings.
```

**Default Setting:** ✅ ON (both in-app and email)
**User Control:** Can disable email, cannot disable in-app badge

---

### B. Email Invitations (Non-Registered Users)
**Trigger:** Someone invites you to join via email

**Email Notification:**
```
Subject: 📚 [Sender Name] wants to share a book with you on Sarah's Books

Hi there,

[Sender Name] thinks you'd love this book:

"[Book Title]" by [Author]

[Sender's personal note]

Join Sarah's Books to view the full recommendation and discover more books from friends.

[View Recommendation & Join]

---

What is Sarah's Books?
A book discovery platform where you can:
• Get personalized book recommendations
• Share books with friends
• Track your reading queue
• Discover new authors and genres

[Learn More]
```

**Default Setting:** N/A (always sent - user not registered yet)
**User Control:** None (pre-registration)

---

### C. Account & Security
**Trigger:** Security-related events

**Email Notification Types:**
1. **Email Verification** (always sent)
   - Subject: "Verify your email for Sarah's Books"
   - Cannot be disabled

2. **Password Reset** (always sent)
   - Subject: "Reset your password"
   - Cannot be disabled

3. **Login from New Device** (optional)
   - Subject: "New login to your account"
   - Default: ✅ ON
   - User Control: Can disable

**In-App:** None (email only for security)

---

### D. System Announcements (Future)
**Trigger:** Important platform updates, new features

**In-App Notification:**
- Banner at top of app
- Notification center entry
- Dismissible

**Email Notification:**
```
Subject: 📰 What's New on Sarah's Books

Hi [Name],

We've added some exciting new features...

[Learn More]
```

**Default Setting:** ✅ ON (both)
**User Control:** Can disable email, cannot disable in-app banners

---

## 2. Default Notification Settings

### New User Defaults (On Signup)

| Notification Type | In-App | Email | Rationale |
|-------------------|--------|-------|-----------|
| **Book Recommendations** | ✅ Always ON | ✅ ON | Core feature - users want to know |
| **Email Invitations** | N/A | ✅ Always ON | Pre-registration |
| **Email Verification** | N/A | ✅ Always ON | Security requirement |
| **Password Reset** | N/A | ✅ Always ON | Security requirement |
| **New Device Login** | N/A | ✅ ON | Security - can disable |
| **System Announcements** | ✅ Always ON | ✅ ON | Important updates |

### What Users Can Control

**Full Control (Can Enable/Disable):**
- Email notifications for book recommendations
- Email frequency (instant vs daily digest)
- Email notifications for new device logins
- Email notifications for system announcements

**Partial Control:**
- In-app notifications: Cannot disable badge counts, but can clear/dismiss

**No Control (Always Sent):**
- Email verification
- Password reset
- In-app notification badges for recommendations

---

## 3. Email Notification Frequency

### Option 1: Instant (Default)
- Send email immediately when event occurs
- Best for: Users who want real-time updates
- Example: Receive email within 1 minute of share

### Option 2: Daily Digest
- Batch all notifications from past 24 hours
- Send once per day at user's preferred time (default: 9am local time)
- Best for: Users who don't want email overload
- Example:
  ```
  Subject: 📚 Your Daily Book Recommendations (3 new)
  
  Hi Sarah,
  
  You received 3 book recommendations today:
  
  1. "The Great Gatsby" from Emma Wilson
     "I think you'd love this classic!"
     [View]
  
  2. "1984" from Mike Chen
     "Perfect for your dystopian collection"
     [View]
  
  3. "Pride and Prejudice" from Lisa Park
     "A must-read!"
     [View]
  
  [View All Recommendations]
  ```

### Option 3: Off
- No email notifications
- In-app notifications still active
- Best for: Users who only check the app

---

## 4. In-App Notifications

### Notification Center
**Location:** Accessible from hamburger menu or bell icon

**Features:**
- List of all notifications (newest first)
- Mark as read/unread
- Clear individual notifications
- Clear all notifications
- Filter by type (recommendations, announcements)

**UI Design:**
```
┌─────────────────────────────────────────┐
│  🔔 Notifications                       │
├─────────────────────────────────────────┤
│  Today                                  │
│                                         │
│  📚 Emma Wilson shared a book           │
│     "The Great Gatsby"                  │
│     2 hours ago                         │
│     [View] [Dismiss]                    │
│                                         │
│  📚 Mike Chen shared a book             │
│     "1984"                              │
│     5 hours ago                         │
│     [View] [Dismiss]                    │
│                                         │
│  Yesterday                              │
│                                         │
│  📰 New Feature: Profile Preferences    │
│     Complete your profile to get better │
│     recommendations                     │
│     [Learn More] [Dismiss]              │
│                                         │
│  [Clear All]                            │
└─────────────────────────────────────────┘
```

### Badge Counts
**Location:** Menu items

**Behavior:**
- Show count of unread items
- Update in real-time
- Clear when user views the page
- Cannot be disabled (core UX)

**Example:**
```
📚 Books Shared with Me (3)
```

### Real-Time Updates
**Technology:** Supabase Realtime subscriptions

**Behavior:**
- If user is online, notification appears immediately
- Toast notification in bottom-right corner
- Auto-dismisses after 5 seconds
- Click to view full notification

**UI Design:**
```
┌─────────────────────────────────────────┐
│  📚 New Recommendation                  │
│  Emma Wilson shared "The Great Gatsby"  │
│  [View] [Dismiss]                       │
└─────────────────────────────────────────┘
```

---

## 5. Notification Preferences UI

### Settings Page Location
**Path:** Profile → Settings → Notifications

### UI Design
```
┌─────────────────────────────────────────┐
│  Notification Preferences               │
├─────────────────────────────────────────┤
│  📚 Book Recommendations                │
│                                         │
│  [✓] In-app notifications               │
│      (Badge counts and notification     │
│       center - always enabled)          │
│                                         │
│  [✓] Email notifications                │
│                                         │
│  Email frequency:                       │
│  ○ Instant (as they happen)             │
│  ● Daily digest at 9:00 AM              │
│  ○ Off (in-app only)                    │
│                                         │
├─────────────────────────────────────────┤
│  🔒 Security Alerts                     │
│                                         │
│  [✓] Email verification                 │
│      (Required - cannot disable)        │
│                                         │
│  [✓] Password reset                     │
│      (Required - cannot disable)        │
│                                         │
│  [✓] New device login alerts            │
│                                         │
├─────────────────────────────────────────┤
│  📰 Platform Updates                    │
│                                         │
│  [✓] In-app announcements               │
│      (Important updates - always on)    │
│                                         │
│  [✓] Email announcements                │
│      (New features, tips)               │
│                                         │
├─────────────────────────────────────────┤
│  [Save Preferences]                     │
└─────────────────────────────────────────┘
```

---

## 6. Email Template Standards

### Design Principles
- Clean, readable design
- Mobile-responsive
- Clear call-to-action buttons
- Unsubscribe link in footer
- Consistent branding

### Required Elements (All Emails)
1. **Header:** Sarah's Books logo
2. **Body:** Clear, concise message
3. **CTA Button:** Primary action (e.g., "View Recommendation")
4. **Footer:**
   - Unsubscribe link (where applicable)
   - Notification preferences link
   - Company address (legal requirement)
   - Social media links (optional)

### Example Footer
```
───────────────────────────────────────────

You're receiving this email because you have an account on Sarah's Books.

[Manage Notification Preferences] | [Unsubscribe from this type]

Sarah's Books
[Address]

[Twitter] [Instagram] [Facebook]
```

---

## 7. Unsubscribe Mechanism

### Granular Unsubscribe Options
Users can unsubscribe from specific notification types:

**One-Click Unsubscribe:**
- Link in email footer
- Immediately disables that notification type
- Shows confirmation page

**Confirmation Page:**
```
┌─────────────────────────────────────────┐
│  ✅ Unsubscribed                        │
├─────────────────────────────────────────┤
│  You will no longer receive email      │
│  notifications for book recommendations.│
│                                         │
│  You'll still receive:                  │
│  • In-app notifications                 │
│  • Security alerts                      │
│  • Account-related emails               │
│                                         │
│  [Manage All Preferences]               │
│  [Undo - Resubscribe]                   │
└─────────────────────────────────────────┘
```

### What Cannot Be Unsubscribed
- Email verification
- Password reset
- Account security alerts (can disable new device alerts only)

### Resubscribe
- Users can re-enable at any time in settings
- No waiting period

---

## 8. Database Schema

### Notification Preferences Table
```sql
CREATE TABLE user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Book Recommendations
  email_recommendations BOOLEAN DEFAULT TRUE,
  email_frequency TEXT DEFAULT 'instant', -- 'instant', 'daily', 'off'
  daily_digest_time TIME DEFAULT '09:00:00',
  daily_digest_timezone TEXT DEFAULT 'America/Los_Angeles',
  
  -- Security
  email_new_device_login BOOLEAN DEFAULT TRUE,
  
  -- Platform Updates
  email_announcements BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Notifications Log Table
```sql
CREATE TABLE notifications_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type TEXT NOT NULL, -- 'recommendation', 'announcement', 'security'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- URL to navigate to when clicked
  
  -- Delivery tracking
  sent_in_app BOOLEAN DEFAULT TRUE,
  sent_email BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  email_opened_at TIMESTAMPTZ,
  email_clicked_at TIMESTAMPTZ,
  
  -- Status
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_log_user ON notifications_log(user_id, created_at DESC);
CREATE INDEX idx_notifications_log_unread ON notifications_log(user_id) WHERE read_at IS NULL;
```

### Daily Digest Queue Table
```sql
CREATE TABLE daily_digest_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_id UUID REFERENCES notifications_log(id) ON DELETE CASCADE NOT NULL,
  scheduled_send_time TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_digest_queue_scheduled ON daily_digest_queue(scheduled_send_time) WHERE sent_at IS NULL;
```

---

## 9. API Functions

### Notification Preferences
```javascript
// Get user's notification preferences
getUserNotificationPreferences(userId)

// Update notification preferences
updateNotificationPreferences(userId, preferences)

// Quick unsubscribe (from email link)
unsubscribeFromNotificationType(userId, notificationType, token)
```

### Notification Management
```javascript
// Create notification
createNotification(userId, type, title, message, link, sendEmail)

// Get user's notifications
getNotifications(userId, filters) // filters: unread, type, limit

// Mark as read
markNotificationAsRead(notificationId)

// Dismiss notification
dismissNotification(notificationId)

// Clear all notifications
clearAllNotifications(userId)

// Get unread count
getUnreadNotificationCount(userId)
```

### Email Sending
```javascript
// Send immediate email
sendNotificationEmail(userId, notificationId)

// Queue for daily digest
queueForDailyDigest(userId, notificationId)

// Send daily digest (cron job)
sendDailyDigests() // runs once per day

// Track email opens/clicks
trackEmailOpen(notificationId)
trackEmailClick(notificationId)
```

---

## 10. Email Delivery Service

### Recommended Provider
**Option 1: Supabase Auth (Built-in)**
- ✅ Already integrated
- ✅ Free tier available
- ✅ Handles verification emails
- ❌ Limited customization
- ❌ Limited analytics

**Option 2: SendGrid (Recommended)**
- ✅ Excellent deliverability
- ✅ Rich analytics (opens, clicks, bounces)
- ✅ Template management
- ✅ Unsubscribe management
- ✅ Free tier: 100 emails/day
- ❌ Requires setup

**Option 3: AWS SES**
- ✅ Very cheap ($0.10 per 1,000 emails)
- ✅ High deliverability
- ✅ Scalable
- ❌ More complex setup
- ❌ Requires AWS account

### Recommended: SendGrid
- Best balance of features and ease of use
- Built-in unsubscribe management
- Good analytics for monitoring
- Generous free tier for starting out

---

## 11. Notification Triggers & Timing

### Book Recommendation Shared
**Trigger:** User A shares book with User B

**Timing:**
- **In-app:** Immediate (if User B is online)
- **Email (instant):** Within 1 minute
- **Email (daily digest):** Next scheduled digest time

**Logic:**
```javascript
async function onBookShared(senderId, recipientId, bookDetails) {
  // 1. Create notification record
  const notification = await createNotification(
    recipientId,
    'recommendation',
    `${senderName} shared a book with you`,
    `"${bookDetails.title}" by ${bookDetails.author}`,
    `/books-shared-with-me`,
    true // sendEmail flag
  );
  
  // 2. Send in-app notification (real-time)
  await sendRealtimeNotification(recipientId, notification);
  
  // 3. Check email preferences
  const prefs = await getUserNotificationPreferences(recipientId);
  
  if (prefs.email_recommendations) {
    if (prefs.email_frequency === 'instant') {
      // Send email immediately
      await sendNotificationEmail(recipientId, notification.id);
    } else if (prefs.email_frequency === 'daily') {
      // Queue for daily digest
      await queueForDailyDigest(recipientId, notification.id);
    }
    // If 'off', skip email
  }
}
```

---

## 12. Daily Digest Implementation

### Cron Job Schedule
**Frequency:** Once per day per timezone

**Logic:**
```javascript
// Runs every hour to catch all timezones
async function sendDailyDigests() {
  const currentHour = new Date().getUTCHours();
  
  // Get all users whose digest time is now (accounting for timezone)
  const users = await getUsersForDigestTime(currentHour);
  
  for (const user of users) {
    // Get all queued notifications for this user
    const notifications = await getQueuedNotifications(user.id);
    
    if (notifications.length === 0) continue;
    
    // Send digest email
    await sendDigestEmail(user, notifications);
    
    // Mark as sent
    await markDigestAsSent(user.id, notifications.map(n => n.id));
  }
}
```

### Digest Email Template
```
Subject: 📚 Your Daily Book Recommendations ([count] new)

Hi [Name],

You received [count] book recommendation[s] today:

[For each notification:]
─────────────────────────────────
📚 "[Book Title]" from [Sender Name]

[Sender's personal note]

[View Recommendation]
─────────────────────────────────

[View All Recommendations]

───────────────────────────────────────────

You're receiving this daily digest because you chose to receive book 
recommendation emails once per day.

[Change to instant notifications] | [Turn off email notifications] | [Manage preferences]
```

---

## 13. Real-Time Notifications (In-App)

### Technology Stack
**Supabase Realtime:**
- WebSocket connection
- Subscribe to notifications table
- Automatic updates when new rows inserted

### Implementation
```javascript
// Subscribe to notifications for current user
const subscription = supabase
  .channel('notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications_log',
      filter: `user_id=eq.${currentUserId}`
    },
    (payload) => {
      // Show toast notification
      showToastNotification(payload.new);
      
      // Update badge count
      updateBadgeCount();
      
      // Add to notification center
      addToNotificationCenter(payload.new);
    }
  )
  .subscribe();
```

### Toast Notification Component
```javascript
function ToastNotification({ notification, onDismiss, onView }) {
  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm animate-slide-in">
      <div className="flex items-start gap-3">
        <span className="text-2xl">📚</span>
        <div className="flex-1">
          <h4 className="font-medium text-sm">{notification.title}</h4>
          <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
        </div>
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
          ✕
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onView} className="text-xs text-blue-600 hover:underline">
          View
        </button>
        <button onClick={onDismiss} className="text-xs text-gray-600 hover:underline">
          Dismiss
        </button>
      </div>
    </div>
  );
}
```

---

## 14. Notification Best Practices

### Frequency Limits
- **Max 1 email per hour** (instant mode) - batch if multiple shares
- **Max 1 daily digest per day** (obviously)
- **No emails between 10pm - 8am** (user's local time) unless critical security

### Content Guidelines
- **Subject line:** Clear, concise, under 50 characters
- **Body:** Get to the point in first sentence
- **CTA:** Single, clear call-to-action
- **Personalization:** Use recipient's name, sender's name
- **Mobile-friendly:** 90% of emails opened on mobile

### Testing
- Test all email templates on multiple devices
- Test unsubscribe links
- Test digest batching
- Monitor bounce rates
- Track open rates (target: >20%)
- Track click rates (target: >5%)

---

## 15. Monitoring & Analytics

### Key Metrics to Track

| Metric | Target | Action if Below Target |
|--------|--------|------------------------|
| Email delivery rate | >98% | Check spam filters, sender reputation |
| Email open rate | >20% | Improve subject lines |
| Email click rate | >5% | Improve CTA clarity |
| Unsubscribe rate | <2% | Review frequency, content relevance |
| In-app notification view rate | >80% | Improve badge visibility |
| Notification-to-action rate | >30% | Improve notification content |

### Dashboard Metrics
- Total notifications sent (by type)
- Email delivery status (sent, delivered, opened, clicked, bounced)
- Unsubscribe rate by notification type
- Average time to read notification
- Most common notification types
- Peak notification times

---

## 16. Privacy & Compliance

### GDPR Compliance
- ✅ Clear consent at signup
- ✅ Easy unsubscribe mechanism
- ✅ Granular control over notification types
- ✅ Data export includes notification history
- ✅ Data deletion removes all notifications

### CAN-SPAM Compliance
- ✅ Clear sender identification
- ✅ Accurate subject lines
- ✅ Physical address in footer
- ✅ Unsubscribe link in every email
- ✅ Honor unsubscribe within 10 days

### Data Retention
- **Notification logs:** Keep for 90 days, then archive
- **Email tracking data:** Keep for 1 year
- **Unsubscribe records:** Keep indefinitely (legal requirement)

---

## 17. Future Enhancements

### Phase 2 Features
- Push notifications (mobile app)
- SMS notifications (opt-in)
- Slack/Discord integration
- Custom notification sounds
- Notification scheduling (quiet hours)
- Smart batching (AI-powered)

### Advanced Features
- Notification priority levels
- Read receipts (optional)
- Notification forwarding
- Notification templates for common actions
- A/B testing for email content

---

## Summary

### Default Settings (New Users)
- ✅ In-app notifications: Always ON
- ✅ Email for recommendations: ON (instant)
- ✅ Email for security: ON (required)
- ✅ Email for announcements: ON

### User Controls
- Email frequency: Instant, Daily digest, or Off
- Daily digest time: User-selectable
- Granular unsubscribe by notification type
- Cannot disable in-app badges (core UX)

### Technical Implementation
- Supabase Realtime for in-app notifications
- SendGrid for email delivery (recommended)
- Daily digest cron job
- Comprehensive tracking and analytics

### Privacy & Compliance
- GDPR compliant
- CAN-SPAM compliant
- Granular controls
- Easy unsubscribe

**Next Steps:**
1. Review and approve notification strategy
2. Set up SendGrid account (or choose email provider)
3. Create email templates
4. Implement notification preferences UI
5. Build notification center
6. Set up real-time subscriptions
7. Test thoroughly before launch
