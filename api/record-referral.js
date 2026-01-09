import { createClient } from '@supabase/supabase-js';
import { lookupReferralCode, linkUserToReferralCode } from './utils/referralCodes.js';

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

    // Look up the referral code in the centralized table
    const { inviterId, inviterEmail } = await lookupReferralCode(supabase, referralCode);

    // Fall back to taste_profiles for backward compatibility
    let finalInviterId = inviterId;
    let finalInviterEmail = inviterEmail;
    
    if (!finalInviterId && !finalInviterEmail) {
      const { data: inviterProfile } = await supabase
        .from('taste_profiles')
        .select('user_id')
        .eq('referral_code', referralCode)
        .single();
      
      finalInviterId = inviterProfile?.user_id;
    }

    // Need either inviter_id OR inviter_email to track the referral
    if (!finalInviterId && !finalInviterEmail) {
      console.log('Referral code not found:', referralCode);
      return json({ success: false, message: 'Invalid referral code' });
    }

    // Record the referral - allow null inviter_id if we have inviter_email
    // This handles beta/curator waitlist users who haven't created full accounts
    const referralData = {
      invited_email: newUserEmail || null,
      invited_user_id: newUserId,
      status: 'accepted',
      referral_type: 'link',
      accepted_at: new Date().toISOString()
    };
    
    // Add inviter_id if available, otherwise store inviter_email in a way we can track
    if (finalInviterId) {
      referralData.inviter_id = finalInviterId;
    }
    // Store inviter email for attribution even without user_id
    if (finalInviterEmail) {
      referralData.inviter_email = finalInviterEmail;
    }

    const { error: insertError } = await supabase
      .from('referrals')
      .insert(referralData);

    if (insertError) {
      console.error('Error recording referral:', insertError);
      // Don't fail the signup, just log the error
      return json({ success: false, message: 'Failed to record referral' });
    }

    // Link the new user to their referral code if they have one
    if (newUserEmail) {
      await linkUserToReferralCode(supabase, newUserEmail, newUserId);
    }

    return json({ success: true, message: 'Referral recorded' });
  } catch (error) {
    console.error('Record referral error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}
