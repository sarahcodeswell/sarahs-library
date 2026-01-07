# Direct User Sharing - Feature Specification

## Overview
Allow users to share book recommendations directly with other registered users in the app, with strong emphasis on consent, privacy, and anti-abuse measures.

**Core Philosophy:** This is a **book discovery and sharing platform**, not a social media app. The focus is on meaningful book recommendations between friends, not public feeds, likes, or social validation. Features are designed to facilitate thoughtful book discussions and personal connections around reading.

---

## 1. Core Principles

### Privacy First
- **Opt-in by default**: Users must explicitly enable being discoverable
- **Granular controls**: Users control who can share with them
- **Data minimization**: Only share necessary information
- **Right to be forgotten**: Users can delete all received shares

### Consent & Safety
- **No unsolicited spam**: Rate limiting and abuse prevention
- **Block functionality**: Users can block specific senders
- **Report mechanism**: Flag inappropriate shares
- **Reversible actions**: Recipients can always decline/delete

### Transparency
- **Clear notifications**: Users know when they receive shares
- **Sender visibility**: Always show who shared what
- **Audit trail**: Track sharing history for safety

---

## 2. User Privacy Settings

### Profile Privacy Levels

#### **Level 1: Private (Default)**
- ❌ Not searchable by other users
- ❌ Cannot receive direct shares
- ✅ Can still use public share links
- ✅ Can still share with others (if they're discoverable)

#### **Level 2: Friends Only** (Future - requires friends system)
- ✅ Searchable only by friends
- ✅ Can receive shares from friends
- ❌ Not searchable by strangers

#### **Level 3: Open**
- ✅ Searchable by all registered users
- ✅ Can receive direct shares from anyone
- ✅ Can set rate limits (max shares per day)

### Privacy Settings UI
```
┌─────────────────────────────────────────┐
│  Sharing Privacy Settings               │
├─────────────────────────────────────────┤
│  Who can share books with you?          │
│                                         │
│  ○ Private (No one)                     │
│  ● Open (Anyone in the app)             │
│                                         │
│  [✓] Require email verification to     │
│      share with me                      │
│                                         │
│  [✓] Limit to 10 shares per person     │
│      per day                            │
│                                         │
│  Blocked Users: 0                       │
│  [Manage Blocked Users]                 │
│                                         │
│  [Save Settings]                        │
└─────────────────────────────────────────┘
```

---

## 3. Consent Mechanisms

### First-Time Share Prompt
When a user first tries to share directly:
```
┌─────────────────────────────────────────┐
│  📚 Share Books with Friends            │
├─────────────────────────────────────────┤
│  To share books directly with other     │
│  users, we need your consent:           │
│                                         │
│  [✓] I understand that:                 │
│      • Recipients will see my name      │
│      • They can accept or decline       │
│      • I should only share with people  │
│        who want recommendations         │
│                                         │
│  [✓] I agree to share respectfully and  │
│      not spam other users               │
│                                         │
│  [Cancel]  [I Agree & Continue]         │
└─────────────────────────────────────────┘
```

### Recipient Opt-In
When someone tries to share with a "Private" user:
```
┌─────────────────────────────────────────┐
│  ⚠️  Cannot Share                       │
├─────────────────────────────────────────┤
│  This user has not enabled direct       │
│  sharing. You can:                      │
│                                         │
│  • Share via public link instead        │
│  • Ask them to enable sharing in        │
│    their privacy settings               │
│                                         │
│  [Use Public Link]  [Cancel]            │
└─────────────────────────────────────────┘
```

---

## 4. Anti-Abuse & Spam Prevention

### Rate Limiting

**Per Sender:**
- Max 50 shares per day (total)
- Max 10 shares to same person per day
- Max 5 shares per minute (prevent bulk spam)

**Per Recipient:**
- Max 100 received shares per day
- Auto-pause if exceeded (protect from spam attacks)

**Database Tracking:**
```sql
CREATE TABLE share_rate_limits (
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT, -- 'send' or 'receive'
  count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, action_type)
);
```

### Spam Detection

**Red Flags:**
- Same book shared to 20+ people in 1 hour
- Same message sent to 10+ people
- Recipient declines 80%+ of shares from sender
- Multiple users block the same sender

**Actions:**
- Temporary cooldown (1 hour)
- Warning notification
- Escalate to manual review if pattern continues
- Potential account suspension

### Block Functionality

**User Can Block:**
- Specific users (prevent all future shares)
- See list of blocked users
- Unblock at any time

**Database:**
```sql
CREATE TABLE blocked_users (
  blocker_user_id UUID REFERENCES auth.users(id),
  blocked_user_id UUID REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_user_id, blocked_user_id)
);
```

**Enforcement:**
- Check blocks before allowing share
- Blocked user never knows they're blocked (privacy)
- Share attempt silently fails with generic message

---

## 5. User Search & Discovery

### Search Restrictions

**Who Can Be Found:**
- ✅ Users with "Open" privacy setting
- ✅ Email verified accounts only
- ✅ Accounts 24+ hours old
- ✅ Users 13 years or older
- ❌ Suspended/banned accounts
- ❌ Users who have blocked you

**Search Functionality:**
- Search by name only (email not searchable for privacy)
- Fuzzy matching on names
- Max 20 results per search
- No bulk export of user list
- Email addresses never displayed in search results

**Search UI:**
```
┌─────────────────────────────────────────┐
│  🔍 Search users to share with          │
├─────────────────────────────────────────┤
│  [sarah johnson_______________] 🔍      │
│                                         │
│  Results (3):                           │
│                                         │
│  ✓ Sarah Johnson                        │
│    Member since Jan 2025                │
│    Favorite Genres: Mystery, Thriller   │
│                                         │
│  ✓ Sarah Chen                           │
│    Member since Dec 2024                │
│    Favorite Genres: Literary Fiction    │
│                                         │
│    Sarah Williams                       │
│    Member since Nov 2024                │
│    Already shared this book ✓           │
│                                         │
│  [Cancel]  [Share with 2 people]        │
└─────────────────────────────────────────┘
```

---

## 6. Notification & Communication

### Email Notifications (Optional)

**Recipient Receives:**
```
Subject: 📚 Sarah shared a book recommendation with you

Hi [Name],

Sarah Johnson shared a book recommendation with you on Sarah's Books:

"The Great Gatsby" by F. Scott Fitzgerald

Sarah's note: "I think you'd love this classic!"

[View Recommendation] [Manage Sharing Settings]

You can control who can share with you in your privacy settings.
```

**Frequency Controls:**
- Daily digest option (batch notifications)
- Instant notifications (default)
- Turn off email notifications entirely

### In-App Notifications

**Badge Count:**
- Show pending shares count in menu
- Clear when viewed

**Notification Center:**
- List of recent shares
- Mark as read
- Quick accept/decline

---

## 7. Profile Visibility & Discovery

### What Friends Can See

When a user searches for or receives a share from another user, they can see a **minimal profile** focused on book preferences:

**Visible Information:**
1. **Name** (required)
2. **Favorite Genres** (optional)
3. **Favorite Authors** (optional)
4. **Favorite Local Bookstore** (optional)
5. **Member Since** date
6. **Profile Photo** (if set)

**NOT Visible:**
- ❌ Full reading queue
- ❌ Reading history
- ❌ Books marked as read
- ❌ Private notes on books
- ❌ Email address (unless they share with you)
- ❌ Activity feed or timestamps
- ❌ Number of books read
- ❌ Social metrics (followers, likes, etc.)

### Profile States

#### **Empty Profile**
```
┌─────────────────────────────────────────┐
│  👤 Sarah Johnson                       │
│  Member since Jan 2025                  │
├─────────────────────────────────────────┤
│  📚 Book Preferences                    │
│                                         │
│  Sarah hasn't added their book          │
│  preferences yet.                       │
│                                         │
│  [Share a Book with Sarah]              │
└─────────────────────────────────────────┘
```

#### **Partially Complete Profile**
```
┌─────────────────────────────────────────┐
│  👤 Sarah Johnson                       │
│  Member since Jan 2025                  │
├─────────────────────────────────────────┤
│  📚 Book Preferences                    │
│                                         │
│  Favorite Genres:                       │
│  • Literary Fiction                     │
│  • Historical Fiction                   │
│                                         │
│  [Share a Book with Sarah]              │
└─────────────────────────────────────────┘
```

#### **Complete Profile**
```
┌─────────────────────────────────────────┐
│  👤 Sarah Johnson                       │
│  Member since Jan 2025                  │
├─────────────────────────────────────────┤
│  📚 Book Preferences                    │
│                                         │
│  Favorite Genres:                       │
│  • Literary Fiction                     │
│  • Historical Fiction                   │
│  • Magical Realism                      │
│                                         │
│  Favorite Authors:                      │
│  • Toni Morrison                        │
│  • Gabriel García Márquez               │
│  • Kazuo Ishiguro                       │
│                                         │
│  Local Bookstore:                       │
│  📍 City Lights Books, San Francisco    │
│                                         │
│  [Share a Book with Sarah]              │
└─────────────────────────────────────────┘
```

### Profile Completion Prompts

**Encourage users to complete profiles:**
- Show "Complete your profile" banner after signup
- Explain how it helps friends recommend better books
- Make it optional but incentivized
- Show completion percentage (e.g., "Profile 60% complete")

**Profile Setup Flow:**
```
┌─────────────────────────────────────────┐
│  📚 Help Friends Recommend Books        │
├─────────────────────────────────────────┤
│  Share your book preferences so friends │
│  can find books you'll love!            │
│                                         │
│  What genres do you enjoy?              │
│  [Literary Fiction_____________] +      │
│  [Historical Fiction___________] +      │
│                                         │
│  Who are your favorite authors?         │
│  [Toni Morrison________________] +      │
│  [Gabriel García Márquez_______] +      │
│                                         │
│  Do you have a favorite local bookstore?│
│  [City Lights Books____________]        │
│  [San Francisco________________]        │
│                                         │
│  [Skip for Now]  [Save & Continue]      │
└─────────────────────────────────────────┘
```

### Privacy Controls for Profile

**Users can control:**
- ✅ Hide specific preferences (e.g., show genres but hide authors)
- ✅ Make entire profile private (only name visible)
- ✅ Show/hide profile photo
- ✅ Show/hide local bookstore

---

## 8. Age Restrictions & COPPA Compliance

### Age Verification

**During Signup:**
```
┌─────────────────────────────────────────┐
│  Create Your Account                    │
├─────────────────────────────────────────┤
│  Email: [________________]              │
│  Password: [________________]           │
│  Name: [________________]               │
│                                         │
│  Date of Birth: [MM] [DD] [YYYY]        │
│                                         │
│  ⚠️  Users under 13 cannot create       │
│     accounts due to privacy laws.       │
│                                         │
│  [Create Account]                       │
└─────────────────────────────────────────┘
```

**Age-Based Feature Access:**

| Feature | Under 13 | 13-17 | 18+ |
|---------|----------|-------|-----|
| Browse books | ❌ | ✅ | ✅ |
| Create account | ❌ | ✅ | ✅ |
| Reading queue | ❌ | ✅ | ✅ |
| Receive shares (public links) | ❌ | ✅ | ✅ |
| Receive shares (direct) | ❌ | ❌ | ✅ |
| Send shares (any type) | ❌ | ❌ | ✅ |
| Profile search | ❌ | ❌ | ✅ |
| Be searchable | ❌ | ❌ | ✅ |

**Rationale:**
- **Under 13**: COPPA compliance - no accounts allowed
- **13-17**: Can use app and view public share links, but cannot participate in direct sharing (sender or recipient)
- **18+**: Full feature access including direct sharing

**Important Note:**
Direct sharing features (both sending and receiving) are restricted to users 18+ due to privacy and safety considerations. This requires additional due diligence around consent, data protection, and user safety that is more appropriate for adult users.

**Implementation:**
```sql
ALTER TABLE auth.users 
  ADD COLUMN date_of_birth DATE,
  ADD COLUMN age_verified BOOLEAN DEFAULT FALSE;

-- Function to check age eligibility
CREATE OR REPLACE FUNCTION check_sharing_eligibility(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_age INTEGER;
BEGIN
  SELECT EXTRACT(YEAR FROM AGE(date_of_birth)) 
  INTO user_age
  FROM auth.users 
  WHERE id = user_id;
  
  RETURN user_age >= 18;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**UI for Restricted Users (13-17):**
```
┌─────────────────────────────────────────┐
│  🔒 Feature Not Available               │
├─────────────────────────────────────────┤
│  Direct sharing is available for users  │
│  18 and older.                          │
│                                         │
│  You can still:                         │
│  • Receive book recommendations         │
│  • Use public share links               │
│  • Build your reading queue             │
│                                         │
│  [Learn More]  [OK]                     │
└─────────────────────────────────────────┘
```

---

## 9. Email Invitation System

### Inviting Non-Registered Users

**Use Case:** User wants to share a book with a friend who isn't on the platform yet.

**Flow:**
1. User enters email address in share modal
2. System checks if email is registered
3. If not registered, show invitation option
4. Send invitation email with book recommendation
5. Track invitation status

**Share Modal with Email Input:**
```
┌─────────────────────────────────────────┐
│  Share "The Great Gatsby"               │
├─────────────────────────────────────────┤
│  [Share via Link] [Share with Friends]  │
├─────────────────────────────────────────┤
│  Enter email or search users:           │
│  [friend@example.com___________] 🔍     │
│                                         │
│  ⓘ friend@example.com is not on        │
│     Sarah's Books yet.                  │
│                                         │
│  [✓] Send invitation to join            │
│                                         │
│  Personal note:                         │
│  [I think you'd love this!_____]        │
│                                         │
│  [Cancel]  [Send Invitation]            │
└─────────────────────────────────────────┘
```

**Invitation Email:**
```
Subject: 📚 Sarah wants to share a book with you

Hi there,

Sarah Johnson thinks you'd love this book:

"The Great Gatsby" by F. Scott Fitzgerald

Sarah's note: "I think you'd love this classic!"

Join Sarah's Books to view the full recommendation and 
discover more books from friends.

[View Recommendation & Join] (creates account + auto-accepts share)

---

What is Sarah's Books?
A book discovery platform where you can:
• Get personalized book recommendations
• Share books with friends
• Track your reading queue
• Discover new authors and genres

[Learn More]
```

**Invitation Tracking:**
```sql
CREATE TABLE email_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_email TEXT NOT NULL,
  book_title TEXT NOT NULL,
  book_author TEXT,
  personal_note TEXT,
  invitation_token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX idx_email_invitations_recipient ON email_invitations(recipient_email);
CREATE INDEX idx_email_invitations_token ON email_invitations(invitation_token);
```

**Invitation Limits:**
- Max 10 pending invitations per user
- Max 3 invitations to same email (prevent spam)
- Invitations expire after 30 days
- Track acceptance rate (flag low-quality inviters)

**Post-Signup Flow:**
```
User clicks invitation link
  ↓
Lands on signup page with pre-filled email
  ↓
Creates account
  ↓
Email auto-verified (came from invitation)
  ↓
Recommendation auto-added to "Books Shared with Me"
  ↓
Welcome message: "Sarah shared this book with you!"
```

---

## 10. 24-Hour Cooldown Mechanism

### Preventing Re-Share Spam

**Problem:** User shares book → recipient declines → user immediately re-shares

**Solution:** 24-hour cooldown after any share attempt to same recipient

**Implementation:**
```sql
-- Track share attempts
CREATE TABLE share_cooldowns (
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES user_recommendations(id) ON DELETE CASCADE,
  last_share_attempt TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (sender_user_id, recipient_user_id, recommendation_id)
);

-- Function to check cooldown
CREATE OR REPLACE FUNCTION check_share_cooldown(
  sender_id UUID,
  recipient_id UUID,
  rec_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  last_attempt TIMESTAMPTZ;
BEGIN
  SELECT last_share_attempt INTO last_attempt
  FROM share_cooldowns
  WHERE sender_user_id = sender_id
    AND recipient_user_id = recipient_id
    AND recommendation_id = rec_id;
  
  -- If no previous attempt, allow
  IF last_attempt IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if 24 hours have passed
  RETURN (NOW() - last_attempt) > INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**UI Feedback:**
```
┌─────────────────────────────────────────┐
│  ⏱️  Already Shared                     │
├─────────────────────────────────────────┤
│  You shared this book with Sarah        │
│  yesterday.                             │
│                                         │
│  You can share it again in 18 hours.    │
│                                         │
│  💡 Tip: Give them time to consider     │
│     your recommendation!                │
│                                         │
│  [OK]                                   │
└─────────────────────────────────────────┘
```

**Status Visibility:**
- Sender sees: "Delivered" (never "Declined")
- Sender cannot see if recipient viewed it
- Sender cannot see if recipient added to queue
- Maintains recipient privacy

**Exception:** If recipient explicitly requests the book again (future feature), cooldown is bypassed

---

## 11. Data Privacy & Compliance

### Data Stored

**Minimal Information:**
- Sender user ID (who shared)
- Recipient user ID (who received)
- Book details (title, author, note)
- Timestamp
- Status (pending/accepted/declined)

**NOT Stored:**
- Recipient's reading history (unless they accept)
- Sender's full profile
- Any personal data beyond name/email

### GDPR Compliance

**User Rights:**
- **Right to access**: Download all shares sent/received
- **Right to deletion**: Delete all share history
- **Right to object**: Block users, disable sharing
- **Right to portability**: Export share data

**Data Retention:**
- Declined shares: Keep for 90 days (spam detection)
- Accepted shares: Keep indefinitely (part of reading queue)
- Deleted shares: Permanently removed within 30 days

### Terms of Service Addition

**Required Clauses:**
```
Sharing Features:
- You may only share recommendations with users who have 
  consented to receive them
- Spam, harassment, or abuse of sharing features will result 
  in account suspension
- Recipients can block you at any time
- We reserve the right to limit or disable sharing for 
  accounts that violate these terms
```

---

## 8. Reporting & Moderation

### Report Mechanism

**Users Can Report:**
- Spam (unwanted repeated shares)
- Harassment (inappropriate content/behavior)
- Impersonation
- Other abuse

**Report Flow:**
```
┌─────────────────────────────────────────┐
│  🚩 Report Share                        │
├─────────────────────────────────────────┤
│  Why are you reporting this share?      │
│                                         │
│  ○ Spam (unwanted recommendations)      │
│  ○ Harassment or inappropriate content  │
│  ○ Impersonation                        │
│  ○ Other                                │
│                                         │
│  Additional details (optional):         │
│  [_________________________________]    │
│                                         │
│  [✓] Block this user                    │
│                                         │
│  [Cancel]  [Submit Report]              │
└─────────────────────────────────────────┘
```

### Admin Dashboard

**Moderation Tools:**
- View reported shares
- See user's sharing history
- Suspend sharing privileges
- Ban accounts (extreme cases)
- View spam detection flags

**Metrics to Monitor:**
- Reports per user
- Block rate
- Decline rate
- Shares per day (detect spam patterns)

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1)
- ✅ Privacy settings table and UI
- ✅ User search functionality
- ✅ Basic direct share (no rate limiting yet)
- ✅ Block functionality
- ✅ Consent prompts

### Phase 2: Safety (Week 2)
- ✅ Rate limiting implementation
- ✅ Spam detection
- ✅ Report mechanism
- ✅ Admin moderation tools

### Phase 3: Polish (Week 3)
- ✅ Email notifications
- ✅ In-app notification center
- ✅ Analytics and monitoring
- ✅ User education (tooltips, help docs)

---

## 12. What This Platform IS and ISN'T

### ✅ This IS:
- **A book discovery tool** - Help friends find their next great read
- **A reading companion** - Track books you want to read
- **A recommendation engine** - Get personalized suggestions
- **A connection point** - Share meaningful books with people you care about
- **A local bookstore supporter** - Promote indie bookstores

### ❌ This is NOT:
- **Social media** - No public feeds, likes, or follower counts
- **A reading competition** - No leaderboards or "books read" metrics
- **A review platform** - Focus on personal recommendations, not public reviews
- **A messaging app** - No direct messages or chat features
- **A dating app** - No profile browsing for social purposes
- **A marketing platform** - No promotional content or influencer features

### Design Implications:

**No Public Activity:**
- No "recently read" feed
- No "most popular books" lists
- No user rankings or badges
- No public comment threads

**Privacy-First:**
- Profiles are minimal and opt-in
- Reading history is private
- No tracking of "who viewed your profile"
- No social graph visualization

**Book-Focused:**
- Every feature centers on books
- Conversations happen around specific recommendations
- No off-topic discussions
- No user-generated content beyond book notes

**Quality Over Quantity:**
- Encourage thoughtful recommendations
- Limit sharing frequency (prevent spam)
- No bulk actions or automation
- Personal notes are encouraged

---

## 13. Database Schema

### New Tables

```sql
-- User privacy settings
CREATE TABLE user_privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sharing_privacy TEXT DEFAULT 'private', -- 'private' or 'open'
  allow_direct_shares BOOLEAN DEFAULT FALSE,
  max_shares_per_sender_per_day INTEGER DEFAULT 10,
  email_notifications BOOLEAN DEFAULT TRUE,
  email_notification_frequency TEXT DEFAULT 'instant', -- 'instant' or 'daily'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profile preferences (book-related only)
CREATE TABLE user_profile_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  favorite_genres TEXT[], -- Array of genre names
  favorite_authors TEXT[], -- Array of author names
  favorite_bookstore_name TEXT,
  favorite_bookstore_location TEXT,
  show_genres BOOLEAN DEFAULT TRUE,
  show_authors BOOLEAN DEFAULT TRUE,
  show_bookstore BOOLEAN DEFAULT TRUE,
  profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Direct shares tracking
CREATE TABLE direct_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recommendation_id UUID REFERENCES user_recommendations(id) ON DELETE CASCADE NOT NULL,
  book_title TEXT NOT NULL,
  book_author TEXT,
  personal_note TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- Blocked users
CREATE TABLE blocked_users (
  blocker_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_user_id, blocked_user_id)
);

-- Rate limiting
CREATE TABLE share_rate_limits (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT, -- 'send' or 'receive'
  count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, action_type)
);

-- Reports
CREATE TABLE share_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  direct_share_id UUID REFERENCES direct_shares(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved'
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Email invitations (added from section 9)
CREATE TABLE email_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_email TEXT NOT NULL,
  book_title TEXT NOT NULL,
  book_author TEXT,
  personal_note TEXT,
  invitation_token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

-- Share cooldowns (added from section 10)
CREATE TABLE share_cooldowns (
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES user_recommendations(id) ON DELETE CASCADE,
  last_share_attempt TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (sender_user_id, recipient_user_id, recommendation_id)
);

-- Indexes
CREATE INDEX idx_direct_shares_recipient ON direct_shares(recipient_user_id, status);
CREATE INDEX idx_direct_shares_sender ON direct_shares(sender_user_id);
CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_user_id);
CREATE INDEX idx_share_reports_status ON share_reports(status);
CREATE INDEX idx_email_invitations_recipient ON email_invitations(recipient_email);
CREATE INDEX idx_email_invitations_token ON email_invitations(invitation_token);
CREATE INDEX idx_user_profile_preferences_user ON user_profile_preferences(user_id);
```

### RLS Policies

```sql
-- Privacy settings: users can only view/edit their own
CREATE POLICY "Users manage own privacy settings"
  ON user_privacy_settings
  FOR ALL
  USING (auth.uid() = user_id);

-- Profile preferences: users can only view/edit their own
CREATE POLICY "Users manage own profile preferences"
  ON user_profile_preferences
  FOR ALL
  USING (auth.uid() = user_id);

-- Profile preferences: searchable users can be viewed by others
CREATE POLICY "View searchable user profiles"
  ON user_profile_preferences
  FOR SELECT
  USING (
    user_id IN (
      SELECT user_id FROM user_privacy_settings 
      WHERE sharing_privacy = 'open' AND allow_direct_shares = TRUE
    )
  );

-- Direct shares: users can view shares they sent or received
CREATE POLICY "Users view own shares"
  ON direct_shares
  FOR SELECT
  USING (auth.uid() = sender_user_id OR auth.uid() = recipient_user_id);

-- Direct shares: users can create shares (with server-side validation)
CREATE POLICY "Users create shares"
  ON direct_shares
  FOR INSERT
  WITH CHECK (auth.uid() = sender_user_id);

-- Blocked users: users manage their own blocks
CREATE POLICY "Users manage own blocks"
  ON blocked_users
  FOR ALL
  USING (auth.uid() = blocker_user_id);

-- Email invitations: users can view their own sent invitations
CREATE POLICY "Users view own invitations"
  ON email_invitations
  FOR SELECT
  USING (auth.uid() = sender_user_id);

-- Email invitations: users can create invitations
CREATE POLICY "Users create invitations"
  ON email_invitations
  FOR INSERT
  WITH CHECK (auth.uid() = sender_user_id);

-- Share cooldowns: users can view their own cooldowns
CREATE POLICY "Users view own cooldowns"
  ON share_cooldowns
  FOR SELECT
  USING (auth.uid() = sender_user_id);

-- Reports: users can create reports, admins can view all
CREATE POLICY "Users create reports"
  ON share_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_user_id);
```

---

## 11. Security Considerations

### Input Validation
- Sanitize all user input (names, notes, search queries)
- Prevent SQL injection
- Limit message length (max 500 characters)
- Strip HTML/scripts from notes

### Authentication
- Require email verification to share
- Check auth on every share action
- Validate user IDs server-side

### Authorization
- Check privacy settings before showing in search
- Verify recipient allows direct shares
- Check block list before allowing share
- Enforce rate limits server-side (not just client)

### Audit Logging
- Log all share attempts (success and failure)
- Log privacy setting changes
- Log blocks and reports
- Retain logs for 90 days (compliance)

---

## 12. User Education

### Onboarding
- Explain sharing features on first use
- Show privacy settings during account setup
- Provide examples of good sharing etiquette

### Help Documentation
- "How to share with friends"
- "Managing your privacy"
- "What to do if you receive spam"
- "Blocking and reporting users"

### In-App Tooltips
```
┌─────────────────────────────────────────┐
│  💡 Tip: Sharing Etiquette              │
├─────────────────────────────────────────┤
│  • Only share with people you know      │
│  • Respect if someone declines          │
│  • Don't spam the same person           │
│  • Add a personal note to explain why   │
│    you're recommending the book         │
└─────────────────────────────────────────┘
```

---

## 13. Success Metrics

### Healthy Usage
- Share acceptance rate > 50%
- Block rate < 1%
- Report rate < 0.1%
- Average shares per user: 5-10/week

### Red Flags
- Share acceptance rate < 30% (spam problem)
- Block rate > 5% (abuse problem)
- Report rate > 1% (moderation needed)
- Single user sending 100+ shares/day (spam bot)

### Analytics to Track
- Daily active sharers
- Shares sent/received
- Acceptance vs decline rate
- Time to respond to share
- Most shared books
- User privacy setting distribution

---

## 14. Rollout Plan

### Beta Testing (Week 1)
- Enable for 50 trusted users
- Monitor closely for issues
- Gather feedback
- Adjust rate limits if needed

### Gradual Rollout (Week 2-3)
- Enable for 10% of users
- Monitor metrics
- Scale to 50% if healthy
- Full rollout if no issues

### Communication
- Announce feature in email newsletter
- Blog post explaining privacy controls
- In-app banner for new feature
- Update terms of service

---

## 15. Future Enhancements

### Phase 2 Features (Post-Launch)
- Share collections (multiple books at once)
- Group sharing (book clubs)
- Scheduled shares (send later)
- Share templates (common notes)
- Enhanced profile pages with reading stats

### Advanced Privacy
- Anonymous sharing (hide sender identity)
- Temporary shares (expire after 30 days)
- Read receipts (optional)
- Share analytics (who viewed, accepted)

---

## 16. Risk Assessment

### High Risk
- **Spam/abuse**: Mitigated by rate limiting, blocks, reports
- **Privacy violations**: Mitigated by opt-in, granular controls
- **Harassment**: Mitigated by block, report, moderation

### Medium Risk
- **User confusion**: Mitigated by clear UI, tooltips, help docs
- **Technical bugs**: Mitigated by thorough testing, gradual rollout
- **Performance issues**: Mitigated by proper indexing, caching

### Low Risk
- **Feature adoption**: Mitigated by user education, good UX
- **Legal compliance**: Mitigated by GDPR-compliant design

---

## 17. Decisions Made

1. **Email verification required**: ✅ YES - Users must verify email before sharing (prevents spam bots)
2. **Declined shares visibility**: ✅ HIDDEN - Sender only sees "Delivered", cannot re-share for 24 hours
3. **Default privacy setting**: ✅ PRIVATE - Users must explicitly opt-in to be discoverable
4. **Non-registered email invites**: ✅ YES - Send invitation to join and view recommendation
5. **Account age requirement**: ✅ YES - 24 hours old before sharing enabled
6. **Age restriction**: ✅ YES - Users under 18 cannot use direct sharing features (COPPA compliance for under 13, additional safety for under 18)

---

## 18. Cleanup & Existing Features

### A. "Books Shared with Me" - Keep or Cull?

**Current State:**
- ✅ Fully functional page with Accept/Decline actions
- ✅ Works with public share links (auto-creates inbox entry)
- ✅ Three tabs: Pending, Accepted, Declined
- ✅ Users may already have recommendations in their inbox

**Decision: KEEP IT**

**Rationale:**
- Already working and providing value
- No reason to remove working functionality
- Can enhance incrementally for direct sharing
- Avoids user confusion and data loss
- Existing recommendations preserved

**Required Updates:**
1. **Rename:** "Books Shared with Me" → "Recommendations Inbox"
2. **Add disclaimer:** "This inbox is for book recommendations only, not a messaging or chat feature"
3. **Update tab labels:** "Pending" → "New Recommendations", "Accepted" → "Added to Queue", "Declined" → "Not Interested"
4. **Enhance empty state:** Add education about how recommendations work
5. **Add visual indicators:** Book icons to emphasize this is about books, not messages

### B. Features to Remove

**1. "Recommend" Button from Queue**
- Currently creates recommendation but doesn't share it
- Confusing intermediate step
- **Action:** Remove and replace with direct "Share" button

**2. Requirement to Visit "Books I've Shared"**
- No longer needed with simplified flow
- **Action:** Make it a history/record page only, not a required step

### C. Features to Update

**1. Share Button - Add Everywhere**
- Add to: search results, book detail pages, reading queue, collection
- Opens share modal directly
- No intermediate steps

**2. "Books I've Shared" Page**
- Rename to "Sharing History"
- Show both public link shares and direct shares
- Display share method and status

**3. Navigation Menu Labels**
- "Books Shared with Me" → "Recommendations Inbox"
- "Books I've Shared" → "Sharing History"
- Emphasize book focus, not social/messaging

### D. Copy/Messaging Guidelines

**Throughout the App:**
- ❌ Never use: "message", "chat", "DM", "conversation"
- ✅ Always use: "book recommendation", "personal note about this book", "recommendations inbox"
- ✅ Add disclaimers: "This is for book recommendations only, not a messaging platform"

**Key Principle:**
Make it crystal clear this is a **book discovery platform**, not a social media or messaging app.

---

## Summary

This spec prioritizes **consent, privacy, and safety** through:
- ✅ Opt-in privacy controls (default private)
- ✅ Email verification required for sharing
- ✅ Age restrictions (18+ for all direct sharing features)
- ✅ 24-hour cooldown to prevent re-share spam
- ✅ Rate limiting and spam prevention
- ✅ Block and report functionality
- ✅ Transparent sender information (but hidden decline status)
- ✅ Email invitation system for non-registered users
- ✅ Minimal profile visibility (book preferences only)
- ✅ User education and clear communication
- ✅ GDPR compliance
- ✅ Moderation tools for admins

**Core Philosophy:**
This is a **book discovery platform**, not social media. Features focus on meaningful book recommendations between friends, with no public feeds, social metrics, or activity tracking.

**Key Decisions Made:**
1. ✅ Email verification required before sharing
2. ✅ Declined shares hidden from sender (24hr cooldown)
3. ✅ Default privacy: Private (opt-in to be searchable)
4. ✅ Email invitations enabled for non-registered users
5. ✅ Account must be 24+ hours old to share
6. ✅ Age restrictions: Under 13 blocked, 13-17 receive only, 18+ full access

**Profile Visibility:**
- Name (required)
- Favorite Genres (optional)
- Favorite Authors (optional)
- Favorite Local Bookstore (optional)
- Member Since date
- Profile Photo (optional)

**NOT Visible:**
- Reading queue, history, or activity
- Social metrics or statistics
- Email address (unless sharing)
- Private notes or timestamps

**Next Steps:**
1. ✅ Spec approved with user decisions
2. Begin Phase 1 implementation (privacy settings, user search, basic sharing)
3. Set up age verification in signup flow
4. Create profile preferences UI
5. Implement email invitation system
6. Set up monitoring and analytics
7. Prepare user communication materials
