import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transcript, context, prompt } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: 'transcript is required' });
  }

  try {
    const systemPrompt = context === 'taste_framework' 
      ? `You are reflecting back what a book curator shared about their reading philosophy and taste.
         Be warm, insightful, and mirror back what you notice in their words.
         Focus on the emotional truth of what they shared, not just the surface content.`
      : `You are reflecting back what a reader shared about a book they're reading.
         Be a mirror, not a judge. Use "you" language. Keep it concise and genuine.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `${systemPrompt}

${prompt ? `They were answering: "${prompt}"` : ''}

Their voice note transcript:
"${transcript}"

Respond with a brief, warm reflection in exactly this JSON format:
{
  "feeling": "2-4 words describing their emotional state or core value expressed",
  "observation": "One sentence reflecting back what you noticed—a theme, insight, or pattern in what they shared"
}

Be genuine and specific to what they actually said. Don't be generic.`
        }
      ]
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format');
    }

    // Parse the JSON from Claude's response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse glimpse response');
    }

    const glimpse = JSON.parse(jsonMatch[0]);

    return res.status(200).json({
      feeling: glimpse.feeling,
      observation: glimpse.observation
    });

  } catch (error) {
    console.error('Glimpse generation error:', error);
    return res.status(500).json({ 
      error: 'Glimpse generation failed',
      details: error.message 
    });
  }
}
