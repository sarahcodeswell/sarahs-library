# RAG Implementation Guide

## Overview
This implementation adds vector search capabilities to Sarah's Books, enabling semantic book recommendations from Sarah's curated 200-book collection.

## Architecture

### Database Layer
- **pgvector extension**: Enables vector similarity search in PostgreSQL
- **books table**: Stores books with embeddings (1536 dimensions)
- **find_similar_books function**: SQL function for efficient vector search

### API Layer
- **/api/embeddings**: Generates text embeddings using OpenAI
- **vectorSearch.js**: Client-side vector search utilities
- **recommendationService.js**: Enhanced with vector context

### Data Flow
```
User Query → Generate Embedding → Vector Search → Top 5 Similar Books → Claude AI → Final 3 Recommendations
```

## Setup Instructions

### 1. Enable pgvector in Supabase
```sql
-- Run migration 012_enable_pgvector.sql
-- This creates the books table and vector indexes
```

### 2. Generate Embeddings
```bash
# Set environment variables
export VITE_SUPABASE_URL=your_supabase_url
export SUPABASE_SERVICE_ROLE_KEY=your_service_key
export OPENAI_API_KEY=your_openai_key

# Run the script
node scripts/generate-embeddings.js
```

### 3. Update Environment Variables
Add to your `.env`:
```
OPENAI_API_KEY=your_openai_api_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Features

### Semantic Search
- Finds books similar to user queries
- Uses OpenAI text-embedding-3-small model
- Cosine similarity with configurable threshold

### Theme-Based Search
- Filters by Sarah's 5 themes: women, emotional, identity, spiritual, justice
- Combines vector search with theme filtering

### Sarah's Assessment Integration
- Includes Sarah's personal book assessments
- Provides context for recommendations

## Cost Analysis

### OpenAI Embeddings
- **text-embedding-3-small**: $0.00002 per 1K tokens
- **200 books × ~100 tokens each**: ~$0.00040 (one-time)
- **User queries**: ~50 tokens each = $0.001 per 100 queries

### Supabase
- **Storage**: 200 embeddings × 1536 dimensions × 4 bytes = ~1.2MB
- **Compute**: Vector search is efficient with proper indexes

### Total Monthly Cost
- **Embeddings**: ~$5-10 for moderate usage
- **Database**: Included in Supabase free tier
- **Total**: ~$5-15/month

## Performance Optimizations

### Database Indexes
- **IVFFlat**: Good for large datasets (1000+ books)
- **HNSW**: Better for smaller datasets (faster, more accurate)

### Caching
- Consider caching frequent queries
- Pre-compute popular theme combinations

### Rate Limiting
- 10 requests per minute per user for embeddings
- Prevents API abuse

## Testing

### Vector Search Test
```javascript
import { findSimilarBooks } from './src/lib/vectorSearch.js';

const results = await findSimilarBooks("emotional books about family");
console.log(results);
```

### Theme Search Test
```javascript
import { getBooksByThemes } from './src/lib/vectorSearch.js';

const books = await getBooksByThemes(['women', 'emotional']);
console.log(books);
```

## Future Enhancements

### 1. Hybrid Search
- Combine vector search with full-text search
- Weight different factors (themes, ratings, popularity)

### 2. User Preference Learning
- Track user interactions
- Personalize similarity thresholds
- Learn preferred themes/authors

### 3. Real-time Updates
- Add new books to vector index
- Update embeddings for book descriptions
- Refresh theme assignments

### 4. Advanced Analytics
- Track recommendation quality
- Measure similarity distribution
- Optimize thresholds based on usage

## Troubleshooting

### Common Issues

1. **pgvector not enabled**
   - Run the migration in Supabase dashboard
   - Check extension is installed: `SELECT * FROM pg_extension WHERE extname = 'vector'`

2. **Embeddings generation fails**
   - Check OpenAI API key is valid
   - Verify books.json format
   - Monitor rate limits

3. **Vector search returns empty**
   - Check similarity threshold (try 0.5)
   - Verify embeddings exist in database
   - Check vector index is built

4. **Performance issues**
   - Ensure vector indexes are created
   - Consider reducing embedding dimensions
   - Monitor query execution time

## Monitoring

### Key Metrics
- Embedding generation success rate
- Vector search response time
- Recommendation click-through rate
- User satisfaction scores

### Alerts
- High embedding failure rate
- Slow vector search queries
- OpenAI quota exceeded

## Security Considerations

- Service role key should be server-side only
- Rate limiting prevents abuse
- RLS policies protect book data
- No PII in embeddings
