# Development & Testing Plan
## "Read with Friends" Feature - Branching Strategy, Testing, and Pre-Build Checklist

---

## Table of Contents
1. [Git Branching Strategy](#git-branching-strategy)
2. [Automated Testing Setup](#automated-testing-setup)
3. [Demo Accounts & Test Data](#demo-accounts-test-data)
4. [Pre-Build Checklist (What a Seasoned PM Would Do)](#pre-build-checklist)
5. [Site-Wide Messaging & Privacy Updates](#site-wide-messaging-privacy-updates)
6. [QA & Testing Checklist](#qa-testing-checklist)
7. [Deployment Strategy](#deployment-strategy)

---

## 1. Git Branching Strategy

### Recommended Approach: Feature Branch with Staging

```
main (production)
  ↓
staging (pre-production testing)
  ↓
feature/read-with-friends (development)
  ↓
feature/read-with-friends-phase-1 (foundation)
feature/read-with-friends-phase-2 (safety)
feature/read-with-friends-phase-3 (polish)
```

### Branch Structure

#### **main** (Protected)
- Production-ready code only
- Requires PR approval
- All tests must pass
- No direct commits

#### **staging** (Protected)
- Pre-production environment
- Mirrors production setup
- Used for final testing before release
- Deployed to staging URL (e.g., staging.sarahsbooks.com)

#### **feature/read-with-friends** (Main Feature Branch)
- All feature work happens here or in sub-branches
- Merges to staging for testing
- Only merges to main after full QA approval

#### **Sub-Feature Branches** (Optional)
- `feature/read-with-friends-phase-1` - Foundation work
- `feature/read-with-friends-phase-2` - Safety features
- `feature/read-with-friends-phase-3` - Polish
- Merge to main feature branch when complete

### Workflow

```bash
# 1. Create main feature branch from main
git checkout main
git pull origin main
git checkout -b feature/read-with-friends

# 2. Push feature branch
git push -u origin feature/read-with-friends

# 3. Create sub-branches for each phase (optional)
git checkout -b feature/read-with-friends-phase-1

# 4. Work on feature, commit regularly
git add .
git commit -m "feat: add user privacy settings table and UI"
git push

# 5. When phase complete, merge to main feature branch
git checkout feature/read-with-friends
git merge feature/read-with-friends-phase-1

# 6. When feature complete, create PR to staging
# (via GitHub UI)
# PR: feature/read-with-friends → staging

# 7. Test thoroughly on staging environment

# 8. When staging tests pass, create PR to main
# PR: staging → main

# 9. Deploy to production
```

### Branch Protection Rules

**For `main` branch:**
```yaml
Required:
  - At least 1 approval
  - All status checks pass
  - Branch is up to date
  - No force pushes
  - No deletions
```

**For `staging` branch:**
```yaml
Required:
  - All status checks pass
  - Branch is up to date
  - No force pushes
```

**For `feature/read-with-friends` branch:**
```yaml
Optional:
  - Status checks pass (recommended)
  - Allow force pushes (for rebasing)
```

### Commit Message Convention

Use conventional commits for clear history:

```
feat: add user search functionality
fix: correct age verification logic
docs: update direct sharing spec
test: add integration tests for rate limiting
refactor: simplify share modal component
style: update recommendations inbox UI
chore: update dependencies
```

---

## 2. Automated Testing Setup

### Test Strategy

**Three Levels of Testing:**
1. **Unit Tests** - Individual functions and components
2. **Integration Tests** - Database, API, and feature flows
3. **End-to-End Tests** - Full user journeys

### Test Files Structure

```
/tests
  /unit
    - userSearch.test.js
    - ageVerification.test.js
    - rateLimit.test.js
    - shareModal.test.js
  /integration
    - directSharing.integration.test.js
    - notifications.integration.test.js
    - privacySettings.integration.test.js
    - emailInvitations.integration.test.js
  /e2e
    - shareBookFlow.e2e.test.js
    - acceptRecommendation.e2e.test.js
    - blockUser.e2e.test.js
  /fixtures
    - testUsers.js
    - testBooks.js
    - testRecommendations.js
```

### Automated Test Scripts

#### A. Integration Tests for Direct Sharing

**File:** `/tests/integration/directSharing.integration.test.js`

```javascript
import { createClient } from '@supabase/supabase-js';
import { testUsers, cleanupTestData } from '../fixtures/testUsers';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

describe('Direct Sharing Integration Tests', () => {
  let testUserA, testUserB, testUserC;

  beforeAll(async () => {
    // Create test users
    testUserA = await createTestUser('alice@test.com', '1990-01-01'); // 18+
    testUserB = await createTestUser('bob@test.com', '1995-05-15'); // 18+
    testUserC = await createTestUser('charlie@test.com', '2010-03-20'); // Under 18
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData([testUserA.id, testUserB.id, testUserC.id]);
  });

  describe('Age Verification', () => {
    test('18+ user can access direct sharing', async () => {
      const { data, error } = await supabase.rpc('check_sharing_eligibility', {
        user_id: testUserA.id
      });
      
      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    test('Under 18 user cannot access direct sharing', async () => {
      const { data, error } = await supabase.rpc('check_sharing_eligibility', {
        user_id: testUserC.id
      });
      
      expect(error).toBeNull();
      expect(data).toBe(false);
    });
  });

  describe('Privacy Settings', () => {
    test('New user defaults to private', async () => {
      const { data } = await supabase
        .from('user_privacy_settings')
        .select('sharing_privacy')
        .eq('user_id', testUserA.id)
        .single();
      
      expect(data.sharing_privacy).toBe('private');
    });

    test('User can update privacy to open', async () => {
      const { error } = await supabase
        .from('user_privacy_settings')
        .update({ sharing_privacy: 'open', allow_direct_shares: true })
        .eq('user_id', testUserA.id);
      
      expect(error).toBeNull();
    });

    test('Private user not searchable', async () => {
      const { data } = await supabase.rpc('search_users', {
        query: 'bob',
        current_user_id: testUserA.id
      });
      
      expect(data).not.toContainEqual(
        expect.objectContaining({ user_id: testUserB.id })
      );
    });

    test('Open user is searchable', async () => {
      // Set Bob to open
      await supabase
        .from('user_privacy_settings')
        .update({ sharing_privacy: 'open', allow_direct_shares: true })
        .eq('user_id', testUserB.id);

      const { data } = await supabase.rpc('search_users', {
        query: 'bob',
        current_user_id: testUserA.id
      });
      
      expect(data).toContainEqual(
        expect.objectContaining({ user_id: testUserB.id })
      );
    });
  });

  describe('Direct Share Creation', () => {
    test('User can share book with another user', async () => {
      const { data, error } = await supabase
        .from('direct_shares')
        .insert({
          sender_user_id: testUserA.id,
          recipient_user_id: testUserB.id,
          recommendation_id: 'test-rec-id',
          book_title: 'Test Book',
          book_author: 'Test Author',
          personal_note: 'You should read this!'
        })
        .select()
        .single();
      
      expect(error).toBeNull();
      expect(data.status).toBe('pending');
    });

    test('Share creates inbox entry for recipient', async () => {
      const { data } = await supabase
        .from('received_recommendations')
        .select('*')
        .eq('user_id', testUserB.id)
        .eq('share_type', 'direct')
        .single();
      
      expect(data).toBeTruthy();
      expect(data.book_title).toBe('Test Book');
    });
  });

  describe('Rate Limiting', () => {
    test('User can share up to 50 books per day', async () => {
      // Create 50 shares
      const shares = Array.from({ length: 50 }, (_, i) => ({
        sender_user_id: testUserA.id,
        recipient_user_id: testUserB.id,
        recommendation_id: `rec-${i}`,
        book_title: `Book ${i}`,
      }));

      const { error } = await supabase
        .from('direct_shares')
        .insert(shares);
      
      expect(error).toBeNull();
    });

    test('51st share is blocked by rate limit', async () => {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        user_id: testUserA.id,
        action_type: 'send'
      });
      
      expect(data).toBe(false); // Rate limit exceeded
    });
  });

  describe('24-Hour Cooldown', () => {
    test('Cannot re-share same book within 24 hours', async () => {
      // First share
      await supabase.from('direct_shares').insert({
        sender_user_id: testUserA.id,
        recipient_user_id: testUserB.id,
        recommendation_id: 'cooldown-test',
        book_title: 'Cooldown Test Book',
      });

      // Try to share again immediately
      const { data } = await supabase.rpc('check_share_cooldown', {
        sender_id: testUserA.id,
        recipient_id: testUserB.id,
        rec_id: 'cooldown-test'
      });
      
      expect(data).toBe(false); // Cooldown active
    });
  });

  describe('Blocking', () => {
    test('User can block another user', async () => {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_user_id: testUserB.id,
          blocked_user_id: testUserA.id,
          reason: 'spam'
        });
      
      expect(error).toBeNull();
    });

    test('Blocked user cannot share with blocker', async () => {
      const { data } = await supabase.rpc('check_sharing_eligibility', {
        sender_id: testUserA.id,
        recipient_id: testUserB.id
      });
      
      expect(data).toBe(false); // Blocked
    });

    test('Blocked user not in search results', async () => {
      const { data } = await supabase.rpc('search_users', {
        query: 'bob',
        current_user_id: testUserA.id
      });
      
      expect(data).not.toContainEqual(
        expect.objectContaining({ user_id: testUserB.id })
      );
    });
  });
});
```

#### B. End-to-End Tests with Playwright

**File:** `/tests/e2e/shareBookFlow.e2e.test.js`

```javascript
import { test, expect } from '@playwright/test';
import { testUsers } from '../fixtures/testUsers';

test.describe('Share Book Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('http://localhost:3000');
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', testUsers.alice.email);
    await page.fill('input[type="password"]', testUsers.alice.password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('http://localhost:3000/home');
  });

  test('User can share book via direct sharing', async ({ page }) => {
    // Search for a book
    await page.fill('input[placeholder*="Search"]', 'The Great Gatsby');
    await page.click('button:has-text("Search")');
    
    // Click share button on first result
    await page.click('button:has-text("Share")').first();
    
    // Share modal should open
    await expect(page.locator('text=Share Book')).toBeVisible();
    
    // Click "Share with Friends" tab
    await page.click('text=Share with Friends');
    
    // Search for user
    await page.fill('input[placeholder*="Search users"]', 'Bob');
    
    // Select user from results
    await page.click('text=Bob Smith');
    
    // Add personal note
    await page.fill('textarea[placeholder*="note"]', 'You should read this!');
    
    // Click send
    await page.click('button:has-text("Send to 1 person")');
    
    // Success message
    await expect(page.locator('text=Shared with Bob')).toBeVisible();
  });

  test('Recipient receives notification', async ({ page, context }) => {
    // Open new page as Bob
    const bobPage = await context.newPage();
    await bobPage.goto('http://localhost:3000');
    await bobPage.click('text=Sign In');
    await bobPage.fill('input[type="email"]', testUsers.bob.email);
    await bobPage.fill('input[type="password"]', testUsers.bob.password);
    await bobPage.click('button:has-text("Sign In")');
    
    // Check for notification badge
    await expect(bobPage.locator('text=Recommendations Inbox')).toContainText('1');
    
    // Click inbox
    await bobPage.click('text=Recommendations Inbox');
    
    // See recommendation
    await expect(bobPage.locator('text=The Great Gatsby')).toBeVisible();
    await expect(bobPage.locator('text=from Alice')).toBeVisible();
  });

  test('Recipient can accept recommendation', async ({ page }) => {
    // Navigate to inbox
    await page.click('text=Recommendations Inbox');
    
    // Click accept on first recommendation
    await page.click('button:has-text("Add to Queue")').first();
    
    // Book added to queue
    await expect(page.locator('text=Added to queue')).toBeVisible();
    
    // Navigate to queue
    await page.click('text=My Queue');
    
    // Book should be in queue
    await expect(page.locator('text=The Great Gatsby')).toBeVisible();
  });
});
```

### Test Data Fixtures

**File:** `/tests/fixtures/testUsers.js`

```javascript
export const testUsers = {
  alice: {
    email: 'alice.test@sarahsbooks.com',
    password: 'TestPassword123!',
    name: 'Alice Johnson',
    dateOfBirth: '1990-01-01',
    privacy: 'open'
  },
  bob: {
    email: 'bob.test@sarahsbooks.com',
    password: 'TestPassword123!',
    name: 'Bob Smith',
    dateOfBirth: '1995-05-15',
    privacy: 'open'
  },
  charlie: {
    email: 'charlie.test@sarahsbooks.com',
    password: 'TestPassword123!',
    name: 'Charlie Davis',
    dateOfBirth: '2010-03-20', // Under 18
    privacy: 'private'
  },
  admin: {
    email: 'admin.test@sarahsbooks.com',
    password: 'AdminPassword123!',
    name: 'Admin User',
    role: 'admin'
  }
};

export async function createTestUser(supabase, userData) {
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true,
    user_metadata: {
      name: userData.name,
      date_of_birth: userData.dateOfBirth
    }
  });

  if (authError) throw authError;

  // Create privacy settings
  await supabase.from('user_privacy_settings').insert({
    user_id: authData.user.id,
    sharing_privacy: userData.privacy,
    allow_direct_shares: userData.privacy === 'open'
  });

  return authData.user;
}

export async function cleanupTestData(supabase, userIds) {
  // Delete in correct order (respect foreign keys)
  await supabase.from('direct_shares').delete().in('sender_user_id', userIds);
  await supabase.from('direct_shares').delete().in('recipient_user_id', userIds);
  await supabase.from('blocked_users').delete().in('blocker_user_id', userIds);
  await supabase.from('user_privacy_settings').delete().in('user_id', userIds);
  await supabase.from('user_profile_preferences').delete().in('user_id', userIds);
  
  // Delete auth users
  for (const userId of userIds) {
    await supabase.auth.admin.deleteUser(userId);
  }
}
```

### Test Commands

**Update `package.json`:**

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:e2e": "playwright test",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "npm run test:all -- --ci --coverage"
  }
}
```

---

## 3. Demo Accounts & Test Data

### Supabase Test Accounts Setup

**Create these test accounts in Supabase:**

```sql
-- Script to create test accounts
-- Run in Supabase SQL Editor

-- 1. Alice (18+, Open Privacy, Active Sharer)
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data
) VALUES (
  'alice.test@sarahsbooks.com',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  '{"name": "Alice Johnson", "date_of_birth": "1990-01-01"}'::jsonb
);

-- Get Alice's ID
DO $$
DECLARE
  alice_id UUID;
BEGIN
  SELECT id INTO alice_id FROM auth.users WHERE email = 'alice.test@sarahsbooks.com';
  
  -- Privacy settings
  INSERT INTO user_privacy_settings (user_id, sharing_privacy, allow_direct_shares)
  VALUES (alice_id, 'open', TRUE);
  
  -- Profile preferences
  INSERT INTO user_profile_preferences (
    user_id,
    favorite_genres,
    favorite_authors,
    favorite_bookstore_name,
    profile_completed
  ) VALUES (
    alice_id,
    ARRAY['Mystery', 'Thriller', 'Literary Fiction'],
    ARRAY['Agatha Christie', 'Gillian Flynn'],
    'The Book Nook',
    TRUE
  );
END $$;

-- 2. Bob (18+, Open Privacy, Active Receiver)
-- [Similar structure for Bob]

-- 3. Charlie (Under 18, Private)
-- [Similar structure for Charlie]

-- 4. Admin User
-- [Similar structure with admin role]
```

### Test Data: Books

```sql
-- Create test recommendations
INSERT INTO user_recommendations (
  user_id,
  book_title,
  book_author,
  book_isbn,
  recommendation_note,
  status
) VALUES
  ((SELECT id FROM auth.users WHERE email = 'alice.test@sarahsbooks.com'),
   'The Great Gatsby',
   'F. Scott Fitzgerald',
   '9780743273565',
   'A classic American novel',
   'active'),
  
  ((SELECT id FROM auth.users WHERE email = 'alice.test@sarahsbooks.com'),
   '1984',
   'George Orwell',
   '9780451524935',
   'Dystopian masterpiece',
   'active');
```

### Automated Test Data Seeding

**File:** `/scripts/seedTestData.js`

```javascript
import { createClient } from '@supabase/supabase-js';
import { testUsers } from '../tests/fixtures/testUsers.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedTestData() {
  console.log('🌱 Seeding test data...');

  // Create test users
  for (const [key, userData] of Object.entries(testUsers)) {
    console.log(`Creating user: ${userData.name}`);
    await createTestUser(supabase, userData);
  }

  // Create test recommendations
  console.log('Creating test recommendations...');
  // ... seed logic

  console.log('✅ Test data seeded successfully!');
}

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  const userIds = await supabase
    .from('auth.users')
    .select('id')
    .like('email', '%.test@sarahsbooks.com');
  
  await cleanupTestData(supabase, userIds.data.map(u => u.id));
  
  console.log('✅ Test data cleaned up!');
}

// Run based on command
const command = process.argv[2];
if (command === 'seed') {
  seedTestData();
} else if (command === 'cleanup') {
  cleanupTestData();
} else {
  console.log('Usage: node seedTestData.js [seed|cleanup]');
}
```

**Add to `package.json`:**

```json
{
  "scripts": {
    "test:seed": "node scripts/seedTestData.js seed",
    "test:cleanup": "node scripts/seedTestData.js cleanup"
  }
}
```

---

## 4. Pre-Build Checklist (What a Seasoned PM Would Do)

### Phase 1: Requirements & Planning ✅

- [x] **Define clear objectives** - What problem are we solving?
- [x] **User research** - Talk to users about sharing needs
- [x] **Competitive analysis** - How do other platforms handle sharing?
- [x] **Success metrics** - How will we measure success?
- [x] **Risk assessment** - What could go wrong?
- [x] **Stakeholder alignment** - Everyone agrees on scope and timeline
- [x] **Technical feasibility** - Can we build this with current stack?
- [x] **Resource allocation** - Do we have the people/time/budget?

### Phase 2: Specification & Design ✅

- [x] **Detailed spec document** - Feature requirements, edge cases
- [x] **User journey maps** - Current state vs proposed state
- [x] **Database schema** - Tables, relationships, indexes
- [x] **API design** - Endpoints, functions, RLS policies
- [x] **UI/UX mockups** - Wireframes and visual designs
- [x] **Copy/messaging** - All user-facing text
- [x] **Privacy & security review** - GDPR, COPPA compliance
- [x] **Accessibility review** - WCAG compliance

### Phase 3: Pre-Development Setup ⚠️ (IN PROGRESS)

- [ ] **Git branching strategy** - Feature branch workflow
- [ ] **Development environment** - Local setup, staging environment
- [ ] **Test accounts** - Demo users in Supabase
- [ ] **Test data** - Sample books, recommendations
- [ ] **Automated tests** - Unit, integration, E2E test suites
- [ ] **CI/CD pipeline** - Automated testing and deployment
- [ ] **Monitoring setup** - Error tracking, analytics
- [ ] **Feature flags** - Ability to toggle features on/off

### Phase 4: Legal & Compliance ⚠️ (NEEDS REVIEW)

- [ ] **Terms of Service update** - Legal review required
- [ ] **Privacy Policy update** - Legal review required
- [ ] **COPPA compliance** - Age verification process documented
- [ ] **GDPR compliance** - Data retention, deletion, export
- [ ] **User consent flows** - First-time use agreements
- [ ] **Data retention policy** - How long we keep share data
- [ ] **Security audit** - Third-party review (optional but recommended)

### Phase 5: Communication & Documentation ⚠️ (NEEDS WORK)

- [ ] **User communication plan** - How to announce feature
- [ ] **Help documentation** - How-to guides, FAQs
- [ ] **In-app onboarding** - Tooltips, tutorials, first-time flows
- [ ] **Email templates** - All notification emails designed
- [ ] **Support team training** - How to handle user questions
- [ ] **Marketing materials** - Blog post, social media, email announcement
- [ ] **Press release** (if applicable)

### Phase 6: Testing & QA ⚠️ (NOT STARTED)

- [ ] **Test plan** - What to test, how to test, who tests
- [ ] **QA checklist** - All features, edge cases, error states
- [ ] **Performance testing** - Load testing, stress testing
- [ ] **Security testing** - Penetration testing, vulnerability scan
- [ ] **Accessibility testing** - Screen readers, keyboard navigation
- [ ] **Cross-browser testing** - Chrome, Firefox, Safari, Edge
- [ ] **Mobile testing** - iOS, Android, responsive design
- [ ] **Beta testing** - Select users test before public launch

### Phase 7: Launch Preparation ⚠️ (NOT STARTED)

- [ ] **Rollback plan** - How to revert if things go wrong
- [ ] **Monitoring dashboard** - Real-time metrics, error tracking
- [ ] **On-call schedule** - Who's available if issues arise
- [ ] **Launch checklist** - Final pre-launch verification
- [ ] **Phased rollout plan** - 10% → 50% → 100% of users
- [ ] **Success criteria** - What does "successful launch" look like?
- [ ] **Post-launch review** - Schedule retrospective meeting

### Phase 8: Post-Launch ⚠️ (NOT STARTED)

- [ ] **Monitor metrics** - Daily check of success metrics
- [ ] **User feedback collection** - Surveys, support tickets, analytics
- [ ] **Bug triage** - Prioritize and fix issues
- [ ] **Iteration plan** - What to improve based on feedback
- [ ] **Documentation updates** - Keep docs current with changes
- [ ] **Team retrospective** - What went well, what to improve

---

## 5. Site-Wide Messaging & Privacy Updates

### A. Terms of Service Updates

**New Sections to Add:**

#### **Section: Direct Sharing & Recommendations**

```markdown
## 8. Direct Sharing & Book Recommendations

### 8.1 Eligibility
- You must be 18 years or older to use direct sharing features
- Your email address must be verified
- Your account must be at least 24 hours old

### 8.2 Privacy Settings
- You control who can find you and share books with you
- Default privacy setting is "Private" (not searchable)
- You can change to "Open" to allow others to find and share with you

### 8.3 Sharing Conduct
- Direct sharing is for book recommendations only
- This is not a messaging or chat platform
- You may not use sharing features to:
  - Send spam or unsolicited content
  - Harass or abuse other users
  - Share inappropriate content
  - Circumvent rate limits or cooldown periods

### 8.4 Rate Limits
- Maximum 50 shares per day
- Maximum 10 shares per recipient per day
- 24-hour cooldown after sharing the same book with the same person

### 8.5 Blocking & Reporting
- You can block users to prevent them from sharing with you
- You can report spam or abusive behavior
- We reserve the right to suspend or terminate accounts that violate these terms

### 8.6 Data Retention
- Share history is retained for 90 days
- Deleted recommendations are permanently removed
- You can export your data at any time
```

### B. Privacy Policy Updates

**New Sections to Add:**

#### **Section: Information We Collect**

```markdown
## 3.5 Direct Sharing Information

When you use direct sharing features, we collect:

**Profile Information (Optional):**
- Favorite genres
- Favorite authors
- Favorite local bookstore
- Profile photo

**Sharing Activity:**
- Books you share with others
- Books shared with you
- Personal notes attached to recommendations
- Accept/decline actions
- Block list

**Age Verification:**
- Date of birth (required for sharing features)
- Age verification status

**Privacy Settings:**
- Searchability preference (private/open)
- Notification preferences
- Email frequency settings
```

#### **Section: How We Use Your Information**

```markdown
## 4.6 Direct Sharing Features

We use your information to:
- Enable you to share book recommendations with friends
- Show you recommendations from others
- Enforce rate limits and prevent spam
- Send notifications about new recommendations
- Respect your privacy settings and preferences
- Comply with age restrictions (COPPA, etc.)
```

#### **Section: Information Sharing**

```markdown
## 5.4 What We Share with Other Users

When you use direct sharing:

**Visible to Users You Share With:**
- Your name
- Book recommendation and personal note
- Your profile preferences (if you've set them)

**NOT Visible:**
- Your email address (unless you invite them)
- Your reading queue or history
- Whether you accepted or declined their shares
- Your activity or timestamps

**Visible to Users Who Search for You (if privacy = "Open"):**
- Your name
- Member since date
- Favorite genres, authors, bookstore (if set)

**NOT Searchable:**
- Your email address
- Any other personal information
```

### C. Help Documentation / FAQ

**Create:** `/docs/USER_HELP_FAQ.md`

**Topics to Cover:**

1. **Getting Started with Direct Sharing**
   - How to enable direct sharing
   - Setting up your profile preferences
   - Privacy settings explained

2. **Sharing Books**
   - How to share a book with a friend
   - Difference between public links and direct sharing
   - How to invite non-registered friends

3. **Receiving Recommendations**
   - How to view recommendations
   - Accepting vs declining
   - Managing your inbox

4. **Privacy & Safety**
   - Who can find you
   - How to block users
   - How to report spam
   - What information is visible to others

5. **Troubleshooting**
   - Why can't I share books?
   - Why don't I see the share button?
   - Why can't I find my friend?
   - Rate limit explanations

### D. In-App Messaging Updates

**Locations to Add Messaging:**

#### **1. First-Time User Onboarding**

```jsx
// After signup, show onboarding flow
<OnboardingModal>
  <Step 1: Welcome>
    <h2>Welcome to Sarah's Books!</h2>
    <p>Discover your next great read and share books with friends</p>
  </Step>
  
  <Step 2: Privacy>
    <h2>Your Privacy Matters</h2>
    <p>
      By default, your profile is private. You can choose to make it 
      searchable so friends can find you and share books directly.
    </p>
    <Toggle>Make my profile searchable</Toggle>
  </Step>
  
  <Step 3: Profile (Optional)>
    <h2>Complete Your Profile</h2>
    <p>
      Help friends share better recommendations by adding your 
      favorite genres and authors.
    </p>
    <Button>Add Preferences</Button>
    <Button variant="ghost">Skip for Now</Button>
  </Step>
  
  <Step 4: Sharing>
    <h2>Share Book Recommendations</h2>
    <p>
      Found a great book? Share it with friends directly in the app 
      or via a link. This is for book recommendations only - not a 
      messaging platform.
    </p>
  </Step>
</OnboardingModal>
```

#### **2. Privacy Settings Page**

```jsx
<PrivacySettingsPage>
  <Section>
    <h2>Who Can Find You</h2>
    <InfoBox>
      Control whether other users can search for you and share 
      books directly. Your email address is never shown to other users.
    </InfoBox>
    
    <RadioGroup>
      <Radio value="private" checked>
        <strong>Private</strong> - Only you can see your profile. 
        Friends can still share via link.
      </Radio>
      <Radio value="open">
        <strong>Open</strong> - Other users can search for you by name 
        and share books directly.
      </Radio>
    </RadioGroup>
  </Section>
  
  <Section>
    <h2>What Others Can See</h2>
    <InfoBox>
      If your profile is Open, other users can see:
      • Your name
      • Member since date
      • Favorite genres, authors, bookstore (if you've added them)
      
      They CANNOT see:
      • Your email address
      • Your reading queue or history
      • Your activity or timestamps
    </InfoBox>
  </Section>
</PrivacySettingsPage>
```

#### **3. Share Modal**

```jsx
<ShareModal>
  <InfoBanner>
    <Info icon />
    This shares a book recommendation only. Sarah's Books is not 
    a messaging platform.
  </InfoBanner>
  
  <Tabs>
    <Tab>Share via Link</Tab>
    <Tab>Share with Friends</Tab>
    <Tab>Invite via Email</Tab>
  </Tabs>
</ShareModal>
```

#### **4. Recommendations Inbox**

```jsx
<RecommendationsInbox>
  <Header>
    <h1>Recommendations Inbox</h1>
    <InfoBanner>
      This inbox is for book recommendations only, not messages. 
      When friends share books with you, they appear here.
    </InfoBanner>
  </Header>
</RecommendationsInbox>
```

#### **5. Footer / About Page**

```jsx
<Footer>
  <Section>
    <h3>About Sarah's Books</h3>
    <p>
      A book discovery platform for finding your next great read 
      and sharing recommendations with friends. Not a social network 
      or messaging app - just books.
    </p>
  </Section>
  
  <Section>
    <h3>Privacy & Safety</h3>
    <ul>
      <li>Your data is private by default</li>
      <li>18+ for direct sharing features</li>
      <li>COPPA and GDPR compliant</li>
      <li><Link>Privacy Policy</Link></li>
      <li><Link>Terms of Service</Link></li>
    </ul>
  </Section>
</Footer>
```

### E. Email Notification Updates

**All emails should include:**

```
Footer:
───────────────────────────────────────────

About Sarah's Books:
A book discovery platform for sharing recommendations with friends.
This is not a messaging or social media platform.

Privacy: Your email address is never shared with other users.

[Manage Notification Preferences] | [Privacy Policy] | [Unsubscribe]

Sarah's Books
[Address]
```

---

## 6. QA & Testing Checklist

### Pre-Launch Testing Checklist

#### **Functional Testing**

**User Management:**
- [ ] New user signup with age verification
- [ ] Email verification flow
- [ ] Under 18 users blocked from sharing
- [ ] Account age check (24 hours)

**Privacy Settings:**
- [ ] Default privacy is "Private"
- [ ] Can change to "Open"
- [ ] Private users not searchable
- [ ] Open users appear in search

**User Search:**
- [ ] Search by name works
- [ ] Email not searchable
- [ ] Email not displayed in results
- [ ] Blocked users not in results
- [ ] Under 18 users not in results

**Direct Sharing:**
- [ ] Can share book from any surface
- [ ] Personal note is optional
- [ ] Share creates inbox entry
- [ ] Recipient receives notification
- [ ] Badge count updates

**Rate Limiting:**
- [ ] 50 shares per day enforced
- [ ] 10 shares per recipient enforced
- [ ] Error message shown when limit hit
- [ ] Limits reset at midnight

**24-Hour Cooldown:**
- [ ] Cannot re-share same book immediately
- [ ] Cooldown enforced for 24 hours
- [ ] Error message shown
- [ ] Cooldown expires after 24 hours

**Blocking:**
- [ ] Can block user
- [ ] Blocked user cannot share
- [ ] Blocked user not in search
- [ ] Can unblock user

**Reporting:**
- [ ] Can report spam/abuse
- [ ] Report submitted successfully
- [ ] Admin can view reports

**Accept/Decline:**
- [ ] Accept adds to queue
- [ ] Decline moves to declined tab
- [ ] Sender only sees "Delivered"
- [ ] Cannot see accept/decline status

**Email Invitations:**
- [ ] Can invite non-registered user
- [ ] Email sent successfully
- [ ] Invitation link works
- [ ] Signup creates account + adds to inbox

**Notifications:**
- [ ] In-app notification appears
- [ ] Email notification sent (if enabled)
- [ ] Daily digest works
- [ ] Can change frequency
- [ ] Can unsubscribe

#### **UI/UX Testing**

- [ ] All buttons work
- [ ] All links work
- [ ] Forms validate correctly
- [ ] Error messages are clear
- [ ] Success messages appear
- [ ] Loading states show
- [ ] Empty states are helpful
- [ ] Mobile responsive
- [ ] Keyboard navigation works
- [ ] Screen reader compatible

#### **Performance Testing**

- [ ] Page load time < 3 seconds
- [ ] Search results < 1 second
- [ ] Share action < 2 seconds
- [ ] Database queries optimized
- [ ] No N+1 queries
- [ ] Images optimized

#### **Security Testing**

- [ ] RLS policies enforced
- [ ] Cannot access other users' data
- [ ] Cannot bypass age restrictions
- [ ] Cannot bypass rate limits
- [ ] SQL injection prevented
- [ ] XSS attacks prevented
- [ ] CSRF protection enabled

#### **Cross-Browser Testing**

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

#### **Edge Cases**

- [ ] Empty search results
- [ ] No recommendations in inbox
- [ ] No search results
- [ ] Network error handling
- [ ] Offline behavior
- [ ] Concurrent shares
- [ ] Deleted user handling
- [ ] Expired invitations

---

## 7. Deployment Strategy

### Phased Rollout Plan

#### **Phase 0: Internal Testing (Week 1)**
- Deploy to staging environment
- Test with demo accounts
- Run all automated tests
- Fix critical bugs

#### **Phase 1: Beta Testing (Week 2)**
- Deploy to 10% of users (feature flag)
- Invite select beta testers
- Monitor metrics closely
- Collect feedback
- Fix bugs

#### **Phase 2: Gradual Rollout (Week 3)**
- Increase to 50% of users
- Monitor performance
- Address any issues
- Continue collecting feedback

#### **Phase 3: Full Launch (Week 4)**
- Deploy to 100% of users
- Announce via email/blog
- Monitor metrics
- Provide support

### Deployment Checklist

**Pre-Deployment:**
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Database migrations tested
- [ ] Rollback plan ready
- [ ] Monitoring dashboard set up
- [ ] On-call schedule confirmed
- [ ] Communication plan ready

**Deployment:**
- [ ] Merge to staging
- [ ] Test on staging
- [ ] Merge to main
- [ ] Run database migrations
- [ ] Deploy to production
- [ ] Verify deployment
- [ ] Monitor for errors

**Post-Deployment:**
- [ ] Send announcement email
- [ ] Monitor metrics
- [ ] Respond to support tickets
- [ ] Fix urgent bugs
- [ ] Collect user feedback
- [ ] Schedule retrospective

---

## Summary

### What We Have ✅

1. **Comprehensive Specs**
   - Direct sharing feature spec
   - User journey maps
   - Notifications strategy
   - Cleanup plan

2. **Git Strategy**
   - Feature branch workflow
   - Branch protection rules
   - Commit conventions

3. **Testing Plan**
   - Unit tests
   - Integration tests
   - E2E tests
   - Test fixtures

### What We Need ⚠️

1. **Legal Review**
   - Terms of Service updates
   - Privacy Policy updates
   - COPPA compliance documentation

2. **Test Setup**
   - Create demo accounts in Supabase
   - Seed test data
   - Set up CI/CD pipeline

3. **Documentation**
   - User help docs / FAQ
   - In-app onboarding flows
   - Support team training

4. **Communication**
   - Launch announcement
   - Email templates
   - Marketing materials

### Next Steps

1. **Review this development plan**
2. **Set up feature branch** (`feature/read-with-friends`)
3. **Create demo accounts** in Supabase
4. **Write automated tests** (start with integration tests)
5. **Legal review** (Terms, Privacy Policy)
6. **Begin Phase 1 development** (foundation)

**Timeline:** 3-4 weeks from start to full launch

**Questions to Answer:**
- Who will do legal review?
- When should we start beta testing?
- What's the target launch date?
- Who's on-call for launch support?
