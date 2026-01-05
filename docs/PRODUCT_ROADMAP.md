# Sarah's Books - Product Roadmap

**Last Updated:** January 4, 2026  
**Purpose:** Balance today's foundation with future taste-matching vision

---

## The Vision

> A reader gets recommendations from Sarah's curated taste, while building their own taste profile. Over time, the system reveals the Venn diagram between Sarah's taste and theirs—and eventually between readers themselves.

---

## Architecture Foundation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SARAH'S BOOKS                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────┐              ┌──────────────────────┐         │
│  │   SARAH'S CATALOG    │              │   USER'S LIBRARY     │         │
│  │   (The Moat)         │              │   (Their Journey)    │         │
│  ├──────────────────────┤              ├──────────────────────┤         │
│  │ • 200+ curated books │              │ • Books they've read │         │
│  │ • Sarah's assessments│              │ • Their ratings      │         │
│  │ • Theme collections  │              │ • Reading queue      │         │
│  │ • Taste centroid     │              │ • Taste centroid     │         │
│  └──────────────────────┘              └──────────────────────┘         │
│            │                                      │                      │
│            ▼                                      ▼                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    RECOMMENDATION ENGINE                          │   │
│  │                                                                   │   │
│  │   Request → Intent Classification → Path Selection → Response    │   │
│  │                                                                   │   │
│  │   Paths:                                                          │   │
│  │   • CATALOG: Books from Sarah's collection                       │   │
│  │   • WORLD: Quality books outside the catalog                     │   │
│  │   • HYBRID: Mix when partial catalog coverage                    │   │
│  │   • VERIFIED: Specific book requests                             │   │
│  │                                                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    TASTE ALIGNMENT (Future)                       │   │
│  │                                                                   │   │
│  │   Sarah's Centroid ←──── Overlap Score ────→ User's Centroid     │   │
│  │                                                                   │   │
│  │   "You and Sarah share 73% taste alignment"                      │   │
│  │   "Books you'd both love: [list]"                                │   │
│  │   "Your unique interests: [list]"                                │   │
│  │                                                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: TODAY (Foundation)

### Goal: User gets great recommendations, transparently sourced

### Request Types to Handle

| Type | Example | Path | Response Style |
|------|---------|------|----------------|
| **Theme Browse** | Click "Emotional Truth" | CATALOG | "From my collection..." |
| **Open Discovery** | "Venezuela historical fiction" | CATALOG → WORLD | Transparent about source |
| **Specific Book** | "Tell me about Eva Luna" | VERIFIED | Sarah's take or honest "haven't read" |
| **Author Search** | "Books like Kristin Hannah" | CATALOG → WORLD | Prioritize catalog matches |

### User Experience Principles

1. **Catalog First** - Sarah's voice is the value proposition
2. **Transparent Fallback** - When going to WORLD, say so clearly
3. **Never Fail Silently** - Always return 3 recommendations
4. **Respect History** - Never recommend books they've read/dismissed

### Technical Foundation (Already Built)

- [x] Deterministic router (keyword + embedding + decision matrix)
- [x] Fast path for curated list browsing
- [x] World search with quality filtering
- [x] User exclusion list (read/saved/dismissed)
- [x] Reading queue with ratings

### Today's Fixes Needed

- [x] Venezuela query returns world books ✓
- [x] Curated list shows "favorites worth revisiting" when all read ✓
- [ ] Verify all 4 request types work correctly
- [ ] Remove "checking world library" for catalog-only searches

---

## Phase 2: THIS MONTH (User Taste Profile)

### Goal: User's reading history influences recommendations

### Features

1. **Taste Centroid Computation**
   - Generate embedding for each book user has rated
   - Compute weighted average (5-star books weighted higher)
   - Store as `user_taste_centroid` in profiles table

2. **Personalized Ranking**
   - When returning catalog books, rank by similarity to user's centroid
   - "Based on your love of [Book X], you might enjoy..."

3. **Anti-Recommendations**
   - Track books rated 1-2 stars
   - Compute "anti-pattern" embedding
   - Deprioritize similar books

### Database Changes

```sql
ALTER TABLE profiles ADD COLUMN taste_centroid vector(1536);
ALTER TABLE profiles ADD COLUMN anti_pattern_centroid vector(1536);
ALTER TABLE profiles ADD COLUMN centroid_updated_at timestamptz;
```

### UI Changes

- Show "Personalized for you" badge when using taste matching
- Reading history page with taste insights

---

## Phase 3: Q2 2026 (Taste Overlap)

### Goal: Show the Venn diagram between Sarah and user

### Features

1. **Alignment Score**
   - Cosine similarity between Sarah's centroid and user's centroid
   - Display as percentage: "73% taste alignment with Sarah"

2. **Overlap Visualization**
   ```
   ┌─────────────────────────────────────────┐
   │                                         │
   │    Sarah        Shared        You       │
   │   ┌─────┐    ┌─────────┐    ┌─────┐    │
   │   │     │    │         │    │     │    │
   │   │ 27% │◄──►│   73%   │◄──►│ 27% │    │
   │   │     │    │         │    │     │    │
   │   └─────┘    └─────────┘    └─────┘    │
   │                                         │
   │  "Literary     "You both    "Your      │
   │   fiction      love women's  unique    │
   │   you might    stories with  interest  │
   │   discover"    emotional     in thrill-│
   │                depth"        ers"      │
   └─────────────────────────────────────────┘
   ```

3. **Recommendation Modes**
   - "From our shared taste" (overlap zone)
   - "Expand your horizons" (Sarah's unique zone)
   - "Your personal interests" (User's unique zone)

---

## Phase 4: Q3 2026 (Community Taste)

### Goal: Connect readers with similar taste

### Features

1. **Reader Clusters**
   - Cluster users by taste centroid similarity
   - "5 readers with similar taste to you"

2. **Community Recommendations**
   - "Readers like you loved..."
   - Collaborative filtering within clusters

3. **Book Club Matching**
   - Suggest book clubs based on taste overlap
   - "This book club has 85% taste match with you"

---

## Edge Cases & How to Handle

| Edge Case | Today's Handling | Future Handling |
|-----------|------------------|-----------------|
| "I want to read [specific book]" | VERIFIED path, return book details | Add "Sarah's take" if in catalog |
| "Newest book by X author" | TEMPORAL path with author filter | Track user's followed authors |
| "Book club recommendations" | Suggest creating this as a curated list | Community-driven lists |
| "I'm upset about current events" | Map mood → themes, recommend | Mood-based entry point in UI |
| Request far outside catalog | WORLD search with transparency | Ask if they want to explore outside Sarah's taste |

---

## Success Metrics

### Phase 1 (Today)
- [ ] 100% of request types return 3 recommendations
- [ ] <5% "error" responses
- [ ] Clear source attribution (catalog vs world)

### Phase 2 (This Month)
- [ ] Users with 5+ rated books get personalized results
- [ ] 20% improvement in recommendation acceptance rate

### Phase 3 (Q2)
- [ ] Average user can articulate their taste alignment
- [ ] 3 distinct recommendation modes available

### Phase 4 (Q3)
- [ ] Reader clusters formed
- [ ] Community features launched

---

## Technical Debt to Address

| Item | Priority | Effort |
|------|----------|--------|
| Move rate limiting to Vercel KV | High | 2 hours |
| Add E2E tests for all paths | High | 4 hours |
| Monitoring dashboard | Medium | 3 hours |
| Cost tracking per user | Medium | 2 hours |
| Cache reference embeddings | Low | 1 hour |

---

## Open Questions

1. **How does Sarah add books?** - Need curator admin interface
2. **Should users see each other?** - Privacy considerations for Phase 4
3. **How to handle "bad" world recommendations?** - Quality control for non-catalog books
4. **Monetization tie-in?** - Does taste alignment affect pricing/features?

---

## Next Steps (Tomorrow)

1. ✅ Fix remaining recommendation path issues
2. Create simple test script for all 4 request types
3. Remove debug logging before investor demo
4. Prepare 3-minute walkthrough of happy paths
