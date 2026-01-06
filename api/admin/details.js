import { json, getSupabaseClient, verifyAdmin, getUserMap, MASTER_ADMIN_EMAIL } from './_shared.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const { client: supabase, error: configError } = getSupabaseClient();
    if (configError) {
      return json({ error: configError }, 500);
    }

    const authResult = await verifyAdmin(supabase, req.headers.get('authorization'));
    if (authResult.error) {
      return json({ error: authResult.error }, authResult.status);
    }

    const url = new URL(req.url);
    const type = url.searchParams.get('type');

    const userMap = await getUserMap(supabase);
    const users = Array.from(userMap.values());

    switch (type) {
      case 'users': {
        const { data: profiles } = await supabase.from('taste_profiles').select('user_id');
        const profileUserIds = new Set((profiles || []).map(p => p.user_id));
        
        const result = users.filter(u => u.email !== MASTER_ADMIN_EMAIL).map(u => ({
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
        // Group by user
        const userQueues = new Map();
        (queue || []).forEach(q => {
          const u = userMap.get(q.user_id);
          const email = u?.email || 'Unknown';
          if (email === 'sarah@darkridge.com') return; // Exclude admin
          if (!userQueues.has(email)) {
            userQueues.set(email, { email, userId: q.user_id, books: [] });
          }
          userQueues.get(email).books.push({
            title: q.book_title,
            author: q.book_author,
            owned: q.owned,
            priority: q.priority,
            addedAt: q.created_at
          });
        });
        const result = Array.from(userQueues.values())
          .map(u => ({ ...u, bookCount: u.books.length }))
          .sort((a, b) => b.bookCount - a.bookCount);
        
        return json({ type: 'queue', data: result });
      }

      case 'queue-user': {
        const userId = url.searchParams.get('userId');
        if (!userId) return json({ error: 'userId required' }, 400);
        
        const { data: queue } = await supabase.from('reading_queue').select('*').eq('user_id', userId);
        const u = userMap.get(userId);
        const result = {
          email: u?.email || 'Unknown',
          books: (queue || []).map(q => ({
            bookId: q.book_id,
            queueId: q.id,
            title: q.book_title,
            author: q.book_author,
            owned: q.owned,
            priority: q.priority,
            addedAt: q.created_at
          })).sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
        };
        
        return json({ type: 'queue-user', data: result });
      }

      case 'read': {
        const { data: userBooks } = await supabase.from('user_books').select('*').eq('status', 'read');
        // Group by user
        const userReads = new Map();
        (userBooks || []).forEach(b => {
          const u = userMap.get(b.user_id);
          const email = u?.email || 'Unknown';
          if (email === 'sarah@darkridge.com') return; // Exclude admin
          if (!userReads.has(email)) {
            userReads.set(email, { email, userId: b.user_id, books: [] });
          }
          userReads.get(email).books.push({
            title: b.title,
            author: b.author,
            rating: b.rating,
            readAt: b.updated_at
          });
        });
        const result = Array.from(userReads.values())
          .map(u => ({ ...u, bookCount: u.books.length }))
          .sort((a, b) => b.bookCount - a.bookCount);
        
        return json({ type: 'read', data: result });
      }

      case 'read-user': {
        const userId = url.searchParams.get('userId');
        if (!userId) return json({ error: 'userId required' }, 400);
        
        const { data: userBooks } = await supabase.from('user_books').select('*').eq('user_id', userId).eq('status', 'read');
        const u = userMap.get(userId);
        const result = {
          email: u?.email || 'Unknown',
          books: (userBooks || []).map(b => ({
            title: b.title,
            author: b.author,
            rating: b.rating,
            readAt: b.updated_at
          })).sort((a, b) => new Date(b.readAt) - new Date(a.readAt))
        };
        
        return json({ type: 'read-user', data: result });
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
        // Group by user
        const userRecs = new Map();
        (recs || []).forEach(r => {
          const u = userMap.get(r.user_id);
          const email = u?.email || 'Unknown';
          if (email === 'sarah@darkridge.com') return; // Exclude admin
          if (!userRecs.has(email)) {
            userRecs.set(email, { email, userId: r.user_id, books: [] });
          }
          userRecs.get(email).books.push({
            title: r.book_title,
            author: r.book_author,
            source: r.source,
            createdAt: r.created_at
          });
        });
        const result = Array.from(userRecs.values())
          .map(u => ({ ...u, recCount: u.books.length }))
          .sort((a, b) => b.recCount - a.recCount);
        
        return json({ type: 'recommendations', data: result });
      }

      case 'recommendations-user': {
        const userId = url.searchParams.get('userId');
        if (!userId) return json({ error: 'userId required' }, 400);
        
        const { data: recs } = await supabase.from('recommendations').select('*').eq('user_id', userId);
        const u = userMap.get(userId);
        const result = {
          email: u?.email || 'Unknown',
          books: (recs || []).map(r => ({
            title: r.book_title,
            author: r.book_author,
            source: r.source,
            createdAt: r.created_at
          })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        };
        
        return json({ type: 'recommendations-user', data: result });
      }

      case 'referrals': {
        const { data: referrals } = await supabase.from('referrals').select('*');
        // Group by inviter
        const inviterRefs = new Map();
        (referrals || []).forEach(r => {
          const inviter = userMap.get(r.inviter_id);
          const email = inviter?.email || 'Unknown';
          if (email === 'sarah@darkridge.com') return; // Exclude admin
          if (!inviterRefs.has(email)) {
            inviterRefs.set(email, { email, userId: r.inviter_id, referrals: [], accepted: 0 });
          }
          const invited = userMap.get(r.invited_user_id);
          inviterRefs.get(email).referrals.push({
            invitedEmail: r.invited_email || invited?.email || 'Unknown',
            status: r.status,
            type: r.referral_type,
            createdAt: r.created_at
          });
          if (r.status === 'accepted') {
            inviterRefs.get(email).accepted++;
          }
        });
        const result = Array.from(inviterRefs.values())
          .map(u => ({ ...u, refCount: u.referrals.length }))
          .sort((a, b) => b.accepted - a.accepted || b.refCount - a.refCount);
        
        return json({ type: 'referrals', data: result });
      }

      case 'referrals-user': {
        const userId = url.searchParams.get('userId');
        if (!userId) return json({ error: 'userId required' }, 400);
        
        const { data: referrals } = await supabase.from('referrals').select('*').eq('inviter_id', userId);
        const u = userMap.get(userId);
        const result = {
          email: u?.email || 'Unknown',
          referrals: (referrals || []).map(r => {
            const invited = userMap.get(r.invited_user_id);
            return {
              invitedEmail: r.invited_email || invited?.email || 'Unknown',
              status: r.status,
              type: r.referral_type,
              createdAt: r.created_at
            };
          }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        };
        
        return json({ type: 'referrals-user', data: result });
      }

      default:
        return json({ error: 'Invalid type' }, 400);
    }

  } catch (error) {
    console.error('Details error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
