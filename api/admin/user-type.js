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

      // Get queue counts
      const { data: queueData } = await supabase
        .from('reading_queue')
        .select('user_id');
      const queueCounts = new Map();
      (queueData || []).forEach(q => {
        queueCounts.set(q.user_id, (queueCounts.get(q.user_id) || 0) + 1);
      });

      // Get user_books counts
      const { data: booksData } = await supabase
        .from('user_books')
        .select('user_id');
      const bookCounts = new Map();
      (booksData || []).forEach(b => {
        bookCounts.set(b.user_id, (bookCounts.get(b.user_id) || 0) + 1);
      });

      // Get recommendations counts
      const { data: recsData } = await supabase
        .from('recommendations')
        .select('user_id');
      const recCounts = new Map();
      (recsData || []).forEach(r => {
        recCounts.set(r.user_id, (recCounts.get(r.user_id) || 0) + 1);
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
          queueCount: queueCounts.get(u.id) || 0,
          collectionCount: bookCounts.get(u.id) || 0,
          recsReceived: recCounts.get(u.id) || 0
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

  return json({ error: 'Method not allowed' }, 405);
}
