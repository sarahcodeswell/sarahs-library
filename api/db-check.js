// API endpoint to check database data quality
// GET /api/db-check - Returns stats on author and description data

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple auth check - only allow in dev or with admin key
  const authHeader = req.headers.authorization;
  const adminKey = process.env.ADMIN_CHECK_KEY || 'sarah-admin-2024';
  
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${adminKey}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get total count
    const { count: totalCount } = await supabase
      .from('reading_queue')
      .select('*', { count: 'exact', head: true });

    // Get books with missing author
    const { data: missingAuthor } = await supabase
      .from('reading_queue')
      .select('id, book_title, book_author')
      .or('book_author.is.null,book_author.eq.')
      .limit(50);

    // Get books with missing description
    const { data: missingDescription } = await supabase
      .from('reading_queue')
      .select('id, book_title, book_author, description')
      .or('description.is.null,description.eq.')
      .limit(50);

    // Get sample of books with both author and description
    const { data: completeBooks } = await supabase
      .from('reading_queue')
      .select('id, book_title, book_author, description, status')
      .not('book_author', 'is', null)
      .not('book_author', 'eq', '')
      .not('description', 'is', null)
      .not('description', 'eq', '')
      .limit(10);

    // Get unique users count
    const { data: uniqueUsers } = await supabase
      .from('reading_queue')
      .select('user_id')
      .limit(1000);
    
    const uniqueUserIds = new Set(uniqueUsers?.map(u => u.user_id) || []);

    // Get status breakdown
    const { data: statusData } = await supabase
      .from('reading_queue')
      .select('status')
      .limit(5000);
    
    const statusCounts = {};
    statusData?.forEach(item => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    });

    return res.status(200).json({
      summary: {
        totalBooks: totalCount,
        uniqueUsers: uniqueUserIds.size,
        booksWithMissingAuthor: missingAuthor?.length || 0,
        booksWithMissingDescription: missingDescription?.length || 0,
        statusBreakdown: statusCounts,
      },
      samples: {
        missingAuthor: missingAuthor?.slice(0, 10).map(b => ({
          title: b.book_title,
          author: b.book_author || '(empty)',
        })),
        missingDescription: missingDescription?.slice(0, 10).map(b => ({
          title: b.book_title,
          author: b.book_author || '(empty)',
          hasDescription: !!b.description,
        })),
        completeBooks: completeBooks?.map(b => ({
          title: b.book_title,
          author: b.book_author,
          descriptionPreview: b.description?.substring(0, 80) + '...',
          status: b.status,
        })),
      },
    });
  } catch (error) {
    console.error('DB check error:', error);
    return res.status(500).json({ error: error.message });
  }
}
