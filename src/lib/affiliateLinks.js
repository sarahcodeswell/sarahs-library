// Affiliate Link Helpers
// Centralized URL generation for book purchase/discovery links

const BOOKSHOP_AFFILIATE_ID = '119544';
const AMAZON_AFFILIATE_TAG = 'sarahsbooks01-20';
const LIBRO_FM_AFFILIATE_ID = 'sarahsbooks';
const AUDIBLE_AFFILIATE_TAG = 'sarahsbooks01-20';

export const getBookshopSearchUrl = (title, author) => {
  const searchQuery = encodeURIComponent(`${title} ${author || ''}`);
  return `https://bookshop.org/search?keywords=${searchQuery}&a_aid=${BOOKSHOP_AFFILIATE_ID}`;
};

export const getAmazonKindleUrl = (title, author) => {
  const searchQuery = encodeURIComponent(`${title} ${author || ''} kindle`);
  return `https://www.amazon.com/s?k=${searchQuery}&i=digital-text&tag=${AMAZON_AFFILIATE_TAG}`;
};

export const getLibbyUrl = (title, author) => {
  // Libby app deep link - opens app if installed, otherwise directs to app store
  return `https://libbyapp.com/library`;
};

export const getLibroFmUrl = (title, author) => {
  const searchQuery = encodeURIComponent(`${title} ${author || ''}`);
  return `https://libro.fm/search?q=${searchQuery}&affiliate=${LIBRO_FM_AFFILIATE_ID}`;
};

export const getAudibleUrl = (title, author) => {
  const searchQuery = encodeURIComponent(`${title} ${author || ''}`);
  return `https://www.audible.com/search?keywords=${searchQuery}&tag=${AUDIBLE_AFFILIATE_TAG}`;
};

export const getGoodreadsSearchUrl = (title, author) => {
  const searchQuery = encodeURIComponent(`${title} ${author || ''}`);
  return `https://www.goodreads.com/search?q=${searchQuery}`;
};

// Export affiliate IDs for components that need them directly
export const AFFILIATE_IDS = {
  BOOKSHOP_AFFILIATE_ID,
  AMAZON_AFFILIATE_TAG,
  LIBRO_FM_AFFILIATE_ID,
  AUDIBLE_AFFILIATE_TAG
};
