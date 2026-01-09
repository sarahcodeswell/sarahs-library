# Demo Checklist - Otis Meeting (Jan 9, 2026 @ 3:30pm PT)

## Pre-Demo Smoke Test (run 30 min before)

### Critical Paths
- [ ] Site loads: www.sarahsbooks.com
- [ ] Auth works: Sign in/out
- [ ] Chat works: Ask for a recommendation
- [ ] Reading Queue: Add book, move to nightstand, mark finished
- [ ] Admin Dashboard: Stats load, drill-down works

### Otis-Specific
- [ ] Otis can log in
- [ ] His book "Becoming Supernatural" shows in Currently Reading
- [ ] He can toggle between Nightstand ↔ On Deck

---

## Demo Flow (suggested)

### 1. The Reading Experience (2 min)
- Show Reading Queue page
- "On My Nightstand" vs "On Deck" - personal language
- Rich book cards with covers, descriptions
- One-tap: Move to Deck, Mark Finished

### 2. The Recommendation Engine (3 min)
- Ask: "What should I read next?"
- Show how it uses reading history
- Theme filters (Women's Stories, Emotional Truth, etc.)
- "From Sarah's Collection" badge

### 3. Admin Dashboard (2 min)
- Real-time stats: users, books, engagement
- Drill-down: "Currently Reading" → see who's reading what
- User management capabilities

### 4. Code Quality (if asked)
**Security:**
- "Zero npm vulnerabilities"
- "Row Level Security on all 21 tables"
- "All admin endpoints require JWT verification"

**Performance:**
- "Lazy loading for heavy components"
- "Optimistic UI with rollback"
- "Console logs stripped in production"

**Architecture:**
- "Clean separation: React frontend, Edge functions, Supabase"
- "197 curated books with vector embeddings"
- "Four recommendation paths: Catalog, World, Hybrid, Temporal"

---

## Talking Points

### What's New (Jan 8-9)
1. **Currently Reading redesign** - "On My Nightstand" model
2. **Admin Dashboard** - drill-down analytics
3. **Goodreads import** - now correctly parses reading status
4. **Code cleanup** - production-ready logging, schema fixes

### Coming Soon
1. **Bi-directional status changes** - no more one-way doors
2. **"Set Aside"** - graceful way to abandon books
3. **Notes on books** - capture thoughts while reading

### If Asked About Scale
- "Supabase handles auth and data - scales automatically"
- "Vercel Edge Functions - globally distributed"
- "Vector search via pgvector - fast similarity matching"

---

## Backup Plan

If something breaks during demo:
1. **Site down**: Show local dev (`npm run dev`)
2. **Auth issues**: Use your admin account
3. **Slow responses**: "AI is thinking..." - explain the recommendation pipeline

---

*Prepared: January 9, 2026*
