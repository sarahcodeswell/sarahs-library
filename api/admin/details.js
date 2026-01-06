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
        
        // Fetch queue and any sent notes for this user
        const [{ data: queue }, { data: sentNotes }] = await Promise.all([
          supabase.from('reading_queue').select('*').eq('user_id', userId),
          supabase.from('admin_notes').select('book_id, book_title, note_content, sent_at').eq('user_id', userId)
        ]);
        
        // Build a map of sent notes by book_title (since book_id can be null)
        const notesMap = new Map();
        (sentNotes || []).forEach(n => {
          if (n.book_id) notesMap.set(n.book_id, n);
          if (n.book_title) notesMap.set(n.book_title.toLowerCase(), n);
        });
        
        const u = userMap.get(userId);
        const result = {
          email: u?.email || 'Unknown',
          books: (queue || []).map(q => {
            const note = notesMap.get(q.book_id) || notesMap.get(q.book_title?.toLowerCase());
            return {
              bookId: q.book_id,
              queueId: q.id,
              title: q.book_title,
              author: q.book_author,
              owned: q.owned,
              priority: q.priority,
              addedAt: q.created_at,
              noteSent: !!note,
              noteContent: note?.note_content || null,
              noteSentAt: note?.sent_at || null
            };
          }).sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
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

      case 'collection': {
        // Get all user books (collections)
        const { data: userBooks } = await supabase.from('user_books').select('*');
        
        // Get admin's collection for overlap calculation
        const adminUser = Array.from(userMap.entries()).find(([id, u]) => u.email === MASTER_ADMIN_EMAIL);
        const adminId = adminUser?.[0];
        const adminBooks = (userBooks || []).filter(b => b.user_id === adminId);
        const adminTitles = new Set(adminBooks.map(b => b.book_title?.toLowerCase()));
        
        // Group by user
        const userCollections = new Map();
        (userBooks || []).forEach(b => {
          const u = userMap.get(b.user_id);
          const email = u?.email || 'Unknown';
          if (email === MASTER_ADMIN_EMAIL) return; // Exclude admin
          if (!userCollections.has(email)) {
            userCollections.set(email, { email, userId: b.user_id, books: [], overlap: 0 });
          }
          userCollections.get(email).books.push({
            title: b.book_title,
            author: b.book_author,
            addedAt: b.added_at,
            rating: b.rating,
            status: b.status
          });
          // Check overlap with admin collection
          if (adminTitles.has(b.book_title?.toLowerCase())) {
            userCollections.get(email).overlap++;
          }
        });
        
        const result = Array.from(userCollections.values())
          .map(u => ({ 
            ...u, 
            bookCount: u.books.length,
            overlapPercent: u.books.length > 0 ? Math.round((u.overlap / u.books.length) * 100) : 0
          }))
          .sort((a, b) => b.bookCount - a.bookCount);
        
        return json({ type: 'collection', data: result });
      }

      case 'collection-user': {
        const userId = url.searchParams.get('userId');
        if (!userId) return json({ error: 'userId required' }, 400);
        
        // Get user's books and admin's books for overlap
        const [{ data: userBooks }, { data: adminBooksResult }] = await Promise.all([
          supabase.from('user_books').select('*').eq('user_id', userId),
          supabase.from('user_books').select('book_title').eq('user_id', 
            Array.from(userMap.entries()).find(([id, u]) => u.email === MASTER_ADMIN_EMAIL)?.[0]
          )
        ]);
        
        const adminTitles = new Set((adminBooksResult || []).map(b => b.book_title?.toLowerCase()));
        const u = userMap.get(userId);
        
        const result = {
          email: u?.email || 'Unknown',
          books: (userBooks || []).map(b => ({
            title: b.book_title,
            author: b.book_author,
            addedAt: b.added_at,
            rating: b.rating,
            status: b.status,
            inAdminCollection: adminTitles.has(b.book_title?.toLowerCase())
          })).sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
        };
        
        return json({ type: 'collection-user', data: result });
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
