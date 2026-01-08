// API endpoint for beta tester signup (Read with Friends) with confirmation email
import { createClient } from '@supabase/supabase-js';
import { sendBetaTesterEmail } from '../utils/email.js';
import { getOrCreateReferralCode } from '../utils/referralCodes.js';

export const config = {
  runtime: 'edge',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export default async function handler(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const { email, userId, interestedFeatures, feedback } = await request.json();

    if (!email || !email.includes('@')) {
      return json({ error: 'Valid email required' }, 400);
    }

    // Initialize Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return json({ error: 'Database not configured' }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if already signed up
    const { data: existing } = await supabase
      .from('beta_testers')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return json({ 
        success: true, 
        message: "You're already signed up for beta!",
        alreadyExists: true 
      });
    }

    // Add to beta testers
    const { error: insertError } = await supabase
      .from('beta_testers')
      .insert([{ 
        email: email.toLowerCase(),
        user_id: userId || null,
        interested_features: interestedFeatures || ['read_with_friends'],
        feedback: feedback || null,
        created_at: new Date().toISOString() 
      }]);

    if (insertError) {
      console.error('Beta signup insert error:', insertError);
      return json({ error: 'Failed to sign up for beta' }, 500);
    }

    // Get beta list position (count of entries)
    const { count: position } = await supabase
      .from('beta_testers')
      .select('*', { count: 'exact', head: true });

    // Generate referral code for this email
    const { code: referralCode } = await getOrCreateReferralCode(
      supabase, 
      email, 
      'beta_signup'
    );

    // Send confirmation email with position
    const emailResult = await sendBetaTesterEmail(email, position);
    
    if (!emailResult.success) {
      console.warn('Beta email failed:', emailResult.error);
    }

    return json({ 
      success: true, 
      message: "You're signed up for beta!",
      position: position,
      referralCode: referralCode,
      emailSent: emailResult.success
    });

  } catch (error) {
    console.error('Beta signup error:', error);
    return json({ error: 'Something went wrong' }, 500);
  }
}
