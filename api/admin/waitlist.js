import { json, getSupabaseClient, verifyAdmin } from './_shared.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'DELETE') {
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
    const type = url.searchParams.get('type'); // 'curator' or 'beta'
    const email = url.searchParams.get('email');

    if (!type || !email) {
      return json({ error: 'Missing type or email parameter' }, 400);
    }

    const table = type === 'curator' ? 'curator_waitlist' : 'beta_testers';

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('email', email);

    if (error) {
      console.error('Delete error:', error);
      return json({ error: 'Failed to delete entry' }, 500);
    }

    return json({ success: true, message: `Removed ${email} from ${type === 'curator' ? 'curator waitlist' : 'beta testers'}` });
  } catch (err) {
    console.error('Waitlist delete error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
}
