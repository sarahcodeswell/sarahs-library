# Sarah's Books — Brand Identity Guide

## Brand Essence
**Tagline:** "For the ❤️ of reading"  
**Voice:** Warm, personal, literary, approachable  
**Personality:** Like a trusted friend who knows your taste in books

---

## Typography System

### Primary Fonts
- **Body/UI:** Inter (sans-serif)
- **Headings/Titles:** Crimson Pro (serif)

### Font Weights
- **Inter:** 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- **Crimson Pro:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### Typography Scale

#### Desktop (sm: and above)
| Element | Font | Size | Weight | Line Height | Usage |
|---------|------|------|--------|-------------|-------|
| **H1 - Site Title** | Crimson Pro | 24px (1.5rem) | 400 | 1.2 | Main header "Sarah's Books" |
| **H2 - Hero Title** | Crimson Pro | 20px (1.25rem) | 400 | 1.4 | "Find Your Next Read" |
| **H3 - Section Headers** | Crimson Pro | 18px (1.125rem) | 500 | 1.3 | Book titles in recommendations |
| **Body Large** | Inter | 16px (1rem) | 300 | 1.6 | Hero subtitle, welcome message |
| **Body Regular** | Inter | 14px (0.875rem) | 400 | 1.5 | Chat messages, descriptions |
| **Body Small** | Inter | 13px (0.8125rem) | 400 | 1.4 | Book metadata, secondary text |
| **Caption** | Inter | 12px (0.75rem) | 400 | 1.4 | Tagline, labels, helper text |
| **Micro** | Inter | 11px (0.6875rem) | 500 | 1.3 | Uppercase labels (e.g., "CURATOR THEMES") |
| **Input Text** | Inter | 16px (1rem) | 300 | 1.5 | Ask bar input |
| **Placeholder** | Inter | 16px (1rem) | 300 | 1.5 | "What are you in the mood for?" |
| **Button Text** | Inter | 14px (0.875rem) | 500 | 1 | All buttons |

#### Mobile (base)
| Element | Font | Size | Weight | Line Height | Usage |
|---------|------|------|--------|-------------|-------|
| **H1 - Site Title** | Crimson Pro | 20px (1.25rem) | 400 | 1.2 | Main header |
| **H2 - Hero Title** | Crimson Pro | 16px (1rem) | 400 | 1.4 | Hero card |
| **H3 - Section Headers** | Crimson Pro | 16px (1rem) | 500 | 1.3 | Book titles |
| **Body Large** | Inter | 14px (0.875rem) | 300 | 1.6 | Hero subtitle |
| **Body Regular** | Inter | 14px (0.875rem) | 400 | 1.5 | Chat messages |
| **Body Small** | Inter | 12px (0.75rem) | 400 | 1.4 | Book metadata |
| **Caption** | Inter | 12px (0.75rem) | 400 | 1.4 | Footer text |
| **Micro** | Inter | 11px (0.6875rem) | 500 | 1.3 | Labels |
| **Input Text** | Inter | 14px (0.875rem) | 300 | 1.5 | Ask bar |
| **Placeholder** | Inter | 14px (0.875rem) | 300 | 1.5 | Input placeholder |
| **Button Text** | Inter | 12px (0.75rem) | 500 | 1 | Buttons |

---

## Color Palette

### Primary Colors
```
Sage Green (Primary Brand Color)
- sage-700: #4A5940 — Headings, primary text
- sage-600: #5F7252 — Buttons, interactive elements
- sage-500: #7A8F6C — Body text, secondary elements
- sage-400: #96A888 — Placeholder text, muted elements
- sage-300: #B5C0AC — Borders (hover states)
- sage-200: #D4DAD0 — Borders, dividers
- sage-100: #E8EBE4 — Subtle backgrounds, borders
- sage-50: #F6F7F4 — Light backgrounds
```

### Neutral Colors
```
Cream (Background)
- cream-100: #FDFBF4 — Primary background
- cream-200: #FAF6E9 — Subtle variation
- cream-300: #F5EFDC — Deeper cream

Ivory (Accents)
- ivory-100: #FEFEF5 — Card backgrounds
- ivory-200: #FDFCF0 — Hover states
```

### Semantic Colors
```
Success: sage-600 (#5F7252)
Error: #DC2626 (red-600)
Warning: #F59E0B (amber-500)
Info: sage-500 (#7A8F6C)
```

---

## Color Usage Guidelines

### Text Colors
- **Primary Headings:** `text-[#4A5940]` (sage-700)
- **Body Text:** `text-[#5F7252]` (sage-600)
- **Secondary Text:** `text-[#7A8F6C]` (sage-500)
- **Muted/Placeholder:** `text-[#96A888]` (sage-400)
- **White Text:** `text-white` (on dark backgrounds)

### Background Colors
- **Page Background:** `bg-[#FDFBF4]` (cream-100)
- **Card Background:** `bg-white` or `bg-[#F8F6EE]`
- **Input Background:** `bg-[#F8F6EE]`
- **Hover States:** `hover:bg-[#E8EBE4]` (sage-100)
- **Active/Selected:** `bg-[#E8EBE4]` (sage-100)

### Border Colors
- **Default:** `border-[#E8EBE4]` (sage-100)
- **Subtle:** `border-[#D4DAD0]` (sage-200)
- **Hover:** `hover:border-[#96A888]` (sage-400)
- **Active:** `border-[#96A888]` (sage-400)

### Button Colors
- **Primary Button:** `bg-[#5F7252] text-white hover:bg-[#4A5940]`
- **Secondary Button:** `bg-white border-[#E8EBE4] text-[#5F7252] hover:bg-[#F8F6EE]`
- **Ghost Button:** `text-[#5F7252] hover:text-[#4A5940]`

---

## Component Specifications

### Ask Bar
- **Container:** `bg-[#F8F6EE]` with `border-[#E8EBE4]`, `rounded-2xl`, padding `p-3 sm:p-4`
- **Input:** Inter 14px/16px, weight 300, `text-[#4A5940]`, `placeholder-[#96A888]`
- **Buttons:** 32px (mobile) / 36px (desktop) square
- **Alignment:** `items-center` for vertical centering

### Theme Emoji Buttons
- **Size:** 32px (mobile) / 36px (desktop) square
- **Border:** `border-[#E8EBE4]`
- **Background:** `bg-[#FDFBF4]`
- **Hover:** `hover:bg-[#E8EBE4] hover:border-[#96A888]`
- **Active:** `bg-[#E8EBE4] border-[#96A888] scale-110`

### Chat Messages
- **User Messages:** `bg-[#5F7252] text-white`, Inter 14px weight 400
- **Sarah Messages:** `bg-[#F8F6EE] text-[#4A5940]`, Inter 14px weight 400
- **Padding:** `px-5 py-3`
- **Border Radius:** `rounded-2xl` with tail `rounded-bl-sm` (Sarah) or `rounded-br-sm` (user)

### Cards
- **Background:** `bg-white` or `bg-[#F8F6EE]`
- **Border:** `border-[#E8EBE4]`
- **Border Radius:** `rounded-xl` or `rounded-2xl`
- **Shadow:** `shadow-sm` or `shadow-lg` for elevated cards

### Mode Toggle
- **Text:** Inter 12px weight 500
- **Active:** `text-[#4A5940]`
- **Inactive:** `text-[#96A888] hover:text-[#5F7252]`

### Filter Summary
- **Text:** Inter 12px weight 400, `text-[#7A8F6C]`
- **Clear Button:** Inter 12px weight 500, `text-[#96A888] hover:text-[#5F7252]`

---

## Spacing System

### Padding Scale
- **xs:** 8px (0.5rem)
- **sm:** 12px (0.75rem)
- **base:** 16px (1rem)
- **lg:** 24px (1.5rem)
- **xl:** 32px (2rem)
- **2xl:** 48px (3rem)

### Margin Scale
- **Component Spacing:** 12px-16px between related elements
- **Section Spacing:** 24px-32px between sections
- **Footer Spacing:** 64px (mobile) / 80px (desktop) before footer

### Border Radius
- **Small:** `rounded-lg` (8px) — buttons, small cards
- **Medium:** `rounded-xl` (12px) — cards, inputs
- **Large:** `rounded-2xl` (16px) — hero card, ask bar
- **Full:** `rounded-full` — emoji buttons, avatars

---

## Accessibility Guidelines

### Contrast Ratios
- **Body Text:** Minimum 4.5:1 (WCAG AA)
- **Large Text:** Minimum 3:1 (WCAG AA)
- **Interactive Elements:** Minimum 3:1 for borders/icons

### Focus States
- All interactive elements must have visible focus states
- Use `focus:outline-none focus:ring-2 focus:ring-[#96A888]` for keyboard navigation

### Touch Targets
- Minimum 44x44px for mobile touch targets
- Buttons: 32px minimum (mobile), 36px+ (desktop)

---

## Animation & Transitions

### Standard Transitions
- **Duration:** 150-200ms
- **Easing:** `transition-colors`, `transition-all`
- **Hover States:** Subtle color shifts, no dramatic movements

### Interactive Feedback
- **Scale:** `scale-110` for active theme buttons
- **Opacity:** `opacity-50` for disabled states
- **Bounce:** Loading indicators only

---

## Voice & Tone Guidelines

### Writing Style
- **Conversational:** "What are you in the mood for?"
- **Personal:** "Hi, I'm Sarah..."
- **Warm:** "For the ❤️ of reading"
- **Literary:** Reference books, reading, discovery

### Placeholder Text
- Keep it conversational and inviting
- Use questions to engage: "What are you in the mood for?"
- Avoid technical jargon

### Error Messages
- Be helpful, not alarming
- Suggest solutions: "Could not read that file. Please try exporting your Goodreads library again."

---

## Implementation Notes

### Tailwind Classes to Use
```css
/* Typography */
.text-xs → 12px (0.75rem)
.text-sm → 14px (0.875rem)
.text-base → 16px (1rem)
.text-lg → 18px (1.125rem)
.text-xl → 20px (1.25rem)
.text-2xl → 24px (1.5rem)

/* Font Weights */
.font-light → 300
.font-normal → 400
.font-medium → 500
.font-semibold → 600
.font-bold → 700

/* Responsive Breakpoint */
sm: 640px and above
```

### Font Loading
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Crimson+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## Brand Applications

### Header
- Site title: Crimson Pro 20px/24px (mobile/desktop)
- Tagline: Inter 12px, uppercase, tracking-wide
- Avatar: 40px/48px rounded-full with sage-200 border

### Hero Card
- Title: Crimson Pro 16px/20px
- Subtitle: Inter 12px/14px, weight 300
- Image height: 120px-220px (clamp)

### Footer
- Text: Inter 12px, weight 300
- Color: `text-[#7A8F6C]`
- Spacing: 64px/80px margin-top

---

*Last Updated: December 19, 2024*  
*Version: 1.0*
