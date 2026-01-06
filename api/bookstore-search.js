export const config = {
  runtime: 'edge',
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export default async function handler(req) {
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q');

    if (!query || query.length < 3) {
      return json({ results: [] });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      // Fallback: return empty results if no API key configured
      // User can still manually enter bookstore name
      console.warn('Google Places API key not configured');
      return json({ results: [] });
    }

    // Use Google Places Text Search API
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&type=book_store&key=${apiKey}`;
    
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message);
      return json({ results: [] });
    }

    // Map results to our format
    const results = (data.results || []).slice(0, 10).map(place => ({
      name: place.name,
      address: place.formatted_address,
      place_id: place.place_id,
    }));

    return json({ results });
  } catch (error) {
    console.error('Bookstore search error:', error);
    return json({ results: [] });
  }
}
