/**
 * Generate Apple OAuth Client Secret for Supabase
 * 
 * Usage:
 * 1. Place your .p8 file in a secure location
 * 2. Run: node scripts/generate-apple-secret.js
 * 3. Copy the output and paste into Supabase Apple provider "Secret Key" field
 * 
 * You'll need to regenerate this every 6 months (Apple requirement)
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function generateSecret() {
  console.log('\n🍎 Apple OAuth Secret Generator for Supabase\n');
  console.log('You\'ll need:\n- Team ID (from Apple Developer account, top right)\n- Key ID (from when you created the key)\n- Services ID (your Client ID)\n- Path to your .p8 file\n');

  const teamId = await question('Team ID (10 characters): ');
  const keyId = await question('Key ID (10 characters): ');
  const clientId = await question('Services ID / Client ID: ');
  const p8Path = await question('Path to .p8 file: ');

  rl.close();

  // Validate inputs
  if (!teamId || teamId.length !== 10) {
    console.error('❌ Team ID should be 10 characters');
    process.exit(1);
  }
  if (!keyId || keyId.length !== 10) {
    console.error('❌ Key ID should be 10 characters');
    process.exit(1);
  }
  if (!clientId) {
    console.error('❌ Services ID is required');
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
  const expiry = now + (86400 * 180); // 180 days (max allowed)

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
  console.log('─'.repeat(60));
  console.log(token);
  console.log('─'.repeat(60));
  console.log('\n📋 Copy the token above and paste it into Supabase:');
  console.log('   Authentication → Providers → Apple → Secret Key\n');
  console.log('⚠️  This secret expires in 180 days. Set a reminder to regenerate it!\n');
}

generateSecret().catch(console.error);
