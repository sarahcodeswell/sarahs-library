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
 * Includes logo in header
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
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #5F7252 0%, #4A5940 100%); padding: 24px 32px; text-align: center;">
              <img src="${LOGO_URL}" alt="Sarah's Books" width="120" style="display: block; margin: 0 auto 16px auto; max-width: 120px; height: auto;" />
              <h1 style="margin: 0; color: #FFFFFF; font-size: 22px; font-weight: normal; letter-spacing: 0.5px;">
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
                <a href="${SITE_URL}" style="color: #5F7252; text-decoration: none;">Sarah's Books</a> • For the ♥ of reading
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
 * Primary button component
 */
function primaryButton(text, url, color = 'green') {
  const gradient = color === 'rose' 
    ? 'linear-gradient(135deg, #c96b6b 0%, #b55a5a 100%)'
    : 'linear-gradient(135deg, #5F7252 0%, #4A5940 100%)';
  
  return `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="${url}" 
             style="display: inline-block; background: ${gradient}; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Send curator waitlist confirmation email
 * @param {string} email - Recipient email
 * @param {number} position - Position on the waitlist
 */
export async function sendCuratorWaitlistEmail(email, position = null) {
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
      
      ${primaryButton('Share Your Feedback →', `${SITE_URL}/curator-feedback`)}
      
      <div style="text-align: center; margin: 20px 0;">
        <span style="color: #96A888; font-size: 13px;">— or —</span>
      </div>
      
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
 */
export async function sendBetaTesterEmail(email, position = null) {
  const positionText = position ? `#${position}` : '';
  const title = position 
    ? `💜 You're ${positionText} on the Beta List!`
    : "💜 You're In! Beta Access Coming Soon";
  
  const html = brandedTemplate({
    title,
    preheader: "Thanks for signing up for Read with Friends beta.",
    content: `
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #4A5940;">
        You're officially signed up for <strong>Read with Friends</strong> beta access!
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
      
      <div style="background-color: #FDF8F8; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 16px; color: #4A5940; font-weight: 600;">
          📚 Reading with friends is more fun!
        </p>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #7A8F6C;">
          Know someone who'd love this? Invite them to join the beta waitlist.
        </p>
        ${primaryButton('Invite Friends →', `${SITE_URL}/invite`, 'rose')}
      </div>
    `,
    footerText: "You're receiving this because you signed up for Read with Friends beta."
  });

  return sendEmail({
    to: email,
    subject: position ? `You're #${position} on the Beta List! 💜` : "You're In! Read with Friends Beta 💜",
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
