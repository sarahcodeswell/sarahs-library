// API endpoint for curator waitlist signup with confirmation email
import { createClient } from '@supabase/supabase-js';
import { sendCuratorWaitlistEmail } from '../utils/email.js';

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
      'Access-Control-Allow-Headers': 'Content-Type',
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
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const { email } = await request.json();

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

    // Check if already on waitlist
    const { data: existing } = await supabase
      .from('curator_waitlist')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      // Already on waitlist - still return success but don't send another email
      return json({ 
        success: true, 
        message: "You're already on the waitlist!",
        alreadyExists: true 
      });
    }

    // Add to waitlist
    const { error: insertError } = await supabase
      .from('curator_waitlist')
      .insert([{ 
        email: email.toLowerCase(), 
        created_at: new Date().toISOString() 
      }]);

    if (insertError) {
      console.error('Waitlist insert error:', insertError);
      return json({ error: 'Failed to join waitlist' }, 500);
    }

    // Get waitlist position (count of entries)
    const { count: position } = await supabase
      .from('curator_waitlist')
      .select('*', { count: 'exact', head: true });

    // Send confirmation email with position (don't fail if email fails)
    const emailResult = await sendCuratorWaitlistEmail(email, position);
    
    if (!emailResult.success) {
      console.warn('Waitlist email failed:', emailResult.error);
    }

    return json({ 
      success: true, 
      message: "You're on the waitlist!",
      emailSent: emailResult.success
    });

  } catch (error) {
    console.error('Curator waitlist error:', error);
    return json({ error: 'Something went wrong' }, 500);
  }
}
