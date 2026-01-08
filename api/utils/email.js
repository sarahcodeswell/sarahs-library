// Email Service - Centralized email sending via Resend
// All transactional emails go through this module

const RESEND_API_URL = 'https://api.resend.com/emails';

/**
 * Send an email via Resend API
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} [options.fromName] - Sender name (default: "Sarah's Books")
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function sendEmail({ to, subject, html, fromName = "Sarah's Books" }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject,
        html
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Email] Send failed:', data);
      return { success: false, error: data.message || 'Failed to send email' };
    }

    return { success: true, id: data.id };
  } catch (error) {
    console.error('[Email] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Email template wrapper with Sarah's Books branding
 */
function brandedTemplate({ title, preheader, content, footerText }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  ${preheader ? `<span style="display:none;font-size:1px;color:#FDFBF4;max-height:0;overflow:hidden;">${preheader}</span>` : ''}
</head>
<body style="margin: 0; padding: 0; background-color: #FDFBF4; font-family: 'Poppins', Georgia, 'Times New Roman', serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDFBF4; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 560px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #5F7252 0%, #4A5940 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: normal; letter-spacing: 0.5px;">
                ${title}
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F8F6EE; padding: 24px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #96A888;">
                ${footerText || "You're receiving this because you signed up at Sarah's Books."}
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
}

/**
 * Send curator waitlist confirmation email
 */
export async function sendCuratorWaitlistEmail(email) {
  const html = brandedTemplate({
    title: "✨ You're on the Curator Waitlist!",
    preheader: "We'll let you know when you can start building your library.",
    content: `
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #4A5940;">
        Thanks for your interest in becoming a curator on Sarah's Books!
      </p>
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #4A5940;">
        We're building something special—a platform where passionate readers like you can share their curated book collections and help others discover their next great read.
      </p>
      <div style="background-color: #F8F6EE; border-radius: 12px; padding: 20px; border-left: 4px solid #5F7252; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #5F7252; font-weight: 600;">What's next?</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #7A8F6C;">
          We'll reach out when curator accounts are ready. In the meantime, explore Sarah's collection and discover some great books!
        </p>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="https://www.sarahsbooks.com" 
               style="display: inline-block; background: linear-gradient(135deg, #5F7252 0%, #4A5940 100%); color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
              Explore Sarah's Books →
            </a>
          </td>
        </tr>
      </table>
    `,
    footerText: "You're receiving this because you joined the curator waitlist."
  });

  return sendEmail({
    to: email,
    subject: "You're on the Curator Waitlist! ✨",
    html,
    fromName: "Sarah from Sarah's Books"
  });
}

/**
 * Send beta tester (Read with Friends) confirmation email
 */
export async function sendBetaTesterEmail(email) {
  const html = brandedTemplate({
    title: "💜 You're In! Beta Access Coming Soon",
    preheader: "Thanks for signing up for Read with Friends beta.",
    content: `
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #4A5940;">
        You're officially on the list for <strong>Read with Friends</strong> beta access!
      </p>
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #4A5940;">
        We're building a thoughtful way to share book recommendations with the people you care about—no more lost screenshots or forgotten titles.
      </p>
      <div style="background-color: #F8F6EE; border-radius: 12px; padding: 20px; border-left: 4px solid #c96b6b; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #4A5940; font-weight: 600;">Coming soon:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; color: #7A8F6C;">
          <li>Find friends on the platform</li>
          <li>Share recommendations directly</li>
          <li>See what friends are reading</li>
        </ul>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="https://www.sarahsbooks.com" 
               style="display: inline-block; background: linear-gradient(135deg, #c96b6b 0%, #b55a5a 100%); color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
              Explore Sarah's Books →
            </a>
          </td>
        </tr>
      </table>
    `,
    footerText: "You're receiving this because you signed up for Read with Friends beta."
  });

  return sendEmail({
    to: email,
    subject: "You're In! Read with Friends Beta 💜",
    html,
    fromName: "Sarah from Sarah's Books"
  });
}

/**
 * Send product update email to opted-in users
 */
export async function sendProductUpdateEmail(email, { title, content, ctaText, ctaUrl }) {
  const html = brandedTemplate({
    title: `📚 ${title}`,
    preheader: title,
    content: `
      <div style="font-size: 16px; line-height: 1.7; color: #4A5940;">
        ${content}
      </div>
      ${ctaText && ctaUrl ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
        <tr>
          <td align="center">
            <a href="${ctaUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #5F7252 0%, #4A5940 100%); color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
              ${ctaText}
            </a>
          </td>
        </tr>
      </table>
      ` : ''}
    `,
    footerText: "You're receiving this because you opted in to product updates. <a href='https://www.sarahsbooks.com/profile' style='color: #5F7252;'>Manage preferences</a>"
  });

  return sendEmail({
    to: email,
    subject: title,
    html,
    fromName: "Sarah from Sarah's Books"
  });
}
