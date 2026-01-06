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
