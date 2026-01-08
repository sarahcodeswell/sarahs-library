import { json, getSupabaseClient, verifyAdmin, getDateRange, MASTER_ADMIN_EMAIL } from './_shared.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Allow GET for cron jobs or POST for manual trigger
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const { client: supabase, error: configError } = getSupabaseClient();
    if (configError) {
      return json({ error: configError }, 500);
    }

    // For manual triggers, verify admin access; for cron, check secret
    const authHeader = req.headers.get('authorization');
    const cronSecret = req.headers.get('x-cron-secret');
    const isCron = cronSecret === process.env.CRON_SECRET;
    
    if (!isCron) {
      const authResult = await verifyAdmin(supabase, authHeader);
      if (authResult.error) {
        return json({ error: authResult.error }, authResult.status);
      }
    }

    const yesterday = getDateRange('1d');
    const weekAgo = getDateRange('7d');

    // Fetch all stats
    const [usersResult, profilesResult, queueResult, userBooksResult, recommendationsResult, referralsResult, waitlistResult] = await Promise.all([
      supabase.auth.admin.listUsers({ perPage: 1000 }),
      supabase.from('taste_profiles').select('*'),
      supabase.from('reading_queue').select('*'),
      supabase.from('user_books').select('*'),
      supabase.from('recommendations').select('*'),
      supabase.from('referrals').select('*'),
      supabase.from('curator_waitlist').select('*')
    ]);

    const users = usersResult.data?.users || [];
    const profiles = profilesResult.data || [];
    const queue = queueResult.data || [];
    const userBooks = userBooksResult.data || [];
    const recommendations = recommendationsResult.data || [];
    const referrals = referralsResult.data || [];
    const waitlist = waitlistResult.data || [];

    // Filter for last 24 hours
    const filterByDate = (items, dateField = 'created_at', since = yesterday) => {
      return items.filter(item => new Date(item[dateField]) >= new Date(since));
    };

    const newUsers24h = filterByDate(users);
    const newQueue24h = filterByDate(queue);
    const newReads24h = filterByDate(userBooks.filter(b => b.status === 'read'), 'updated_at');
    const newRecs24h = filterByDate(recommendations);
    const newReferrals24h = filterByDate(referrals);
    const newWaitlist24h = filterByDate(waitlist);

    // 7-day stats for comparison
    const newUsers7d = filterByDate(users, 'created_at', weekAgo);
    const newQueue7d = filterByDate(queue, 'created_at', weekAgo);

    // Calculate averages
    const avgNewUsersPerDay = (newUsers7d.length / 7).toFixed(1);
    const avgQueuePerDay = (newQueue7d.length / 7).toFixed(1);

    // Detect spikes (2x average or more)
    const userSpike = newUsers24h.length >= avgNewUsersPerDay * 2 && newUsers24h.length > 2;
    const queueSpike = newQueue24h.length >= avgQueuePerDay * 2 && newQueue24h.length > 5;
    const hasSpike = userSpike || queueSpike;

    // Build email content
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #FDFBF4; font-family: 'Poppins', Georgia, 'Times New Roman', serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDFBF4; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; border: 1px solid #E8EBE4; overflow: hidden;">
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #5F7252 0%, #4A5940 100%); padding: 24px 32px; text-align: center;">
              <img src="https://www.sarahsbooks.com/linkedin-logo.png" alt="Sarah's Books" width="120" style="display: block; margin: 0 auto 16px auto; max-width: 120px; height: auto;" />
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: normal;">
                Daily Digest
              </h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 8px 0; color: #96A888; font-size: 14px;">${today}</p>
              
              ${hasSpike ? `
              <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #92400E; font-size: 14px; font-weight: 500;">
                  ⚡ Activity Spike Detected
                </p>
                <p style="margin: 4px 0 0 0; color: #92400E; font-size: 13px;">
                  ${userSpike ? `New users today (${newUsers24h.length}) is ${(newUsers24h.length / avgNewUsersPerDay).toFixed(1)}x your daily average. ` : ''}
                  ${queueSpike ? `Books queued today (${newQueue24h.length}) is ${(newQueue24h.length / avgQueuePerDay).toFixed(1)}x your daily average.` : ''}
                </p>
              </div>
              ` : ''}
              
              <h2 style="margin: 0 0 16px 0; color: #4A5940; font-size: 18px; font-weight: normal; border-bottom: 1px solid #E8EBE4; padding-bottom: 8px;">
                Last 24 Hours
              </h2>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8EBE4;">
                    <span style="color: #5F7252; font-size: 14px;">New Users</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8EBE4; text-align: right;">
                    <span style="color: #4A5940; font-size: 16px; font-weight: 500;">${newUsers24h.length}</span>
                    <span style="color: #96A888; font-size: 12px;"> (avg ${avgNewUsersPerDay}/day)</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8EBE4;">
                    <span style="color: #5F7252; font-size: 14px;">Books Queued</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8EBE4; text-align: right;">
                    <span style="color: #4A5940; font-size: 16px; font-weight: 500;">${newQueue24h.length}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8EBE4;">
                    <span style="color: #5F7252; font-size: 14px;">Books Read</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8EBE4; text-align: right;">
                    <span style="color: #4A5940; font-size: 16px; font-weight: 500;">${newReads24h.length}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8EBE4;">
                    <span style="color: #5F7252; font-size: 14px;">Recommendations</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8EBE4; text-align: right;">
                    <span style="color: #4A5940; font-size: 16px; font-weight: 500;">${newRecs24h.length}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8EBE4;">
                    <span style="color: #5F7252; font-size: 14px;">Referrals</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8EBE4; text-align: right;">
                    <span style="color: #4A5940; font-size: 16px; font-weight: 500;">${newReferrals24h.length}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #5F7252; font-size: 14px;">Curator Signups</span>
                  </td>
                  <td style="padding: 8px 0; text-align: right;">
                    <span style="color: #4A5940; font-size: 16px; font-weight: 500;">${newWaitlist24h.length}</span>
                  </td>
                </tr>
              </table>
              
              <h2 style="margin: 0 0 16px 0; color: #4A5940; font-size: 18px; font-weight: normal; border-bottom: 1px solid #E8EBE4; padding-bottom: 8px;">
                All Time Totals
              </h2>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 6px 0;"><span style="color: #7A8F6C; font-size: 14px;">Total Users</span></td>
                  <td style="padding: 6px 0; text-align: right;"><span style="color: #4A5940; font-size: 14px;">${users.length}</span></td>
                </tr>
                <tr>
                  <td style="padding: 6px 0;"><span style="color: #7A8F6C; font-size: 14px;">Books in Queues</span></td>
                  <td style="padding: 6px 0; text-align: right;"><span style="color: #4A5940; font-size: 14px;">${queue.length}</span></td>
                </tr>
                <tr>
                  <td style="padding: 6px 0;"><span style="color: #7A8F6C; font-size: 14px;">Books Read</span></td>
                  <td style="padding: 6px 0; text-align: right;"><span style="color: #4A5940; font-size: 14px;">${userBooks.filter(b => b.status === 'read').length}</span></td>
                </tr>
                <tr>
                  <td style="padding: 6px 0;"><span style="color: #7A8F6C; font-size: 14px;">Curator Waitlist</span></td>
                  <td style="padding: 6px 0; text-align: right;"><span style="color: #4A5940; font-size: 14px;">${waitlist.length}</span></td>
                </tr>
              </table>
              
              ${newUsers24h.length > 0 ? `
              <h2 style="margin: 0 0 12px 0; color: #4A5940; font-size: 16px; font-weight: normal;">
                New Users Today
              </h2>
              <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #5F7252; font-size: 13px;">
                ${newUsers24h.slice(0, 10).map(u => `<li style="margin-bottom: 4px;">${u.email}</li>`).join('')}
                ${newUsers24h.length > 10 ? `<li style="color: #96A888;">...and ${newUsers24h.length - 10} more</li>` : ''}
              </ul>
              ` : ''}
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://www.sarahsbooks.com/admin" style="display: inline-block; background-color: #5F7252; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px;">
                      View Full Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F8F6EE; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; color: #96A888; font-size: 12px;">
                Sarah's Books • Daily Admin Digest
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Build subject line
    const subject = hasSpike 
      ? `⚡ Sarah's Books: Activity Spike Detected - ${newUsers24h.length} new users`
      : `Sarah's Books Daily Digest - ${newUsers24h.length} new users, ${newQueue24h.length} books queued`;

    // Send email using Resend (simple email API)
    // If RESEND_API_KEY is not set, return digest data for manual viewing
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (resendApiKey) {
      try {
        // Use onboarding@resend.dev if domain not verified, otherwise use your domain
        // Once sarahsbooks.com is verified in Resend, change this to hello@sarahsbooks.com
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `Sarah's Books <${fromEmail}>`,
            to: [MASTER_ADMIN_EMAIL],
            subject,
            html: emailHtml
          })
        });

        const responseData = await emailResponse.json();
        
        if (!emailResponse.ok) {
          console.error('Email send error:', responseData);
          return json({ 
            success: false, 
            message: 'Failed to send email',
            error: responseData,
            hint: 'If you see "domain not verified", add RESEND_FROM_EMAIL=onboarding@resend.dev to test, or verify sarahsbooks.com in Resend dashboard',
            stats: {
              newUsers24h: newUsers24h.length,
              newQueue24h: newQueue24h.length,
              hasSpike
            }
          }, 500);
        }
        
        console.log('Email sent successfully:', responseData);
      } catch (emailErr) {
        console.error('Email fetch error:', emailErr);
        return json({ 
          success: false, 
          message: 'Email service error',
          error: emailErr.message,
          stats: {
            newUsers24h: newUsers24h.length,
            newQueue24h: newQueue24h.length,
            hasSpike
          }
        }, 500);
      }
    } else {
      // No email service configured - return digest data
      return json({ 
        success: true, 
        message: 'Digest generated (set RESEND_API_KEY to enable email)',
        subject,
        stats: {
          newUsers24h: newUsers24h.length,
          newQueue24h: newQueue24h.length,
          newReads24h: newReads24h.length,
          newRecs24h: newRecs24h.length,
          hasSpike,
          totals: {
            users: users.length,
            queue: queue.length,
            waitlist: waitlist.length
          }
        }
      });
    }

    return json({ 
      success: true, 
      message: 'Digest sent',
      stats: {
        newUsers24h: newUsers24h.length,
        newQueue24h: newQueue24h.length,
        hasSpike
      }
    });

  } catch (error) {
    console.error('Digest error:', error);
    return json({ error: 'Failed to send digest', details: error.message }, 500);
  }
}
