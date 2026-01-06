import { json, getSupabaseClient, verifyAdmin } from './_shared.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const { client: supabase, error: configError } = getSupabaseClient();
  if (configError) {
    return json({ error: configError }, 500);
  }

  // Verify admin access
  const authResult = await verifyAdmin(supabase, req.headers.get('authorization'));
  if (authResult.error) {
    return json({ error: authResult.error }, authResult.status);
  }

  if (req.method === 'GET') {
    // List all admins
    try {
      const { data: admins, error } = await supabase
        .from('taste_profiles')
        .select('user_id, display_name, user_type')
        .eq('user_type', 'admin');

      // If user_type column doesn't exist yet, return empty array
      if (error) {
        console.error('Error fetching admins:', error);
        // Return empty array if column doesn't exist
        if (error.message?.includes('user_type') || error.code === '42703') {
          return json({ admins: [] });
        }
        throw error;
      }

      // Get user emails
      const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const userMap = new Map((usersData?.users || []).map(u => [u.id, u]));

      const result = (admins || []).map(a => {
        const user = userMap.get(a.user_id);
        return {
          userId: a.user_id,
          email: user?.email || 'Unknown',
          name: a.display_name || user?.user_metadata?.full_name || null,
          userType: a.user_type
        };
      });

      return json({ admins: result });
    } catch (error) {
      console.error('Error listing admins:', error);
      return json({ error: 'Failed to list admins' }, 500);
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
        const user = (usersData?.users || []).find(u => u.email === email);
        if (!user) {
          return json({ error: 'User not found with that email' }, 404);
        }
        targetUserId = user.id;
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
