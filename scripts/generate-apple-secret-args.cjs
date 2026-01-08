/**
 * Generate Apple OAuth Client Secret for Supabase (non-interactive)
 * 
 * Usage:
 * node scripts/generate-apple-secret-args.cjs <teamId> <keyId> <clientId> <p8FilePath>
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');

const [,, teamId, keyId, clientId, p8Path] = process.argv;

if (!teamId || !keyId || !clientId || !p8Path) {
  console.log('Usage: node scripts/generate-apple-secret-args.cjs <teamId> <keyId> <clientId> <p8FilePath>');
  console.log('Example: node scripts/generate-apple-secret-args.cjs ABC1234567 XYZ9876543 com.example.auth ~/Downloads/AuthKey.p8');
  process.exit(1);
}

// Read the private key
let privateKey;
try {
  const resolvedPath = p8Path.replace('~', process.env.HOME);
  privateKey = fs.readFileSync(resolvedPath, 'utf8');
} catch (err) {
  console.error('❌ Could not read .p8 file:', err.message);
  process.exit(1);
}

// Generate the JWT
const now = Math.floor(Date.now() / 1000);
const expiry = now + (86400 * 180); // 180 days

const token = jwt.sign(
  {
    iss: teamId,
    iat: now,
    exp: expiry,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  },
  privateKey,
  {
    algorithm: 'ES256',
    keyid: keyId,
  }
);

console.log('\n✅ Generated Apple Client Secret:\n');
console.log(token);
console.log('\n📋 Paste this into Supabase: Authentication → Providers → Apple → Secret Key');
console.log('⚠️  Expires in 180 days - set a reminder!\n');
