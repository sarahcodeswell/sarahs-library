# Social Media Thumbnail Specification

## Current State
- No Open Graph image (`og:image`) specified
- No Twitter image (`twitter:image`) specified
- Result: Blank thumbnail when sharing on social media

## Recommended Design

### Concept: "Mark/Logo Only - No Text"

**Visual Elements:**
1. **Background:** Soft gradient matching site colors (#FDFBF4 to #F5EFDC)
2. **Main Element:** Bold, recognizable mark/icon
   - Option: Stylized book with heart
   - Option: Monogram "SB" with book element
   - Option: Abstract bookshelf silhouette
3. **No text overlay** - mark must be recognizable on its own
4. **Accent:** Brand colors (#5F7252 green, #c96b6b dusty rose)

### Design Specifications

**Dimensions:**
- **Recommended:** 1200 × 630 pixels (Facebook/LinkedIn/Twitter optimal)
- **Minimum:** 600 × 314 pixels
- **Aspect Ratio:** 1.91:1

**File Format:**
- PNG or JPG
- Max file size: 8MB (recommended < 1MB for fast loading)

**Safe Zones:**
- Keep important text/elements within center 1200 × 600 pixels
- Avoid placing critical content near edges (may be cropped on some platforms)

### Mark Design Options

#### Option A: Book + Heart Mark
```
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│              ┌─────────┐                    │
│              │  ___    │                    │
│              │ |   |   │  ♥                 │
│              │ |___|   │                    │
│              └─────────┘                    │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```
- Stylized open book with heart floating above/beside
- Simple, iconic, memorable
- Uses brand colors: book in #5F7252, heart in #c96b6b
- Clean lines, minimal detail

#### Option B: "SB" Monogram with Book Element
```
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│                  ┌───┐                      │
│                  │ S │                      │
│                  │───│  ♥                   │
│                  │ B │                      │
│                  └───┘                      │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```
- Elegant serif monogram "SB" styled like a book spine
- Small heart accent
- Sophisticated, literary feel
- Crimson Pro font for letters

#### Option C: Abstract Bookshelf Mark
```
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│              ▐█ █ █ █▌                      │
│              ▐█ █ █ █▌  ♥                   │
│              ▐█ █ █ █▌                      │
│              ▐▔▔▔▔▔▔▔▌                      │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```
- Simplified bookshelf with books
- Geometric, modern
- Instantly recognizable as books
- Heart accent for warmth

### Color Palette
- **Primary Background:** #FDFBF4 (cream)
- **Secondary Background:** #F5EFDC (light tan)
- **Primary Text:** #4A5940 (dark green)
- **Brand Green:** #5F7252
- **Accent (heart):** #c96b6b (dusty rose)
- **Border/Details:** #D4DAD0 (sage)

### Mark Design Guidelines
- **Size:** Mark should be large and centered (400-600px at largest dimension)
- **Stroke Weight:** Bold enough to be visible at small sizes (8-12px minimum)
- **Simplicity:** No fine details that will be lost when scaled down
- **Contrast:** Strong contrast against gradient background
- **Padding:** Generous whitespace around mark (200px minimum from edges)

## Implementation Steps

### 1. Create the Image
**Tools:**
- **Figma/Canva:** Easy drag-and-drop design
- **Adobe Photoshop/Illustrator:** Professional design
- **Online generators:** OG Image generators with custom templates

**Recommended:** Canva (quick, professional results)

### 2. Save the File
- **Filename:** `og-image.png` or `social-preview.png`
- **Location:** `/public/` folder in the project
- **Optimize:** Use TinyPNG or similar to compress without quality loss

### 3. Update HTML Meta Tags
Add to `index.html`:
```html
<!-- Open Graph / Facebook -->
<meta property="og:image" content="https://www.sarahsbooks.com/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Sarah's Books - A curated library with AI-powered recommendations">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://www.sarahsbooks.com/og-image.png">
<meta name="twitter:image:alt" content="Sarah's Books - For the love of reading">
```

### 4. Test the Image
**Testing Tools:**
- Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
- Twitter Card Validator: https://cards-dev.twitter.com/validator
- LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/
- Open Graph Check: https://www.opengraph.xyz/

## Quick Start Option

If you want to get something up quickly, I can help you:

1. **Create a simple text-based design** using HTML/CSS that can be screenshot
2. **Generate the image programmatically** using a service like Vercel OG Image
3. **Use a template** from Canva with your brand colors and text

## My Recommendation for Mark-Only Design

**Go with Option A (Book + Heart Mark)** because:
- ✅ Instantly recognizable as book-related
- ✅ Heart adds warmth and personality
- ✅ Simple enough to work at any size
- ✅ Matches your "For the ❤️ of reading" tagline
- ✅ Easy to create in Canva or Figma

**Design Brief for Canva:**
1. Create 1200 × 630px canvas
2. Add gradient background (#FDFBF4 to #F5EFDC, diagonal or radial)
3. Add large, centered open book icon:
   - Search "open book line art" or "book outline icon"
   - Size: ~400-500px wide
   - Color: #5F7252 (brand green)
   - Stroke weight: 10-12px (bold enough to see when small)
4. Add heart icon:
   - Position: floating to upper right of book
   - Size: ~100-120px
   - Color: #c96b6b (dusty rose)
   - Style: filled or outlined to match book
5. Center the composition with generous padding
6. Export as PNG, optimize with TinyPNG

**Alternative:** If you want the monogram (Option B), use large serif "SB" letters styled like a book spine with the heart accent.

**Time estimate:** 20-30 minutes to create in Canva

**Next Steps:**
1. Create the mark image (I can help refine once you have a draft)
2. Save as `og-image.png` in `/public/` folder
3. I'll update the HTML meta tags to reference it
