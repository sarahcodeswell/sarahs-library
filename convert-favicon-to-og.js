// Convert favicon.svg to og-image.png for social media
// This uses sharp library for image conversion

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.join(__dirname, 'public', 'favicon.svg');
const outputPath = path.join(__dirname, 'public', 'og-image.png');

// Read the SVG file
const svgBuffer = fs.readFileSync(svgPath);

// Convert SVG to PNG with proper dimensions for Open Graph
sharp(svgBuffer)
  .resize(1200, 630, {
    fit: 'contain',
    background: { r: 253, g: 251, b: 244, alpha: 1 } // #FDFBF4 cream background
  })
  .png()
  .toFile(outputPath)
  .then(() => {
    console.log('✓ Successfully converted favicon.svg to og-image.png');
    console.log(`  Output: ${outputPath}`);
    console.log('  Dimensions: 1200 × 630 pixels');
    console.log('  Background: #FDFBF4 (cream)');
  })
  .catch(err => {
    console.error('Error converting SVG to PNG:', err);
    process.exit(1);
  });
