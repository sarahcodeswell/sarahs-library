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

// Theme descriptions for tooltips/UI (short form)
export const themeDescriptions = {
  women: 'Women-led lives, resilience, sisterhood.',
  beach: 'Lighthearted, entertaining, pure enjoyment.',
  emotional: 'The depths of human experience—grief, joy, love, loss.',
  identity: 'Belonging, reinvention, selfhood.',
  justice: "Systems, power, and what's unseen.",
  spiritual: 'Meaning, faith, inner work.'
};

// Rich theme context for recommendation algorithm
// These detailed descriptions help Claude understand what makes a book fit each theme
export const themeRecommendationContext = {
  women: `This collection focuses on stories centered on women's experiences that have been historically marginalized, silenced, or overlooked. The books span historical fiction featuring real women erased from history (female aviators, scientists, war correspondents), contemporary fiction exploring difficult realities (domestic violence, systemic oppression, cultural displacement), and memoirs of survival and resilience. Common themes include women defying societal expectations, surviving trauma, forming powerful bonds with other women, and finding agency in restrictive circumstances. The emotional tone ranges from heartbreaking to triumphant, but always emphasizes women's strength and complexity. Many feature intergenerational stories, cross-cultural perspectives, and exploration of how women's stories get lost or distorted over time.`,
  
  beach: `This collection features character-driven narratives that balance emotional depth with accessible, engaging storytelling. The books share common themes of second chances, healing from loss or heartbreak, found family, and personal transformation, often featuring protagonists who are initially isolated, grumpy, or stuck in life. The tone is predominantly uplifting despite tackling serious subjects like grief, divorce, or loneliness, with humor woven throughout to create emotional balance. Settings often provide escapist appeal (bookshops, small villages, magical realms, vacation destinations), and there's frequently a romantic subplot or strong friendship that drives character growth. These stories offer comfort reading with substance—emotionally satisfying conclusions that feel earned rather than superficial.`,
  
  emotional: `This collection centers on narratives that explore profound human experiences with emotional depth and psychological authenticity. The books typically feature characters facing life-altering circumstances—trauma, loss, displacement, identity crises, or moral reckonings—and examine how these experiences reshape them. Common themes include intergenerational trauma, family secrets, the search for redemption, immigration and belonging, hidden identities, and the ripple effects of pivotal moments. The emotional tone ranges from devastating to hopeful, often within the same work, with authors who aren't afraid to explore darkness while finding meaning in suffering. These stories privilege character development over plot, focusing on internal transformation and the complexity of human relationships across cultures, time periods, and circumstances.`,
  
  identity: `This collection focuses on characters grappling with questions of self-definition and belonging, often featuring protagonists caught between multiple worlds, cultures, or identities. Common themes include immigration and cultural displacement, family secrets that reshape identity, coming-of-age in challenging circumstances, and the tension between individual authenticity and societal expectations. The collection includes both literary fiction exploring intergenerational trauma and cultural heritage, as well as memoirs of personal transformation through adversity. Stories often feature characters who are outsiders, minorities, or those questioning traditional roles, with emotional tones ranging from melancholic to hopeful, but always emphasizing resilience and self-discovery.`,
  
  spiritual: `This collection features books that explore fundamental questions about existence, meaning, consciousness, and human transformation through both fiction and non-fiction lenses. The works span philosophical novels that grapple with life's purpose and mortality (like existential fiction exploring choice and fate), spiritual memoirs of personal awakening and recovery, practical wisdom from contemplative traditions (particularly Buddhist and mindfulness teachings), and biographical accounts of individuals who've overcome profound challenges. Common themes include the relationship between suffering and growth, the nature of consciousness and identity, finding authentic self-expression, and developing compassion for human imperfection. The emotional tone balances intellectual rigor with genuine warmth and hope, avoiding both dogma and superficial positivity in favor of nuanced explorations of what it means to live meaningfully.`,
  
  justice: `This collection focuses on systemic oppression, marginalized voices, and overlooked injustices across historical and contemporary settings. Books feature characters confronting institutional racism, economic inequality, immigration struggles, gender discrimination, war crimes, environmental destruction, and abuse of power. The emotional tone ranges from devastating to ultimately hopeful, often following characters who find resilience despite overwhelming circumstances. Stories span multiple formats including literary fiction, memoirs, historical fiction, and investigative nonfiction, but all share a commitment to exposing hidden truths and amplifying silenced perspectives. Many explore intergenerational trauma, the lasting effects of historical wrongs, and how ordinary people navigate extraordinary moral challenges within broken systems.`
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
