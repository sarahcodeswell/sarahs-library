# Admin Dashboard Specification

## Overview
A comprehensive, self-contained admin dashboard that aggregates all platform data from Supabase into actionable insights. **This is NOT a link to external dashboards** - it pulls and displays all metrics directly in the app.

**Goal:** Quantify user engagement, data quality, and platform health to demonstrate value for potential responsible monetization.

Accessible only to the master admin (`sarah@darkridge.com`).

---

## Access Control
- **Route:** `/admin` (or accessible via profile menu for admin users)
- **Authorization:** Only users with email matching `MASTER_ADMIN_EMAIL` can access
- **Security:** Server-side validation via API endpoints using Supabase service role

---

## Dashboard Metrics

### 1. User Metrics
| Metric | Description | Data Source |
|--------|-------------|-------------|
| **Total Users** | Count of all registered users | `auth.users` table |
| **New Users (7d/30d)** | Users registered in last 7/30 days | `auth.users.created_at` |
| **Active Users (7d)** | Users with any activity in last 7 days | `taste_profiles.updated_at` or activity logs |

### 2. Reading Queue Metrics
| Metric | Description | Data Source |
|--------|-------------|-------------|
| **Books in Queues** | Total books added to all reading queues | `reading_queue` table count |
| **Unique Books Queued** | Distinct book titles across all queues | `reading_queue` distinct titles |
| **Avg Queue Size** | Average books per user queue | Total / Users with queues |

### 3. Books Read/Finished
| Metric | Description | Data Source |
|--------|-------------|-------------|
| **Books Finished** | Books marked as read/finished | `user_books` where `status = 'read'` |
| **Total Ratings** | Books that have been rated | `user_books` where `rating IS NOT NULL` |
| **Avg Rating** | Average rating across all rated books | `AVG(rating)` from `user_books` |

### 4. Recommendations Metrics
| Metric | Description | Data Source |
|--------|-------------|-------------|
| **Recommendations Made** | Total recommendations generated | `recommendations` table count |
| **Recommendations Shared** | Recommendations shared via link | `shared_recommendations` table count |
| **Recommendations Accepted** | Books added to queue from recommendations | `reading_queue` where `source = 'recommendation'` (requires schema update) |

### 5. Referral Metrics
| Metric | Description | Data Source |
|--------|-------------|-------------|
| **Total Referrals** | Invites sent (email + link) | `referrals` table count |
| **Accepted Referrals** | Referrals that converted to signups | `referrals` where `status = 'accepted'` |
| **Platform K-Factor** | Viral coefficient (accepted referrals / total users) | Calculated |

### 6. Per-User K-Factor (Leaderboard)
| Metric | Description | Data Source |
|--------|-------------|-------------|
| **User K-Factor** | Referrals accepted per user | `referrals` grouped by `inviter_id` |
| **Top Referrers** | Users ranked by successful referrals | Leaderboard view |

**K-Factor Formula:**
```
User K-Factor = (Invites Sent × Conversion Rate)
             = Accepted Referrals / 1 (per user)

Platform K-Factor = Total Accepted Referrals / Total Users
```

**Leaderboard Display:**
| Rank | User | Invites Sent | Accepted | K-Factor |
|------|------|--------------|----------|----------|
| 1 | user@example.com | 12 | 8 | 0.67 |
| 2 | reader@books.com | 5 | 3 | 0.60 |
| 3 | ... | ... | ... | ... |

### 7. Curator Waitlist
| Metric | Description | Data Source |
|--------|-------------|-------------|
| **Waitlist Signups** | Total curator waitlist entries | `curator_waitlist` table count |
| **By Interest Area** | Breakdown by curator interest | Group by `interest_area` |
| **Recent Signups** | Last 10 waitlist entries | Ordered by `created_at` |

### 8. Demographics & Data Quality
| Metric | Description | Data Source |
|--------|-------------|-------------|
| **Users by Country** | Geographic distribution | `taste_profiles.country` aggregated |
| **Users by State** | State/province breakdown | `taste_profiles.state` aggregated |
| **Average Age** | Mean age of users with birth year | Calculated from `birth_year` |
| **Age Distribution** | Breakdown by age ranges | Grouped buckets (13-17, 18-24, 25-34, etc.) |
| **Profile Completeness** | % of users with location, genres, bookstore | Calculated |
| **Genre Preferences** | Most popular genres across users | `taste_profiles.favorite_genres` aggregated |

### 9. Data Quality Score
A composite metric to demonstrate platform value:

| Component | Weight | Calculation |
|-----------|--------|-------------|
| **Profile Completeness** | 25% | % users with location + genres + birth year |
| **Engagement Rate** | 25% | % users with books in queue or collection |
| **Rating Density** | 25% | Avg ratings per active user |
| **Referral Health** | 25% | K-factor × 100 |

**Overall Data Quality Score: 0-100**

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Admin Dashboard                                    Data Quality: 78/100 🟢 │
│  Last updated: Jan 5, 2026 7:30 PM                          [Refresh] [←]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ═══════════════════════════════ OVERVIEW ═══════════════════════════════  │
│                                                                             │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐   │
│  │    USERS      │ │  BOOKS QUEUED │ │  BOOKS READ   │ │   WAITLIST    │   │
│  │     247       │ │    1,842      │ │     523       │ │      34       │   │
│  │   +12 (7d)    │ │   +89 (7d)    │ │   +34 (7d)    │ │   curators    │   │
│  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘   │
│                                                                             │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐   │
│  │  RECOMMENDED  │ │   ACCEPTED    │ │   REFERRALS   │ │   K-FACTOR    │   │
│  │    3,421      │ │     892       │ │   45 / 127    │ │     0.18      │   │
│  │   26% rate    │ │   +67 (7d)    │ │   35% conv    │ │   platform    │   │
│  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘   │
│                                                                             │
│  ═══════════════════════════ DEMOGRAPHICS ═══════════════════════════════  │
│                                                                             │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │  Users by Country               │  │  Age Distribution               │  │
│  │  ████████████████ USA      68%  │  │  13-17  ██ 4%                   │  │
│  │  ████████ Canada           22%  │  │  18-24  ████████ 18%            │  │
│  │  ███ UK                     6%  │  │  25-34  ████████████████ 35%    │  │
│  │  ██ Other                   4%  │  │  35-44  ██████████ 24%          │  │
│  │                                 │  │  45-54  ██████ 12%              │  │
│  │  Avg Age: 32                    │  │  55+    ███ 7%                  │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Top Genres                                                         │   │
│  │  Literary Fiction ████████████████████ 42%                          │   │
│  │  Historical Fiction ██████████████ 31%                              │   │
│  │  Memoir ██████████ 22%                                              │   │
│  │  Mystery & Thriller ████████ 18%                                    │   │
│  │  Science Fiction ██████ 14%                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ═══════════════════════ TOP REFERRERS (K-FACTOR) ═══════════════════════  │
│                                                                             │
│  ┌────┬────────────────────────┬────────┬──────────┬─────────┐             │
│  │ #  │ User                   │ Sent   │ Accepted │ K-Factor│             │
│  ├────┼────────────────────────┼────────┼──────────┼─────────┤             │
│  │ 1  │ jane@email.com         │   12   │    8     │  0.67   │             │
│  │ 2  │ booklover@gmail.com    │    5   │    3     │  0.60   │             │
│  │ 3  │ reader@outlook.com     │    4   │    2     │  0.50   │             │
│  │ 4  │ avid@reader.net        │    3   │    1     │  0.33   │             │
│  │ 5  │ pages@books.org        │    2   │    1     │  0.50   │             │
│  └────┴────────────────────────┴────────┴──────────┴─────────┘             │
│                                                                             │
│  ═══════════════════════ DATA QUALITY BREAKDOWN ═════════════════════════  │
│                                                                             │
│  Profile Completeness  ████████████████████░░░░░ 82%  (location+genres)    │
│  Engagement Rate       ██████████████████░░░░░░░ 74%  (books in queue)     │
│  Rating Density        ████████████████░░░░░░░░░ 68%  (avg 4.2 ratings)    │
│  Referral Health       ██████████████████████░░░ 88%  (k-factor strong)    │
│                                                                             │
│  ═══════════════════════════ CURATOR WAITLIST ═══════════════════════════  │
│                                                                             │
│  34 signups │ Most interest: Historical Fiction, Memoir, Literary Fiction  │
│                                                                             │
│  Recent: sarah.r@email.com (2 days ago), bookworm@mail.com (5 days ago)    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Schema Updates Required

### Option A: Add `source` column to `reading_queue`
```sql
ALTER TABLE reading_queue
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
-- Values: 'manual', 'recommendation', 'import'
```

### Option B: Create activity/analytics table
```sql
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
```

---

## API Endpoints

### `GET /api/admin/stats`
Returns all dashboard metrics. Requires admin authentication via service role key.

**Response:**
```json
{
  "timestamp": "2026-01-05T19:30:00Z",
  "dataQualityScore": 78,
  
  "users": {
    "total": 247,
    "new7d": 12,
    "new30d": 45,
    "withProfiles": 198
  },
  
  "queue": {
    "totalBooks": 1842,
    "uniqueBooks": 892,
    "avgPerUser": 7.5,
    "new7d": 89
  },
  
  "read": {
    "totalFinished": 523,
    "totalRated": 412,
    "avgRating": 3.8,
    "new7d": 34
  },
  
  "recommendations": {
    "total": 3421,
    "shared": 234,
    "accepted": 892,
    "acceptRate": 0.26,
    "new7d": 67
  },
  
  "referrals": {
    "sent": 127,
    "accepted": 45,
    "conversionRate": 0.35,
    "platformKFactor": 0.18,
    "topReferrers": [
      { "email": "jane@email.com", "sent": 12, "accepted": 8, "kFactor": 0.67 },
      { "email": "booklover@gmail.com", "sent": 5, "accepted": 3, "kFactor": 0.60 },
      { "email": "reader@outlook.com", "sent": 4, "accepted": 2, "kFactor": 0.50 }
    ]
  },
  
  "curatorWaitlist": {
    "total": 34,
    "byInterest": {
      "Historical Fiction": 12,
      "Literary Fiction": 10,
      "Memoir": 8,
      "Other": 4
    },
    "recent": [
      { "email": "sarah.r@email.com", "createdAt": "2026-01-03T10:00:00Z" },
      { "email": "bookworm@mail.com", "createdAt": "2025-12-31T14:30:00Z" }
    ]
  },
  
  "demographics": {
    "byCountry": [
      { "country": "USA", "count": 168, "percent": 68 },
      { "country": "Canada", "count": 54, "percent": 22 },
      { "country": "UK", "count": 15, "percent": 6 },
      { "country": "Other", "count": 10, "percent": 4 }
    ],
    "byState": [
      { "state": "California", "count": 42 },
      { "state": "New York", "count": 28 },
      { "state": "Texas", "count": 18 }
    ],
    "averageAge": 32,
    "ageDistribution": [
      { "range": "13-17", "count": 10, "percent": 4 },
      { "range": "18-24", "count": 44, "percent": 18 },
      { "range": "25-34", "count": 86, "percent": 35 },
      { "range": "35-44", "count": 59, "percent": 24 },
      { "range": "45-54", "count": 30, "percent": 12 },
      { "range": "55+", "count": 18, "percent": 7 }
    ],
    "topGenres": [
      { "genre": "Literary Fiction", "count": 104, "percent": 42 },
      { "genre": "Historical Fiction", "count": 77, "percent": 31 },
      { "genre": "Memoir", "count": 54, "percent": 22 },
      { "genre": "Mystery & Thriller", "count": 44, "percent": 18 },
      { "genre": "Science Fiction", "count": 35, "percent": 14 }
    ]
  },
  
  "dataQuality": {
    "profileCompleteness": 82,
    "engagementRate": 74,
    "ratingDensity": 68,
    "referralHealth": 88
  }
}
```

---

## Implementation Phases

### Phase 1: Core Dashboard
1. Create `/admin` route with access control
2. Create `/api/admin/stats` endpoint
3. Build dashboard UI with stat cards
4. Query existing tables for available metrics

### Phase 2: Enhanced Tracking
1. Add `source` column to `reading_queue`
2. Track recommendation acceptance
3. Add time-series data for trends

### Phase 3: Activity Feed (Optional)
1. Create analytics_events table
2. Log key user actions
3. Display recent activity feed

---

## Questions for Sarah

1. **Time periods:** Do you want to see 7-day, 30-day, or all-time stats? Or toggleable?
2. **Trends:** Want to see charts/graphs over time, or just current numbers for now?
3. **Export:** Need ability to export data to CSV?
4. **Notifications:** Want alerts for milestones (e.g., 100th user)?
5. **Curator waitlist table:** Do we have a `curator_waitlist` table, or should I create one?

---

## Notes

- All queries use Supabase service role key (server-side only)
- Dashboard is read-only (no user management actions initially)
- Consider caching stats to reduce database load
- Mobile-responsive design for quick checks on phone
