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
      console.warn('Google Places API key not configured');
      return json({ results: [] });
    }

    // Use new Google Places API (v1)
    const searchUrl = 'https://places.googleapis.com/v1/places:searchText';
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.id'
      },
      body: JSON.stringify({
        textQuery: query,
        includedType: 'book_store',
        maxResultCount: 10
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Google Places API error:', data.error);
      return json({ results: [] });
    }

    // Map results to our format
    const results = (data.places || []).map(place => ({
      name: place.displayName?.text || '',
      address: place.formattedAddress || '',
      place_id: place.id || '',
    }));

    return json({ results });
  } catch (error) {
    console.error('Bookstore search error:', error);
    return json({ results: [] });
  }
}
