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
    // List all admins
    try {
      const { data: admins, error } = await supabase
        .from('taste_profiles')
        .select('user_id, display_name, user_type')
        .eq('user_type', 'admin');

      // If error (e.g., column doesn't exist), return empty array
      if (error) {
        console.error('Error fetching admins:', error);
        return json({ admins: [] });
      }

      // Get user emails
      const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const userMap = new Map((usersData?.users || []).map(u => [u.id, u]));

      const result = (admins || []).map(a => {
        const u = userMap.get(a.user_id);
        return {
          userId: a.user_id,
          email: u?.email || 'Unknown',
          name: a.display_name || u?.user_metadata?.full_name || null,
          userType: a.user_type
        };
      });

      return json({ admins: result });
    } catch (error) {
      console.error('Error listing admins:', error);
      return json({ admins: [] });
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
