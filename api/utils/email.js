// Email Service - Centralized email sending via Resend
// All transactional emails go through this module

const RESEND_API_URL = 'https://api.resend.com/emails';
const LOGO_URL = 'https://www.sarahsbooks.com/linkedin-logo.png';
const SITE_URL = 'https://www.sarahsbooks.com';

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
 * Mobile-friendly and dark mode resistant
 */
function brandedTemplate({ title, preheader, content, footerText }) {
  return `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
    .button-link {padding: 14px 32px !important;}
  </style>
  <![endif]-->
  <style>
    :root { color-scheme: light; supported-color-schemes: light; }
    body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .mobile-padding { padding: 20px !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
    }
    /* Prevent dark mode color inversion */
    [data-ogsc] .dark-mode-bg { background-color: #FFFFFF !important; }
    [data-ogsc] .dark-mode-text { color: #4A5940 !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FDFBF4 !important; font-family: Georgia, 'Times New Roman', serif; -webkit-font-smoothing: antialiased;">
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #FDFBF4;">${preheader}</div>` : ''}
  
  <!-- Email wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FDFBF4;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        
        <!-- Email container -->
        <table role="presentation" class="email-container" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #5F7252; padding: 28px 24px;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 600; font-family: Georgia, serif; line-height: 1.3;">
                ${title}
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="mobile-padding dark-mode-bg" style="padding: 32px; background-color: #FFFFFF;">
              <div class="dark-mode-text" style="color: #4A5940;">
                ${content}
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #F8F6EE; padding: 24px; border-top: 1px solid #E8EBE4;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #7A8F6C; line-height: 1.5;">
                ${footerText || "You're receiving this because you signed up at Sarah's Books."}
              </p>
              <p style="margin: 0; font-size: 12px; color: #7A8F6C;">
                <a href="${SITE_URL}" style="color: #5F7252; text-decoration: none; font-weight: 600;">Sarah's Books</a> 
                <span style="color: #96A888;">&bull;</span> 
                For the <span style="color: #c96b6b;">&#10084;</span> of reading
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
 * Feature card component for emails
 */
function featureCard(icon, title, description) {
  return `
    <div style="background-color: #F8F6EE; border-radius: 12px; padding: 16px 20px; margin-bottom: 12px;">
      <div style="display: flex; align-items: flex-start;">
        <span style="font-size: 20px; margin-right: 12px;">${icon}</span>
        <div>
          <p style="margin: 0; font-size: 14px; color: #4A5940; font-weight: 600;">${title}</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #7A8F6C;">${description}</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Primary button component - mobile friendly with solid colors for dark mode
 */
function primaryButton(text, url, color = 'green') {
  const bgColor = color === 'rose' ? '#c96b6b' : '#5F7252';
  
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding: 8px 0;">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="17%" strokecolor="${bgColor}" fillcolor="${bgColor}">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:Georgia,serif;font-size:14px;font-weight:bold;">${text}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${url}" 
             class="button-link"
             style="display: inline-block; background-color: ${bgColor}; color: #FFFFFF !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 14px; font-weight: 600; font-family: Georgia, serif; mso-hide: all;">
            ${text}
          </a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>
  `;
}

/**
 * Send curator waitlist confirmation email
 * @param {string} email - Recipient email
 * @param {number} position - Position on the waitlist
 * @param {string} referralCode - User's referral code for sharing
 */
export async function sendCuratorWaitlistEmail(email, position = null, referralCode = null) {
  const positionText = position ? `#${position}` : '';
  const title = position 
    ? `✨ You're ${positionText} on the Curator Waitlist!`
    : "✨ You're on the Curator Waitlist!";
  
  const html = brandedTemplate({
    title,
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
          We'll reach out when curator accounts are ready. In the meantime, we'd love your input on what curator tools you'd find most useful!
        </p>
      </div>
      
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #5F7252; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
        Help Us Build the Right Tools
      </p>
      
      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #7A8F6C;">
        Tell us which features interest you most—your feedback shapes what we build.
      </p>
      
      ${referralCode ? `
      <div style="background-color: #F8F6EE; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 16px; color: #4A5940; font-weight: 600;">
          📚 Know someone who'd make a great curator?
        </p>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #7A8F6C;">
          Share your link and invite them to join the waitlist.
        </p>
        <p style="margin: 0 0 12px 0; font-size: 13px; color: #96A888; font-family: monospace; background: #fff; padding: 8px 12px; border-radius: 6px; display: inline-block;">
          ${SITE_URL}/?ref=${referralCode}
        </p>
      </div>
      ` : ''}
      
      ${primaryButton('Explore Sarah\'s Books →', SITE_URL)}
    `,
    footerText: "You're receiving this because you joined the curator waitlist."
  });

  return sendEmail({
    to: email,
    subject: position ? `You're #${position} on the Curator Waitlist! ✨` : "You're on the Curator Waitlist! ✨",
    html,
    fromName: "Sarah from Sarah's Books"
  });
}

/**
 * Send beta tester (Read with Friends) confirmation email
 * @param {string} email - Recipient email
 * @param {number} position - Position on the beta list
 * @param {string} referralCode - User's referral code for sharing
 */
export async function sendBetaTesterEmail(email, position = null, referralCode = null) {
  const positionText = position ? `#${position}` : '';
  const title = position 
    ? `You're ${positionText} on the Beta List!`
    : "You're In! Beta Access Coming Soon";
  
  const html = brandedTemplate({
    title,
    preheader: "Thanks for signing up for Read with Friends beta.",
    content: `
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #4A5940;">
        You're officially signed up for <strong>Read with Friends</strong> beta access!
      </p>
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #4A5940;">
        We're building a thoughtful way to share book recommendations with the people you care about—because the best recommendations come from people, not algorithms.
      </p>
      <div style="background-color: #F8F6EE; border-radius: 12px; padding: 20px; border-left: 4px solid #5F7252; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #4A5940; font-weight: 600;">Coming soon:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; color: #7A8F6C;">
          <li>Find friends on the platform</li>
          <li>Share recommendations directly</li>
          <li>See what friends are reading</li>
        </ul>
      </div>
      
      ${referralCode ? `
      <div style="background-color: #F8F6EE; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 16px; color: #4A5940; font-weight: 600;">
          📚 Reading with friends is more fun!
        </p>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #7A8F6C;">
          Know someone who'd love this? Share your link to invite them.
        </p>
        <p style="margin: 0 0 12px 0; font-size: 13px; color: #96A888; font-family: monospace; background: #fff; padding: 8px 12px; border-radius: 6px; display: inline-block;">
          ${SITE_URL}/?ref=${referralCode}
        </p>
      </div>
      ` : ''}
    `,
    footerText: "You're receiving this because you signed up for Read with Friends beta."
  });

  return sendEmail({
    to: email,
    subject: position ? `You're #${position} on the Beta List!` : "You're In! Read with Friends Beta",
    html,
    fromName: "Sarah from Sarah's Books"
  });
}

/**
 * Send invite friends email
 * @param {Object} options
 * @param {string} options.recipientEmail - Who's being invited
 * @param {string} options.inviterName - Name of person who sent the invite
 * @param {string} options.inviterEmail - For attribution
 * @param {string} [options.personalMessage] - Optional message from inviter
 * @param {string} options.signupUrl - URL with referral code
 */
export async function sendInviteFriendsEmail({ recipientEmail, inviterName, inviterEmail, personalMessage, signupUrl }) {
  const messageBlock = personalMessage ? `
    <div style="background-color: #F8F6EE; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #5F7252;">
      <p style="margin: 0; font-size: 15px; font-style: italic; color: #4A5940; line-height: 1.6;">
        "${personalMessage}"
      </p>
      <p style="margin: 12px 0 0 0; font-size: 14px; color: #7A8F6C;">
        — ${inviterName}
      </p>
    </div>
  ` : '';

  const html = brandedTemplate({
    title: "📚 You've Been Invited!",
    preheader: `${inviterName} thinks you'd love Sarah's Books`,
    content: `
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #4A5940;">
        <strong>${inviterName}</strong> thinks you'd love Sarah's Books—a place to discover your next great read.
      </p>
      
      ${messageBlock}
      
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #5F7252; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
        Our Mission
      </p>
      <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.7; color: #4A5940;">
        We believe the best book recommendations come from people, not algorithms. Sarah's Books is a platform where passionate readers curate and share the books they love.
      </p>
      
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #5F7252; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
        What You Can Do
      </p>
      
      ${featureCard('📖', 'Get Curated Recommendations', 'Discover books handpicked by readers who share your taste.')}
      ${featureCard('📚', 'Build Your Reading Queue', 'Save books you want to read and track what you\'ve loved.')}
      ${featureCard('✨', 'Become a Curator', 'Love recommending books? Join our waitlist to curate your own collection.')}
      
      <div style="margin-top: 24px;">
        ${primaryButton('Join Sarah\'s Books →', signupUrl || SITE_URL)}
      </div>
    `,
    footerText: `${inviterName} (${inviterEmail}) invited you to join Sarah's Books.`
  });

  return sendEmail({
    to: recipientEmail,
    subject: `${inviterName} thinks you'd love Sarah's Books 📚`,
    html,
    fromName: "Sarah's Books"
  });
}

/**
 * Send "What's New" product update email
 * @param {string} email - Recipient email
 * @param {Object} options
 * @param {string} [options.recipientName] - User's name
 * @param {Array} options.features - Array of { icon, title, description }
 * @param {string} options.ctaText - Primary button text
 * @param {string} options.ctaUrl - Primary button URL
 */
export async function sendWhatsNewEmail(email, { recipientName, features, ctaText, ctaUrl }) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi there,';
  
  const featureCards = features.map(f => featureCard(f.icon, f.title, f.description)).join('');
  
  const html = brandedTemplate({
    title: "📚 What's New at Sarah's Books",
    preheader: "New features to make your reading experience even better",
    content: `
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #4A5940;">
        ${greeting}
      </p>
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.7; color: #4A5940;">
        We've been busy building new features to make your reading experience even better. Here's what you can now do:
      </p>
      
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #5F7252; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
        New Features
      </p>
      
      ${featureCards}
      
      <div style="margin-top: 24px;">
        ${primaryButton(ctaText || 'Try It Now →', ctaUrl || SITE_URL)}
      </div>
      
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E8EBE4; text-align: center;">
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #7A8F6C;">
          Know someone who'd love Sarah's Books?
        </p>
        ${primaryButton('Invite Friends →', `${SITE_URL}/invite`)}
      </div>
    `,
    footerText: "You're receiving this because you opted in to product updates. <a href='" + SITE_URL + "/profile' style='color: #5F7252;'>Manage preferences</a>"
  });

  return sendEmail({
    to: email,
    subject: "What's New at Sarah's Books 📚",
    html,
    fromName: "Sarah from Sarah's Books"
  });
}

/**
 * Send product update email to opted-in users (legacy - use sendWhatsNewEmail for new format)
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
      <div style="margin-top: 24px;">
        ${primaryButton(ctaText, ctaUrl)}
      </div>
      ` : ''}
    `,
    footerText: "You're receiving this because you opted in to product updates. <a href='" + SITE_URL + "/profile' style='color: #5F7252;'>Manage preferences</a>"
  });

  return sendEmail({
    to: email,
    subject: title,
    html,
    fromName: "Sarah from Sarah's Books"
  });
}
