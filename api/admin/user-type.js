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
          // Profile data
          birthYear: profile.birth_year,
          city: profile.city,
          state: profile.state,
          country: profile.country,
          favoriteGenres: profile.favorite_genres,
          favoriteBookstore: profile.favorite_bookstore,
          favoriteAuthors: profile.favorite_authors,
          referralCode: profile.referral_code,
          // Activity counts
          booksQueued: queueCounts.get(u.id) || 0,
          booksRead: readCounts.get(u.id) || 0,
          booksAdded: bookCounts.get(u.id) || 0,
          recsReceived: recsReceivedCounts.get(u.id) || 0,
          recsMade: recsMadeCounts.get(u.id) || 0,
          recsAccepted: recsAcceptedCounts.get(u.id) || 0
        };
      });

      // Sort by created date (newest first)
      users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
    // Delete user and all their data
    try {
      const url = new URL(req.url);
      const userId = url.searchParams.get('userId');

      if (!userId) {
        return json({ error: 'userId required' }, 400);
      }

      // Prevent deleting yourself
      if (userId === user.id) {
        return json({ error: 'Cannot delete your own account' }, 400);
      }

      const errors = [];

      // Delete user data from all tables with user_id column
      const userIdTables = [
        'reading_queue',
        'user_books', 
        'recommendations',
        'taste_profiles',
        'admin_notes',
        'book_interactions',
        'theme_interactions',
        'search_queries',
        'user_sessions',
        'user_events'
      ];

      for (const table of userIdTables) {
        const { error } = await supabase.from(table).delete().eq('user_id', userId);
        if (error && !error.message?.includes('does not exist')) {
          errors.push(`${table}: ${error.message}`);
        }
      }

      // Delete referrals where user is the inviter
      const { error: refError } = await supabase.from('referrals').delete().eq('inviter_id', userId);
      if (refError && !refError.message?.includes('does not exist')) {
        errors.push(`referrals: ${refError.message}`);
      }

      // Delete shared_recommendations where user is the sharer
      const { error: shareError } = await supabase.from('shared_recommendations').delete().eq('sharer_id', userId);
      if (shareError && !shareError.message?.includes('does not exist')) {
        errors.push(`shared_recommendations: ${shareError.message}`);
      }

      // Log any table deletion errors but continue
      if (errors.length > 0) {
        console.error('Table deletion errors:', errors);
      }

      // Delete the auth user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error('Error deleting auth user:', deleteError);
        return json({ error: `Failed to delete auth user: ${deleteError.message}` }, 500);
      }

      return json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      return json({ error: 'Failed to delete user' }, 500);
    }
  }

  return json({ error: 'Method not allowed' }, 405);
}
