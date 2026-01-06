import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const MASTER_ADMIN_EMAIL = 'sarah@darkridge.com';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export default async function handler(req) {
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return json({ error: 'Server configuration error' }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin access
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 403);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || user.email !== MASTER_ADMIN_EMAIL) {
      return json({ error: 'Unauthorized' }, 403);
    }

    const url = new URL(req.url);
    const type = url.searchParams.get('type');

    // Get all users for email lookup
    const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const users = usersData?.users || [];
    const userMap = new Map(users.map(u => [u.id, u]));

    switch (type) {
      case 'users': {
        const { data: profiles } = await supabase.from('taste_profiles').select('user_id');
        const profileUserIds = new Set((profiles || []).map(p => p.user_id));
        
        const result = users.map(u => ({
          email: u.email,
          createdAt: u.created_at,
          hasProfile: profileUserIds.has(u.id)
        })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        return json({ type: 'users', data: result });
      }

      case 'profiles': {
        const { data: profiles } = await supabase.from('taste_profiles').select('*');
        const result = (profiles || []).map(p => {
          const u = userMap.get(p.user_id);
          return {
            email: u?.email || 'Unknown',
            city: p.city,
            state: p.state,
            country: p.country,
            birthYear: p.birth_year,
            genres: p.favorite_genres || [],
            bookstore: p.favorite_bookstore_name,
            updatedAt: p.updated_at
          };
        }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        
        return json({ type: 'profiles', data: result });
      }

      case 'queue': {
        const { data: queue } = await supabase.from('reading_queue').select('*');
        const result = (queue || []).map(q => {
          const u = userMap.get(q.user_id);
          return {
            email: u?.email || 'Unknown',
            bookTitle: q.book_title,
            bookAuthor: q.book_author,
            owned: q.owned,
            priority: q.priority,
            addedAt: q.created_at
          };
        }).sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
        
        return json({ type: 'queue', data: result });
      }

      case 'read': {
        const { data: userBooks } = await supabase.from('user_books').select('*').eq('status', 'read');
        const result = (userBooks || []).map(b => {
          const u = userMap.get(b.user_id);
          return {
            email: u?.email || 'Unknown',
            bookTitle: b.title,
            bookAuthor: b.author,
            rating: b.rating,
            readAt: b.updated_at
          };
        }).sort((a, b) => new Date(b.readAt) - new Date(a.readAt));
        
        return json({ type: 'read', data: result });
      }

      case 'waitlist': {
        const { data: waitlist } = await supabase.from('curator_waitlist').select('*');
        const result = (waitlist || []).map(w => ({
          email: w.email,
          signedUpAt: w.created_at
        })).sort((a, b) => new Date(b.signedUpAt) - new Date(a.signedUpAt));
        
        return json({ type: 'waitlist', data: result });
      }

      case 'recommendations': {
        const { data: recs } = await supabase.from('recommendations').select('*');
        const result = (recs || []).map(r => {
          const u = userMap.get(r.user_id);
          return {
            email: u?.email || 'Unknown',
            bookTitle: r.book_title,
            bookAuthor: r.book_author,
            source: r.source,
            createdAt: r.created_at
          };
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        return json({ type: 'recommendations', data: result });
      }

      case 'referrals': {
        const { data: referrals } = await supabase.from('referrals').select('*');
        const result = (referrals || []).map(r => {
          const inviter = userMap.get(r.inviter_id);
          const invited = userMap.get(r.invited_user_id);
          return {
            inviterEmail: inviter?.email || 'Unknown',
            invitedEmail: r.invited_email || invited?.email || 'Unknown',
            status: r.status,
            type: r.referral_type,
            createdAt: r.created_at,
            acceptedAt: r.accepted_at
          };
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        return json({ type: 'referrals', data: result });
      }

      default:
        return json({ error: 'Invalid type' }, 400);
    }

  } catch (error) {
    console.error('Details error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
