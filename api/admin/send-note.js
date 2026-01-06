import { json, getSupabaseClient, verifyAdmin } from './_shared.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const { client: supabase, error: configError } = getSupabaseClient();
    if (configError) {
      return json({ error: configError }, 500);
    }

    const authResult = await verifyAdmin(supabase, request.headers.get('Authorization'));
    if (authResult.error) {
      return json({ error: authResult.error }, authResult.status);
    }

    // Parse request body
    const body = await request.json();
    const { userId, userEmail, bookId, bookTitle, bookAuthor, noteContent } = body;

    if (!userId || !userEmail || !bookTitle || !noteContent) {
      return json({ error: 'Missing required fields: userId, userEmail, bookTitle, noteContent' }, 400);
    }

    // Check if note already sent for this user+book
    if (bookId) {
      const { data: existing } = await supabase
        .from('admin_notes')
        .select('id')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .single();

      if (existing) {
        return json({ error: 'Note already sent for this book', alreadySent: true }, 409);
      }
    }

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F3; font-family: Georgia, 'Times New Roman', serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF8F3; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 560px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #5F7252 0%, #4A5940 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: normal; letter-spacing: 0.5px;">
                📚 A Note from Sarah
              </h1>
            </td>
          </tr>
          
          <!-- Book Info -->
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <div style="background-color: #F8F6EE; border-radius: 12px; padding: 20px; border-left: 4px solid #5F7252;">
                <p style="margin: 0 0 4px 0; font-size: 18px; color: #4A5940; font-weight: 600;">
                  ${bookTitle}
                </p>
                ${bookAuthor ? `<p style="margin: 0; font-size: 14px; color: #7A8F6C;">by ${bookAuthor}</p>` : ''}
              </div>
            </td>
          </tr>
          
          <!-- Personal Note -->
          <tr>
            <td style="padding: 16px 32px 32px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #96A888; text-transform: uppercase; letter-spacing: 1px;">
                Why I love this book...
              </p>
              <div style="font-size: 16px; line-height: 1.7; color: #4A5940;">
                ${noteContent.replace(/\n/g, '<br>')}
              </div>
            </td>
          </tr>
          
          <!-- Signature -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right: 16px;">
                    <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #C97B7B 0%, #B56A6A 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                      <span style="color: white; font-size: 20px; line-height: 48px; text-align: center; display: block; width: 100%;">♥</span>
                    </div>
                  </td>
                  <td>
                    <p style="margin: 0; font-size: 16px; color: #4A5940; font-weight: 600;">Sarah</p>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: #7A8F6C;">Your curator at Sarah's Books</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA -->
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <a href="https://www.sarahsbooks.com/queue" 
                 style="display: inline-block; background: linear-gradient(135deg, #5F7252 0%, #4A5940 100%); color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                View Your Reading Queue →
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F8F6EE; padding: 24px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #96A888;">
                You're receiving this because you added "${bookTitle}" to your reading queue.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #96A888;">
                <a href="https://www.sarahsbooks.com" style="color: #5F7252; text-decoration: none;">Sarah's Books</a> • For the ♥ of reading
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const subject = `A personal note about "${bookTitle}" 📚`;

    // Send email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      // No API key - save note but don't send email
      const { error: insertError } = await supabase
        .from('admin_notes')
        .insert({
          user_id: userId,
          user_email: userEmail,
          book_id: bookId || null,
          book_title: bookTitle,
          book_author: bookAuthor || null,
          note_content: noteContent
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        return json({ error: 'Failed to save note', details: insertError.message }, 500);
      }

      return json({ 
        success: true, 
        message: 'Note saved (email not sent - RESEND_API_KEY not configured)',
        emailSent: false
      });
    }

    // Save note to database FIRST (so we don't lose content if email times out)
    const { error: insertError } = await supabase
      .from('admin_notes')
      .insert({
        user_id: userId,
        user_email: userEmail,
        book_id: bookId || null,
        book_title: bookTitle,
        book_author: bookAuthor || null,
        note_content: noteContent,
        sent_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return json({ 
        success: false, 
        message: 'Failed to save note to database',
        error: insertError.message
      }, 500);
    }

    // Send via Resend
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Sarah from Sarah's Books <${fromEmail}>`,
        to: [userEmail],
        subject,
        html: emailHtml
      })
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('Resend error:', emailResult);
      // Note is saved, but email failed - user can retry or we can add resend later
      return json({ 
        success: true, 
        message: 'Note saved (email delivery failed - will retry)',
        emailSent: false,
        warning: emailResult
      });
    }

    return json({ 
      success: true, 
      message: 'Personal note sent!',
      emailSent: true,
      emailId: emailResult.id
    });

  } catch (error) {
    console.error('Send note error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
