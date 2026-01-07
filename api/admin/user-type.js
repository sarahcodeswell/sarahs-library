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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return json({ error: 'Server configuration error' }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify admin access
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return json({ error: 'Unauthorized' }, 401);
  }
  
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user || user.email !== MASTER_ADMIN_EMAIL) {
    return json({ error: 'Unauthorized' }, 403);
  }

  if (req.method === 'GET') {
    // List all users with full data
    try {
      // Get all auth users
      const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const authUsers = usersData?.users || [];

      // Get all taste profiles
      const { data: profiles } = await supabase
        .from('taste_profiles')
        .select('*');
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Get queue data with status breakdown
      const { data: queueData } = await supabase
        .from('reading_queue')
        .select('user_id, status');
      const queueCounts = new Map(); // Books queued (want_to_read, reading)
      const readCounts = new Map();  // Books read (finished)
      (queueData || []).forEach(q => {
        if (q.status === 'finished') {
          readCounts.set(q.user_id, (readCounts.get(q.user_id) || 0) + 1);
        } else {
          queueCounts.set(q.user_id, (queueCounts.get(q.user_id) || 0) + 1);
        }
      });

      // Get user_books counts (books added to collection)
      const { data: booksData } = await supabase
        .from('user_books')
        .select('user_id');
      const bookCounts = new Map();
      (booksData || []).forEach(b => {
        bookCounts.set(b.user_id, (bookCounts.get(b.user_id) || 0) + 1);
      });

      // Get recommendations received
      const { data: recsReceivedData } = await supabase
        .from('recommendations')
        .select('user_id');
      const recsReceivedCounts = new Map();
      (recsReceivedData || []).forEach(r => {
        recsReceivedCounts.set(r.user_id, (recsReceivedCounts.get(r.user_id) || 0) + 1);
      });

      // Get recommendations made (as sharer) with acceptance status
      const { data: recsMadeData } = await supabase
        .from('recommendations')
        .select('sharer_id, accepted_at');
      const recsMadeCounts = new Map();
      const recsAcceptedCounts = new Map();
      (recsMadeData || []).forEach(r => {
        if (r.sharer_id) {
          recsMadeCounts.set(r.sharer_id, (recsMadeCounts.get(r.sharer_id) || 0) + 1);
          if (r.accepted_at) {
            recsAcceptedCounts.set(r.sharer_id, (recsAcceptedCounts.get(r.sharer_id) || 0) + 1);
          }
        }
      });

      // Generate book-themed referral code from userId
      const generateBookCode = (id) => {
        const bookWords = [
          'CHAPTER', 'NOVEL', 'STORY', 'READER', 'PAGES', 'PROSE', 
          'SHELF', 'SPINE', 'COVER', 'WORDS', 'TALES', 'BOOKS',
          'PLOT', 'QUEST', 'SAGA', 'EPIC', 'VERSE', 'INK'
        ];
        const hash = parseInt(id.replace(/-/g, '').substring(0, 4), 16);
        const word = bookWords[hash % bookWords.length];
        const digits = id.replace(/-/g, '').substring(4, 7).toUpperCase();
        return `${word}${digits}`;
      };

      // Combine all data
      const users = authUsers.map(u => {
        const profile = profileMap.get(u.id) || {};
        return {
          userId: u.id,
          email: u.email,
          name: profile.display_name || u.user_metadata?.full_name || null,
          userType: profile.user_type || 'reader',
          createdAt: u.created_at,
          lastSignIn: u.last_sign_in_at,
          deletedAt: profile.deleted_at || null,
          // Profile data
          birthYear: profile.birth_year,
          city: profile.city,
          state: profile.state,
          country: profile.country,
          favoriteGenres: profile.favorite_genres,
          favoriteBookstore: profile.favorite_bookstore,
          favoriteAuthors: profile.favorite_authors,
          referralCode: profile.referral_code || generateBookCode(u.id),
          // Activity counts
          booksQueued: queueCounts.get(u.id) || 0,
          booksRead: readCounts.get(u.id) || 0,
          booksAdded: bookCounts.get(u.id) || 0,
          recsReceived: recsReceivedCounts.get(u.id) || 0,
          recsMade: recsMadeCounts.get(u.id) || 0,
          recsAccepted: recsAcceptedCounts.get(u.id) || 0
        };
      });

      // Sort: deleted users last, then by created date (newest first)
      users.sort((a, b) => {
        if (a.deletedAt && !b.deletedAt) return 1;
        if (!a.deletedAt && b.deletedAt) return -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      return json({ users });
    } catch (error) {
      console.error('Error listing users:', error);
      return json({ users: [], error: error.message });
    }
  }

  if (req.method === 'POST') {
    // Update user type
    try {
      const body = await req.json();
      const { userId, email, userType } = body;

      if (!userType || !['reader', 'curator', 'admin'].includes(userType)) {
        return json({ error: 'Invalid user type' }, 400);
      }

      let targetUserId = userId;

      // If email provided instead of userId, look up the user
      if (!targetUserId && email) {
        const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const foundUser = (usersData?.users || []).find(u => u.email === email);
        if (!foundUser) {
          return json({ error: 'User not found with that email' }, 404);
        }
        targetUserId = foundUser.id;
      }

      if (!targetUserId) {
        return json({ error: 'userId or email required' }, 400);
      }

      // Check if user has a taste_profile, create one if not
      const { data: existingProfile } = await supabase
        .from('taste_profiles')
        .select('user_id')
        .eq('user_id', targetUserId)
        .single();

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('taste_profiles')
          .update({ user_type: userType })
          .eq('user_id', targetUserId);

        if (error) throw error;
      } else {
        // Create new profile with user_type
        const { error } = await supabase
          .from('taste_profiles')
          .insert({ user_id: targetUserId, user_type: userType });

        if (error) throw error;
      }

      return json({ success: true, userId: targetUserId, userType });
    } catch (error) {
      console.error('Error updating user type:', error);
      return json({ error: 'Failed to update user type' }, 500);
    }
  }

  if (req.method === 'DELETE') {
    // Soft delete user - mark as deleted and clear their data
    try {
      let userId;
      try {
        const url = new URL(req.url);
        userId = url.searchParams.get('userId');
      } catch (urlError) {
        return json({ error: 'Invalid URL: ' + urlError.message }, 400);
      }

      if (!userId) {
        return json({ error: 'userId required' }, 400);
      }

      // Prevent deleting yourself
      if (userId === user.id) {
        return json({ error: 'Cannot delete your own account' }, 400);
      }

      // Get user email for the deleted record
      const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const targetUser = (usersData?.users || []).find(u => u.id === userId);
      const userEmail = targetUser?.email || 'unknown';

      // Delete user data from activity tables
      const userIdTables = [
        'reading_queue',
        'user_books', 
        'admin_notes',
        'book_interactions',
        'theme_interactions',
        'search_queries',
        'user_sessions',
        'user_events',
        'chat_history',
        'dismissed_recommendations',
        'recommendation_outcomes'
      ];

      for (const table of userIdTables) {
        await supabase.from(table).delete().eq('user_id', userId);
      }

      // Delete referrals where user is the inviter OR the invited user
      await supabase.from('referrals').delete().eq('inviter_id', userId);
      await supabase.from('referrals').delete().eq('invited_user_id', userId);

      // Delete user_recommendations (shared_recommendations cascade via FK)
      await supabase.from('user_recommendations').delete().eq('user_id', userId);

      // Delete taste_profiles entirely (required for auth deletion due to FK constraint)
      await supabase.from('taste_profiles').delete().eq('user_id', userId);

      // Hard delete from Supabase Auth
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authDeleteError) {
        console.error('Error deleting user from auth:', authDeleteError);
        // User data is already cleared, just warn about auth deletion failure
        return json({ 
          success: true, 
          message: 'User data deleted, but auth record removal failed. You may need to delete from Supabase dashboard.',
          warning: authDeleteError.message
        });
      }

      return json({ 
        success: true, 
        message: 'User permanently deleted.' 
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      return json({ error: 'Failed to delete user: ' + (error?.message || String(error)) }, 500);
    }
  }

  return json({ error: 'Method not allowed' }, 405);
}
