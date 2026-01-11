import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../utils/email.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin auth
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.user_type === 'admin' || user.email === 'sarah@darkridge.com';
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { feedbackId, recipientEmail, subject, message, newStatus } = req.body;

  if (!feedbackId || !recipientEmail || !message) {
    return res.status(400).json({ error: 'feedbackId, recipientEmail, and message are required' });
  }

  try {
    // Build email content
    const emailContent = `
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
        Hi there,
      </p>
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
        Thank you for your feedback! We wanted to follow up with you.
      </p>
      <div style="background-color: #F8F6EE; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="font-size: 15px; line-height: 1.6; margin: 0; color: #4A5940; white-space: pre-wrap;">${message}</p>
      </div>
      <p style="font-size: 15px; line-height: 1.6; margin: 20px 0 0 0;">
        Thanks for helping us make Sarah's Books better!
      </p>
      <p style="font-size: 15px; line-height: 1.6; margin: 10px 0 0 0; color: #5F7252;">
        — Sarah
      </p>
    `;

    // Send the email
    const emailResult = await sendEmail({
      to: recipientEmail,
      subject: subject || "Following up on your feedback",
      html: emailContent,
      fromName: "Sarah from Sarah's Books"
    });

    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Failed to send email');
    }

    // Update feedback record with reply info and optionally new status
    const updateData = {
      admin_reply_sent: true,
      admin_reply_at: new Date().toISOString(),
      admin_reply_message: message
    };

    if (newStatus) {
      updateData.status = newStatus;
    }

    const { error: updateError } = await supabase
      .from('feedback')
      .update(updateData)
      .eq('id', feedbackId);

    if (updateError) {
      console.error('Error updating feedback:', updateError);
      // Email was sent, so don't fail completely
    }

    return res.status(200).json({ 
      success: true, 
      emailId: emailResult.id 
    });

  } catch (error) {
    console.error('Feedback reply error:', error);
    return res.status(500).json({ 
      error: 'Failed to send reply',
      details: error.message 
    });
  }
}
