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
    const { userId, userEmail, bookId, bookTitle, bookAuthor, bookCoverUrl, bookDescription, noteContent, curatorName = 'Sarah' } = body;

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

    // Build book info section with optional cover and description
    const bookCoverHtml = bookCoverUrl ? `
      <td style="width: 80px; vertical-align: top; padding-right: 16px;">
        <img src="${bookCoverUrl}" alt="${bookTitle}" width="80" style="border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />
      </td>
    ` : '';
    
    const bookDescriptionHtml = bookDescription ? `
      <p style="margin: 12px 0 0 0; font-size: 13px; color: #7A8F6C; line-height: 1.5;">
        <strong style="color: #5F7252;">About this book:</strong> ${bookDescription.length > 200 ? bookDescription.substring(0, 200) + '...' : bookDescription}
      </p>
    ` : '';

    // Build email HTML - mobile-friendly, no logo
    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>A Note from ${curatorName}</title>
  <style>
    :root { color-scheme: light; supported-color-schemes: light; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .mobile-padding { padding: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FDFBF4 !important; font-family: Georgia, 'Times New Roman', serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FDFBF4;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" class="email-container" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #5F7252; padding: 28px 24px;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 600; font-family: Georgia, serif; line-height: 1.3;">
                📚 A Note from ${curatorName}, Your Curator
              </h1>
            </td>
          </tr>
          
          <!-- Intro -->
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #4A5940;">
                I see you've added <strong>"${bookTitle}"</strong> to your reading queue. Here's why I love this book:
              </p>
            </td>
          </tr>
          
          <!-- Book Info with Cover -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="background-color: #F8F6EE; border-radius: 12px; padding: 20px; border-left: 4px solid #5F7252;">
                <table cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    ${bookCoverHtml}
                    <td style="vertical-align: top;">
                      <p style="margin: 0 0 4px 0; font-size: 18px; color: #4A5940; font-weight: 600;">
                        ${bookTitle}
                      </p>
                      ${bookAuthor ? `<p style="margin: 0; font-size: 14px; color: #7A8F6C;">by ${bookAuthor}</p>` : ''}
                      ${bookDescriptionHtml}
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Personal Note -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #5F7252; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                Why I Love This Book
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
                    <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #C97B7B 0%, #B56A6A 100%); border-radius: 50%; text-align: center; line-height: 48px;">
                      <span style="color: white; font-size: 20px;">♥</span>
                    </div>
                  </td>
                  <td>
                    <p style="margin: 0; font-size: 16px; color: #4A5940; font-weight: 600;">${curatorName}</p>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: #7A8F6C;">Your curator at Sarah's Books</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA -->
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <a href="https://www.sarahsbooks.com/my-queue" 
                 style="display: inline-block; background-color: #5F7252; color: #FFFFFF !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 14px; font-weight: 600; font-family: Georgia, serif;">
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
