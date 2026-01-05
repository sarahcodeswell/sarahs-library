# Supabase Email Templates for Sarah's Books

Go to **Supabase Dashboard** → **Authentication** → **Email Templates** and paste these templates.

---

## 1. Confirm Signup

**Subject:**
```
Welcome to Sarah's Books! Please confirm your email
```

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #FDFBF4; font-family: Georgia, 'Times New Roman', serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDFBF4; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; border: 1px solid #E8EBE4; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #5F7252; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: normal; font-family: Georgia, 'Times New Roman', serif;">
                Sarah's Books
              </h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #4A5940; font-size: 22px; font-weight: normal; font-family: Georgia, 'Times New Roman', serif;">
                Welcome to Sarah's Books!
              </h2>
              <p style="margin: 0 0 24px 0; color: #5F7252; font-size: 16px; line-height: 1.6;">
                Thank you for joining our community of book lovers. Please confirm your email address to get started with personalized recommendations.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #5F7252; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">
                      Confirm Email Address
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 32px 0 0 0; color: #96A888; font-size: 14px; line-height: 1.6;">
                If you didn't create an account with Sarah's Books, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #E8EBE4; text-align: center;">
              <p style="margin: 0; color: #96A888; font-size: 12px;">
                © Sarah's Books · <a href="https://www.sarahsbooks.com" style="color: #5F7252; text-decoration: none;">sarahsbooks.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Reset Password

**Subject:**
```
Reset your Sarah's Books password
```

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #FDFBF4; font-family: Georgia, 'Times New Roman', serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDFBF4; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; border: 1px solid #E8EBE4; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #5F7252; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: normal; font-family: Georgia, 'Times New Roman', serif;">
                Sarah's Books
              </h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #4A5940; font-size: 22px; font-weight: normal; font-family: Georgia, 'Times New Roman', serif;">
                Reset Your Password
              </h2>
              <p style="margin: 0 0 24px 0; color: #5F7252; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password. Click the button below to choose a new password.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #5F7252; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 32px 0 0 0; color: #96A888; font-size: 14px; line-height: 1.6;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
              <p style="margin: 16px 0 0 0; color: #96A888; font-size: 14px; line-height: 1.6;">
                This link will expire in 24 hours.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #E8EBE4; text-align: center;">
              <p style="margin: 0; color: #96A888; font-size: 12px;">
                © Sarah's Books · <a href="https://www.sarahsbooks.com" style="color: #5F7252; text-decoration: none;">sarahsbooks.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Magic Link (if you use passwordless login)

**Subject:**
```
Your Sarah's Books sign-in link
```

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #FDFBF4; font-family: Georgia, 'Times New Roman', serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDFBF4; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; border: 1px solid #E8EBE4; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #5F7252; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: normal; font-family: Georgia, 'Times New Roman', serif;">
                Sarah's Books
              </h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #4A5940; font-size: 22px; font-weight: normal; font-family: Georgia, 'Times New Roman', serif;">
                Sign In to Sarah's Books
              </h2>
              <p style="margin: 0 0 24px 0; color: #5F7252; font-size: 16px; line-height: 1.6;">
                Click the button below to sign in to your account. This link will expire in 1 hour.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #5F7252; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">
                      Sign In
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 32px 0 0 0; color: #96A888; font-size: 14px; line-height: 1.6;">
                If you didn't request this link, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #E8EBE4; text-align: center;">
              <p style="margin: 0; color: #96A888; font-size: 12px;">
                © Sarah's Books · <a href="https://www.sarahsbooks.com" style="color: #5F7252; text-decoration: none;">sarahsbooks.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 4. Change Email Address

**Subject:**
```
Confirm your new email for Sarah's Books
```

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #FDFBF4; font-family: Georgia, 'Times New Roman', serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDFBF4; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; border: 1px solid #E8EBE4; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #5F7252; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: normal; font-family: Georgia, 'Times New Roman', serif;">
                Sarah's Books
              </h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #4A5940; font-size: 22px; font-weight: normal; font-family: Georgia, 'Times New Roman', serif;">
                Confirm Your New Email
              </h2>
              <p style="margin: 0 0 24px 0; color: #5F7252; font-size: 16px; line-height: 1.6;">
                Please confirm your new email address by clicking the button below.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #5F7252; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">
                      Confirm New Email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 32px 0 0 0; color: #96A888; font-size: 14px; line-height: 1.6;">
                If you didn't request this change, please contact us immediately.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #E8EBE4; text-align: center;">
              <p style="margin: 0; color: #96A888; font-size: 12px;">
                © Sarah's Books · <a href="https://www.sarahsbooks.com" style="color: #5F7252; text-decoration: none;">sarahsbooks.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## To Fully Whitelabel the "From" Address

To change the sender from "Supabase Auth" to something like "Sarah's Books <hello@sarahsbooks.com>":

1. Go to **Project Settings** → **Auth** → **SMTP Settings**
2. Enable custom SMTP
3. Add your SMTP provider credentials (SendGrid, Postmark, Mailgun, etc.)
4. Set your custom sender name and email

Popular options:
- **SendGrid** - Free tier: 100 emails/day
- **Postmark** - Great deliverability, $15/mo for 10k emails
- **Mailgun** - Free tier: 5k emails/mo for 3 months
