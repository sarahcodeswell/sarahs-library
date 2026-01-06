import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json();
    const invitedEmail = String(body?.email || '').trim().toLowerCase();
    const inviterToken = req.headers.get('authorization')?.replace('Bearer ', '');

    // Validate email
    if (!invitedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitedEmail)) {
      return json({ error: 'Valid email required' }, 400);
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return json({ error: 'Server not configured' }, 500);
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the inviter is authenticated
    let inviterId = null;
    if (inviterToken) {
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(inviterToken);
      if (!userError && user) {
        inviterId = user.id;
      }
    }

    // Check if this email is already a user
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const alreadyExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === invitedEmail);
    
    if (alreadyExists) {
      return json({ error: 'This person already has an account' }, 400);
    }

    // Check if already invited by this user
    if (inviterId) {
      const { data: existingInvite } = await supabaseAdmin
        .from('referrals')
        .select('id, status')
        .eq('inviter_id', inviterId)
        .eq('invited_email', invitedEmail)
        .single();

      if (existingInvite) {
        if (existingInvite.status === 'pending') {
          return json({ error: 'You already invited this person' }, 400);
        }
      }
    }

    // Send the invite via Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(invitedEmail, {
      redirectTo: `${process.env.SITE_URL || 'https://www.sarahsbooks.com'}/`,
    });

    if (error) {
      console.error('Invite error:', error);
      return json({ error: 'Failed to send invitation' }, 500);
    }

    // Record the referral
    if (inviterId) {
      await supabaseAdmin.from('referrals').upsert({
        inviter_id: inviterId,
        invited_email: invitedEmail,
        status: 'pending',
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'inviter_id,invited_email',
      });
    }

    return json({ ok: true, message: 'Invitation sent!' });
  } catch (e) {
    console.error('Invite handler error:', e);
    return json({ error: 'Failed to process request' }, 500);
  }
}
