// Create og-image.png with book stack icon only
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.join(__dirname, 'public', 'og-image.png');

// Create SVG with just the book stack icon centered on cream background
const ogSvg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cover" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5F7252"/>
      <stop offset="1" stop-color="#4A5940"/>
    </linearGradient>
  </defs>
  
  <!-- Cream background -->
  <rect width="1200" height="630" fill="#FDFBF4"/>
  
  <!-- Book stack icon (scaled up much larger and centered) -->
  <g transform="translate(600, 315) scale(8)">
    <g transform="translate(-32, -32)">
      <!-- bottom book -->
      <rect x="10" y="36" width="44" height="16" rx="4" fill="url(#cover)"/>
      <rect x="14" y="39" width="6" height="10" rx="2" fill="#FDFBF4" opacity="0.95"/>
      <rect x="22" y="39" width="28" height="2" rx="1" fill="#FDFBF4" opacity="0.55"/>
      <rect x="22" y="43" width="24" height="2" rx="1" fill="#FDFBF4" opacity="0.45"/>

      <!-- middle book -->
      <rect x="12" y="24" width="42" height="14" rx="4" fill="#E8EBE4"/>
      <rect x="16" y="27" width="6" height="8" rx="2" fill="#5F7252" opacity="0.9"/>
      <rect x="24" y="27" width="26" height="2" rx="1" fill="#7A8F6C" opacity="0.75"/>
      <rect x="24" y="31" width="20" height="2" rx="1" fill="#7A8F6C" opacity="0.65"/>

      <!-- top book (slightly angled) -->
      <g transform="translate(32 18) rotate(-10) translate(-32 -18)">
        <rect x="14" y="10" width="38" height="12" rx="4" fill="#F5EFDC"/>
        <rect x="18" y="13" width="6" height="6" rx="2" fill="#4A5940" opacity="0.85"/>
        <rect x="26" y="13" width="22" height="2" rx="1" fill="#96A888" opacity="0.85"/>
        <rect x="26" y="17" width="16" height="2" rx="1" fill="#96A888" opacity="0.75"/>
      </g>
    </g>
  </g>
</svg>
`;

// Convert the SVG to PNG
sharp(Buffer.from(ogSvg))
  .png()
  .toFile(outputPath)
  .then(() => {
    console.log('✓ Successfully created og-image.png');
    console.log(`  Output: ${outputPath}`);
    console.log('  Dimensions: 1200 × 630 pixels');
    console.log('  Background: #FDFBF4 (cream)');
    console.log('  Features: Book stack icon only (no tagline)');
  })
  .catch(err => {
    console.error('Error creating OG image:', err);
    process.exit(1);
  });
