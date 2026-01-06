# Daily Digest Email Setup

The admin dashboard includes a daily digest email feature that sends you a summary of platform activity each morning, with alerts for activity spikes.

## What's Included

- **Last 24 Hours Stats**: New users, books queued, books read, recommendations, referrals, curator signups
- **All Time Totals**: Running totals for key metrics
- **Spike Detection**: Alerts when activity is 2x+ your daily average
- **New User List**: Names of users who signed up in the last 24 hours
- **Link to Dashboard**: Quick access to the full admin dashboard

## Cron Schedule

The digest runs daily at **8:00 AM UTC** (configured in `vercel.json`).

To change the schedule, edit the cron expression:
```json
{
  "crons": [
    {
      "path": "/api/admin/digest",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Common schedules:
- `0 8 * * *` - 8:00 AM UTC daily
- `0 14 * * *` - 2:00 PM UTC daily (6:00 AM PST)
- `0 16 * * *` - 4:00 PM UTC daily (8:00 AM PST)

## Required Environment Variables

Add these to your Vercel project settings:

### For Email Sending (AWS SES)

```
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
```

### For Cron Authentication

```
CRON_SECRET=your_random_secret_string
```

Generate a random secret:
```bash
openssl rand -hex 32
```

## AWS SES Setup

1. **Verify your domain** in AWS SES (sarahsbooks.com)
2. **Verify the sender email** (hello@sarahsbooks.com)
3. **Create IAM credentials** with SES send permissions
4. **Move out of sandbox** (if needed) to send to unverified emails

### IAM Policy for SES

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

## Alternative: Use Supabase SMTP

If you prefer to use Supabase's SMTP (which you've already configured), you can modify the digest endpoint to use Supabase's email functions instead of AWS SES.

## Manual Trigger

Click the **mail icon** in the admin dashboard header to send a test digest immediately.

## Troubleshooting

- **Email not received**: Check AWS SES sending limits and sandbox status
- **Cron not running**: Verify `CRON_SECRET` is set in Vercel environment variables
- **Unauthorized error**: Ensure you're logged in as the admin account

## Spike Detection Thresholds

Currently configured to alert when:
- New users today ≥ 2x daily average AND > 2 users
- Books queued today ≥ 2x daily average AND > 5 books

Adjust these in `/api/admin/digest.js` if needed.
