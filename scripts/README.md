# Admin Utility Scripts

## populate-admin-reading-queue.js

Populates the admin user's reading queue with all books from the curated catalog (books.json), marking them as 'finished'.

### Why?

The curator has read all 200 books in the catalog. By adding them to the reading queue, the materialized view (`user_exclusion_list`) automatically excludes them from recommendations.

### Prerequisites

1. **Service Key**: You need the Supabase service key (not the anon key) for admin operations
2. **Environment Variables**: Set in `.env` file:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_key
   ```

### How to Run

```bash
# From project root
node scripts/populate-admin-reading-queue.js
```

### What it does

1. Loads all books from `src/data/books.json`
2. Finds the admin user (sarah@darkridge.com)
3. Checks existing reading queue to avoid duplicates
4. Bulk inserts missing books with `status='finished'`
5. Materialized view auto-refreshes via trigger

### Expected Output

```
📚 Admin Reading Queue Population Script

Step 1: Loading catalog books...
✓ Loaded 200 books from catalog

Step 2: Finding admin user...
✓ Found admin user: sarah@darkridge.com (uuid-here)

Step 3: Checking existing reading queue...
✓ Found 0 existing books in reading queue

Step 4: Preparing to add 200 new books...

Step 5: Adding books to reading queue...
   Batch 1/4: Inserting 50 books... ✓ SUCCESS
   Batch 2/4: Inserting 50 books... ✓ SUCCESS
   Batch 3/4: Inserting 50 books... ✓ SUCCESS
   Batch 4/4: Inserting 50 books... ✓ SUCCESS

📊 Summary:
   ✓ Successfully added: 200 books
   📚 Total in catalog: 200 books
   📖 Already in queue: 0 books

✅ Done! The materialized view will automatically refresh.
   All catalog books are now excluded from recommendations for the admin user.
```

### Safe to Run Multiple Times

The script checks for existing books and only adds new ones, so it's safe to run multiple times without creating duplicates.
