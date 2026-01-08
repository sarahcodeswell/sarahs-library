# User Onboarding Flow Specification

## Current Onboarding Flow

### 1. **Authentication Entry Points**
Users can trigger authentication from multiple locations:
- Homepage navigation links (Add Books, Reading Queue, My Collection)
- "Update Profile" link (when visible)
- Any feature requiring authentication (e.g., adding books, creating queue)
- Direct navigation to protected pages

### 2. **Authentication Modal (AuthModal.jsx)**

**Step 1: Sign In/Sign Up**
- **Modal Title:** "Welcome"
- **Description:** "Discover great reads, build your library, and share recommendations"
- **Authentication Options:**
  - Google OAuth (primary)
  - Apple OAuth (coming soon - disabled)
  - Magic Link via email
- **No distinction between sign-in and sign-up** - same flow for both

**Step 2: Magic Link Sent (if email used)**
- **Modal Title:** "Check Your Email"
- **Message:** "Magic link sent to {email}"
- **Instructions:** "Click the link in your email to sign in. You can close this window."
- **Option:** "Use a different email" link

### 3. **Post-Authentication (UserContext.jsx)**

**On SIGNED_IN or SIGNED_UP event:**
1. User session is established
2. User object is set in context
3. Referral code is checked and recorded (if present in localStorage)
4. User type is fetched from taste_profiles table
5. Taste profile is auto-created with:
   - Auto-generated referral code
   - Empty arrays for preferences
   - User ID

**Current State:**
- ✅ User is immediately authenticated
- ✅ Can access all features
- ❌ No explicit profile completion step
- ❌ No Community Guidelines acceptance
- ❌ No Terms of Use acceptance

### 4. **Profile Management (UserProfile.jsx)**

Users can access their profile via:
- Clicking "Update Profile" link (when available)
- Opening the auth modal when already logged in

**Profile Fields (Optional):**
- Profile photo
- Reading preferences (text)
- Favorite authors (list)
- Birth year
- Location (city, state, country)
- Favorite genres (multi-select)
- Favorite bookstore (searchable)
- Referral code (auto-generated, editable)

**Current Behavior:**
- All fields are optional
- No required fields
- No onboarding wizard
- Users can skip profile entirely

---

## Recommended: Community Guidelines Acceptance Flow

### Option A: Inline Acceptance in Auth Modal (RECOMMENDED)

**Placement:** Add to AuthModal.jsx before authentication methods

**Pros:**
- Non-disruptive - user sees it before choosing auth method
- Single step - no additional modal
- Clear consent before account creation
- Follows industry best practices (similar to Google, Apple, etc.)

**Cons:**
- Slightly longer auth modal
- Adds text to read before sign-in

**Implementation:**
```jsx
// Add before OAuth buttons in AuthModal.jsx
<div className="mb-6 p-4 bg-[#F8F6EE] rounded-lg border border-[#E8EBE4]">
  <p className="text-sm text-[#5F7252] leading-relaxed">
    By continuing, you agree to our{' '}
    <button
      onClick={() => window.open('/our-practices', '_blank')}
      className="text-[#5F7252] underline hover:text-[#4A5940]"
    >
      Community Guidelines
    </button>
    {' '}and{' '}
    <button
      onClick={() => window.open('/terms-of-use', '_blank')}
      className="text-[#5F7252] underline hover:text-[#4A5940]"
    >
      Terms of Use
    </button>
    .
  </p>
</div>
```

### Option B: Post-Authentication Welcome Modal

**Placement:** Show modal immediately after first successful authentication

**Pros:**
- Dedicated focus on guidelines
- Can include more detail
- User is already committed to creating account

**Cons:**
- Extra step after authentication
- Could feel like friction
- User might skip/dismiss quickly

**Implementation:**
- Detect first-time user (check if taste_profile.created_at is recent)
- Show welcome modal with Community Guidelines
- Require explicit "I Agree" button
- Store acceptance timestamp in taste_profiles table

### Option C: Profile Completion Step

**Placement:** Required step before accessing features

**Pros:**
- Can combine with other profile setup
- Natural place for guidelines acceptance
- Can make it feel like part of setup

**Cons:**
- Most disruptive option
- Delays feature access
- Could increase abandonment

---

## Recommendation: Option A (Inline in Auth Modal)

**Why this is best:**
1. **Industry Standard:** Matches patterns users expect (Google, Twitter, etc.)
2. **Minimal Friction:** No extra steps or modals
3. **Clear Consent:** User sees and agrees before account creation
4. **Legal Compliance:** Explicit consent before data collection
5. **Non-Disruptive:** Doesn't interrupt user flow

**User Experience:**
```
1. User clicks "Add Books" or "Reading Queue"
2. Auth modal opens
3. User sees: "By continuing, you agree to our Community Guidelines and Terms of Use"
4. User chooses auth method (Google/Email)
5. User is authenticated
6. User can immediately use features
```

**No additional steps needed** - clean, simple, compliant.

---

## Implementation Checklist

### Phase 1: Update Community Guidelines Text
- [x] Replace "Respect Diverse Perspectives" with "Mind the Gap"
- [ ] Deploy to production

### Phase 2: Add Acceptance to Auth Modal
- [ ] Add guidelines acceptance text to AuthModal.jsx
- [ ] Make links open in new tab
- [ ] Test on mobile and desktop
- [ ] Deploy to production

### Phase 3: Optional - Track Acceptance (Future)
- [ ] Add `guidelines_accepted_at` field to taste_profiles table
- [ ] Store timestamp when user first authenticates
- [ ] Use for analytics/compliance tracking

---

## Technical Notes

**Database Schema (Optional Enhancement):**
```sql
ALTER TABLE taste_profiles 
ADD COLUMN guidelines_accepted_at TIMESTAMP DEFAULT NOW();
```

**Tracking:**
- Can track acceptance via auth event timestamp
- No explicit checkbox needed (implicit via "By continuing...")
- Follows standard OAuth consent pattern

**Legal Compliance:**
- Explicit consent before account creation ✅
- Links to full guidelines and terms ✅
- User can review before proceeding ✅
- Standard industry practice ✅
