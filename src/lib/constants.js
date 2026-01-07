// Shared constants for Sarah's Books
// Centralized to avoid duplication across components

import { BookHeart, Heart, Users, Sparkles, Scale, Sun } from 'lucide-react';

// Theme information for curator themes
export const themeInfo = {
  women: { icon: BookHeart, label: "Women's Untold Stories", color: 'bg-rose-50 text-rose-700 border-rose-200' },
  beach: { icon: Sun, label: "Beach Read", color: 'bg-sky-50 text-sky-700 border-sky-200' },
  emotional: { icon: Heart, label: "Emotional Truth", color: 'bg-amber-50 text-amber-700 border-amber-200' },
  identity: { icon: Users, label: "Identity & Belonging", color: 'bg-violet-50 text-violet-700 border-violet-200' },
  justice: { icon: Scale, label: "Invisible Injustices", color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  spiritual: { icon: Sparkles, label: "Spiritual Seeking", color: 'bg-teal-50 text-teal-700 border-teal-200' }
};

// Theme colors as hex values (for inline styles)
export const themeColors = {
  women: '#7D5A5A',
  beach: '#0EA5E9',
  emotional: '#9B6B6B',
  identity: '#5B7355',
  justice: '#5A6B7D',
  spiritual: '#8B7355'
};

// Theme descriptions for tooltips/UI
export const themeDescriptions = {
  women: 'Women-led lives, resilience, sisterhood.',
  beach: 'Lighthearted, entertaining, pure enjoyment.',
  emotional: 'Heartbreak, healing, and catharsis.',
  identity: 'Belonging, reinvention, selfhood.',
  justice: "Systems, power, and what's unseen.",
  spiritual: 'Meaning, faith, inner work.'
};

// Brand colors (for reference - use Tailwind classes when possible)
export const BRAND_COLORS = {
  primary: '#5F7252',      // Sage green - primary buttons, accents
  primaryDark: '#4A5940',  // Dark sage - hover states, headings
  secondary: '#7A8F6C',    // Light sage - secondary text
  accent: '#96A888',       // Muted sage - tertiary text
  background: '#FDFBF4',   // Warm cream - page background
  surface: '#F8F6EE',      // Light cream - card backgrounds
  border: '#D4DAD0',       // Sage border
  borderLight: '#E8EBE4',  // Light border
};

// Current year (for copyright, etc.)
export const CURRENT_YEAR = new Date().getFullYear();
