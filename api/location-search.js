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

    if (!query || query.length < 2) {
      return json({ results: [] });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      console.warn('Google Places API key not configured');
      return json({ results: [] });
    }

    // Use new Google Places API (v1) for autocomplete
    const searchUrl = 'https://places.googleapis.com/v1/places:autocomplete';
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input: query,
        includedPrimaryTypes: ['locality', 'administrative_area_level_1', 'country'],
        languageCode: 'en'
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Google Places API error:', data.error);
      return json({ results: [] });
    }

    // Map results to our format
    const results = (data.suggestions || []).slice(0, 8).map(suggestion => {
      const place = suggestion.placePrediction;
      return {
        description: place?.text?.text || '',
        place_id: place?.placeId || '',
        // Parse structured formatting if available
        main_text: place?.structuredFormat?.mainText?.text || '',
        secondary_text: place?.structuredFormat?.secondaryText?.text || ''
      };
    });

    return json({ results });
  } catch (error) {
    console.error('Location search error:', error);
    return json({ results: [] });
  }
}
