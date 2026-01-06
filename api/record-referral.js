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
    const { referralCode, newUserId, newUserEmail } = await req.json();

    if (!referralCode || !newUserId) {
      return json({ error: 'Missing required fields' }, 400);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return json({ error: 'Server configuration error' }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the inviter by their referral code
    const { data: inviterProfile, error: profileError } = await supabase
      .from('taste_profiles')
      .select('user_id')
      .eq('referral_code', referralCode)
      .single();

    if (profileError || !inviterProfile) {
      console.log('Referral code not found:', referralCode);
      return json({ success: false, message: 'Invalid referral code' });
    }

    // Record the referral
    const { error: insertError } = await supabase
      .from('referrals')
      .insert({
        inviter_id: inviterProfile.user_id,
        invited_email: newUserEmail || null,
        invited_user_id: newUserId,
        status: 'accepted',
        referral_type: 'link',
        accepted_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error recording referral:', insertError);
      // Don't fail the signup, just log the error
      return json({ success: false, message: 'Failed to record referral' });
    }

    return json({ success: true, message: 'Referral recorded' });
  } catch (error) {
    console.error('Record referral error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}
