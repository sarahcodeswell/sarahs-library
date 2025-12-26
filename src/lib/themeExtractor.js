// Theme extraction utility for building user taste profiles
// Extracts themes, genres, and topics from book recommendations

const THEME_KEYWORDS = {
  'women': ['women', 'female', 'feminist', 'mother', 'daughter', 'sister', 'wife'],
  'identity': ['identity', 'belonging', 'self', 'who am i', 'cultural', 'race', 'racial'],
  'emotional': ['emotional', 'grief', 'loss', 'love', 'heartbreak', 'trauma', 'healing'],
  'justice': ['justice', 'injustice', 'prison', 'wrongful', 'inequality', 'oppression'],
  'spiritual': ['spiritual', 'faith', 'religion', 'buddhist', 'meditation', 'mindfulness'],
  'historical': ['historical', 'history', 'war', 'period', 'era', 'past'],
  'family': ['family', 'marriage', 'divorce', 'parent', 'child', 'relationship'],
  'survival': ['survival', 'resilience', 'overcome', 'struggle', 'endure'],
  'mystery': ['mystery', 'thriller', 'suspense', 'detective', 'crime', 'murder'],
  'romance': ['romance', 'love story', 'romantic', 'relationship'],
  'literary': ['literary', 'literary fiction', 'character-driven', 'prose'],
  'memoir': ['memoir', 'autobiography', 'true story', 'personal'],
  'social': ['social', 'society', 'class', 'poverty', 'wealth', 'community']
};

/**
 * Extract themes from book descriptions and titles
 * @param {Array} recommendations - Array of book recommendations with title, author, description
 * @returns {Array} - Array of extracted theme strings
 */
export function extractThemes(recommendations) {
  if (!recommendations || !Array.isArray(recommendations)) {
    return [];
  }

  const themeScores = {};
  
  recommendations.forEach(book => {
    const text = `${book.title || ''} ${book.description || ''} ${book.why || ''}`.toLowerCase();
    
    Object.entries(THEME_KEYWORDS).forEach(([theme, keywords]) => {
      const matches = keywords.filter(keyword => text.includes(keyword)).length;
      if (matches > 0) {
        themeScores[theme] = (themeScores[theme] || 0) + matches;
      }
    });
  });

  // Return themes sorted by score, top 5
  return Object.entries(themeScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme]) => theme);
}

/**
 * Extract genres from book data
 * @param {Array} recommendations - Array of book recommendations
 * @returns {Array} - Array of genre strings
 */
export function extractGenres(recommendations) {
  if (!recommendations || !Array.isArray(recommendations)) {
    return [];
  }

  const genres = new Set();
  
  recommendations.forEach(book => {
    if (book.genre) {
      genres.add(book.genre.toLowerCase());
    }
    if (book.genres && Array.isArray(book.genres)) {
      book.genres.forEach(g => genres.add(g.toLowerCase()));
    }
  });

  return Array.from(genres);
}

/**
 * Build a comprehensive taste profile from recommendations
 * @param {Array} recommendations - Array of book recommendations
 * @returns {Object} - Taste profile with themes, genres, authors
 */
export function buildTasteProfile(recommendations) {
  return {
    themes: extractThemes(recommendations),
    genres: extractGenres(recommendations),
    authors: [...new Set(recommendations.map(r => r.author).filter(Boolean))]
  };
}
