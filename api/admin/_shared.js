import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

export const MASTER_ADMIN_EMAIL = 'sarah@darkridge.com';

export const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return { error: 'Server configuration error' };
  }

  return { client: createClient(supabaseUrl, supabaseServiceKey) };
};

export const verifyAdmin = async (supabase, authHeader) => {
  if (!authHeader) {
    return { error: 'Unauthorized', status: 401 };
  }
  
  // Handle both 'Bearer ' and 'bearer ' prefixes
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token || token === authHeader) {
    return { error: 'Invalid authorization header', status: 401 };
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user || user.email !== MASTER_ADMIN_EMAIL) {
    return { error: 'Unauthorized', status: 403 };
  }

  return { user };
};

export const getDateRange = (period) => {
  const now = new Date();
  switch (period) {
    case '1d':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return null; // lifetime
  }
};

export const getUserMap = async (supabase) => {
  const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const users = usersData?.users || [];
  return new Map(users.map(u => [u.id, u]));
};

// Get user map with display names from taste_profiles
export const getUserMapWithNames = async (supabase) => {
  const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const users = usersData?.users || [];
  
  // Get display names from taste_profiles (handle if column doesn't exist)
  let nameMap = new Map();
  try {
    const { data: profiles, error } = await supabase.from('taste_profiles').select('user_id, display_name');
    if (!error && profiles) {
      nameMap = new Map(profiles.map(p => [p.user_id, p.display_name]));
    }
  } catch (e) {
    console.error('Error fetching display names:', e);
  }
  
  // Combine user data with display names
  return new Map(users.map(u => {
    const displayName = nameMap.get(u.id) || u.user_metadata?.full_name || null;
    return [u.id, { ...u, displayName }];
  }));
};
