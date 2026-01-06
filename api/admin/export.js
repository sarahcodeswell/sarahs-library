import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const MASTER_ADMIN_EMAIL = 'sarah@darkridge.com';

export default async function handler(req) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin access
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || user.email !== MASTER_ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch all data
    const [usersResult, profilesResult, queueResult, userBooksResult, referralsResult] = await Promise.all([
      supabase.auth.admin.listUsers({ perPage: 1000 }),
      supabase.from('taste_profiles').select('*'),
      supabase.from('reading_queue').select('user_id, book_title'),
      supabase.from('user_books').select('user_id, status, rating'),
      supabase.from('referrals').select('inviter_id, status')
    ]);

    const users = usersResult.data?.users || [];
    const profiles = profilesResult.data || [];
    const queue = queueResult.data || [];
    const userBooks = userBooksResult.data || [];
    const referrals = referralsResult.data || [];

    // Build profile lookup
    const profileMap = new Map();
    profiles.forEach(p => profileMap.set(p.user_id, p));

    // Build queue counts
    const queueCounts = new Map();
    queue.forEach(q => {
      queueCounts.set(q.user_id, (queueCounts.get(q.user_id) || 0) + 1);
    });

    // Build user books stats
    const userBookStats = new Map();
    userBooks.forEach(b => {
      if (!userBookStats.has(b.user_id)) {
        userBookStats.set(b.user_id, { read: 0, rated: 0, totalRating: 0 });
      }
      const stats = userBookStats.get(b.user_id);
      if (b.status === 'read') stats.read++;
      if (b.rating) {
        stats.rated++;
        stats.totalRating += b.rating;
      }
    });

    // Build referral stats
    const referralStats = new Map();
    referrals.forEach(r => {
      if (!r.inviter_id) return;
      if (!referralStats.has(r.inviter_id)) {
        referralStats.set(r.inviter_id, { sent: 0, accepted: 0 });
      }
      const stats = referralStats.get(r.inviter_id);
      stats.sent++;
      if (r.status === 'accepted') stats.accepted++;
    });

    // Build CSV
    const currentYear = new Date().getFullYear();
    const headers = [
      'Email',
      'Created At',
      'City',
      'State',
      'Country',
      'Birth Year',
      'Age',
      'Favorite Genres',
      'Favorite Bookstore',
      'Books in Queue',
      'Books Read',
      'Books Rated',
      'Avg Rating',
      'Referrals Sent',
      'Referrals Accepted',
      'K-Factor'
    ];

    const rows = users.map(user => {
      const profile = profileMap.get(user.id) || {};
      const queueCount = queueCounts.get(user.id) || 0;
      const bookStats = userBookStats.get(user.id) || { read: 0, rated: 0, totalRating: 0 };
      const refStats = referralStats.get(user.id) || { sent: 0, accepted: 0 };
      
      const age = profile.birth_year ? currentYear - profile.birth_year : '';
      const avgRating = bookStats.rated > 0 ? (bookStats.totalRating / bookStats.rated).toFixed(1) : '';
      const kFactor = refStats.sent > 0 ? (refStats.accepted / refStats.sent).toFixed(2) : '';

      return [
        user.email || '',
        user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : '',
        profile.city || '',
        profile.state || '',
        profile.country || '',
        profile.birth_year || '',
        age,
        (profile.favorite_genres || []).join('; '),
        profile.favorite_bookstore_name || '',
        queueCount,
        bookStats.read,
        bookStats.rated,
        avgRating,
        refStats.sent,
        refStats.accepted,
        kFactor
      ];
    });

    // Convert to CSV string
    const escapeCSV = (val) => {
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="sarahs-books-users-${new Date().toISOString().split('T')[0]}.csv"`
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
