# OAuth Setup Guide (Google & Apple Sign-In)

## ✅ What's Already Done

- ✅ Google and Apple Sign-In buttons added to AuthModal
- ✅ OAuth handler implemented in Supabase client
- ✅ UI with proper branding and divider
- ✅ Code deployed to production

## 🔧 What You Need to Configure

### **Step 1: Set Up Google OAuth**

#### A. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable **Google+ API**:
   - Go to **APIs & Services** > **Library**
   - Search for "Google+ API"
   - Click **Enable**

4. Create OAuth 2.0 Credentials:
   - Go to **APIs & Services** > **Credentials**
   - Click **+ CREATE CREDENTIALS** > **OAuth client ID**
   - Application type: **Web application**
   - Name: "Sarah's Books"
   
5. Add Authorized Redirect URIs:
   ```
   https://niwbaydmofavkkxeppkq.supabase.co/auth/v1/callback
   ```
   
6. Click **Create**
7. **Copy** the Client ID and Client Secret

#### B. Configure in Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** > **Providers**
4. Find **Google** and toggle it **ON**
5. Paste your:
   - **Client ID** (from Google)
   - **Client Secret** (from Google)
6. Click **Save**

---

### **Step 2: Set Up Apple Sign-In**

#### A. Create Apple Developer Account Setup

1. Go to [Apple Developer](https://developer.apple.com)
2. Sign in with your Apple ID
3. Go to **Certificates, Identifiers & Profiles**

#### B. Create Services ID

1. Click **Identifiers** > **+** (Add new)
2. Select **Services IDs** > Continue
3. Fill in:
   - **Description**: Sarah's Books
   - **Identifier**: com.sarahsbooks.auth (or your domain)
4. Check **Sign In with Apple**
5. Click **Configure**
6. Add your domain and return URLs:
   - **Domains**: `niwbaydmofavkkxeppkq.supabase.co`
   - **Return URLs**: `https://niwbaydmofavkkxeppkq.supabase.co/auth/v1/callback`
7. Click **Save** > **Continue** > **Register**

#### C. Create Private Key

1. Go to **Keys** > **+** (Add new)
2. Fill in:
   - **Key Name**: Sarah's Books Auth Key
3. Check **Sign In with Apple**
4. Click **Configure** > Select your Services ID
5. Click **Save** > **Continue** > **Register**
6. **Download** the `.p8` key file (you can only download once!)
7. Note the **Key ID** shown

#### D. Configure in Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** > **Providers**
4. Find **Apple** and toggle it **ON**
5. Fill in:
   - **Services ID**: (from Step B)
   - **Team ID**: (found in Apple Developer Account > Membership)
   - **Key ID**: (from Step C)
   - **Private Key**: (contents of the `.p8` file)
6. Click **Save**

---

## 🧪 Testing

### Test Google Sign-In:
1. Go to your app
2. Click **Sign In**
3. Click **Continue with Google**
4. Select your Google account
5. You should be redirected back and signed in!

### Test Apple Sign-In:
1. Go to your app
2. Click **Sign In**
3. Click **Continue with Apple**
4. Sign in with your Apple ID
5. You should be redirected back and signed in!

---

## 🚨 Troubleshooting

### Google OAuth Issues:
- **Error: redirect_uri_mismatch**
  - Make sure the redirect URI in Google Console exactly matches: `https://niwbaydmofavkkxeppkq.supabase.co/auth/v1/callback`
  
- **Error: access_denied**
  - Check that Google+ API is enabled
  - Verify Client ID and Secret are correct in Supabase

### Apple Sign-In Issues:
- **Error: invalid_client**
  - Verify Services ID matches exactly
  - Check Team ID is correct
  - Ensure Private Key is pasted correctly (entire contents of .p8 file)

- **Error: redirect_uri_mismatch**
  - Verify return URL in Apple Developer Console matches Supabase callback URL
  - Check domain is added to Apple Services ID configuration

---

## 📝 Production Checklist

- [ ] Google OAuth credentials created
- [ ] Google provider enabled in Supabase
- [ ] Google sign-in tested successfully
- [ ] Apple Services ID created
- [ ] Apple private key generated and saved
- [ ] Apple provider enabled in Supabase
- [ ] Apple sign-in tested successfully
- [ ] Both OAuth flows work on production domain

---

## 🎉 Benefits

Once configured, users can:
- ✅ Sign in with one click (no password needed)
- ✅ Use their existing Google/Apple accounts
- ✅ Faster signup process
- ✅ More secure (OAuth 2.0 standard)
- ✅ Automatic email verification

---

## 📚 Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Apple Sign-In Setup](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Google Cloud Console](https://console.cloud.google.com)
- [Apple Developer](https://developer.apple.com)
