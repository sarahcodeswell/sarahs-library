import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, author } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `For the book "${title}" by ${author || 'unknown author'}, provide a brief reputation summary (1-2 sentences max) mentioning any notable awards, accolades, bestseller status, or critical recognition. Examples:
- "Pulitzer Prize winner, New York Times Bestseller"
- "Indie Next List Pick, Agatha Award Winner for Best First Novel"
- "National Book Award Finalist, over 2 million copies sold"

If the book has no notable awards or recognition, respond with just: "none"

Respond with ONLY the reputation text, no explanation or preamble.`
        }
      ]
    });

    const reputation = message.content[0]?.text?.trim();
    
    // Return null if no notable reputation
    if (!reputation || reputation.toLowerCase() === 'none' || reputation.toLowerCase().includes('no notable')) {
      return res.status(200).json({ reputation: null });
    }

    return res.status(200).json({ reputation });
  } catch (error) {
    console.error('Error fetching book reputation:', error);
    return res.status(500).json({ error: 'Failed to fetch reputation' });
  }
}
