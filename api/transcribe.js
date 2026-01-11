import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const config = {
  maxDuration: 60, // Allow up to 60 seconds for longer recordings
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { audioUrl, momentId } = req.body;

  if (!audioUrl) {
    return res.status(400).json({ error: 'audioUrl is required' });
  }

  try {
    // Fetch the audio file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio file: ${audioResponse.status}`);
    }

    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    
    // Create a File-like object that OpenAI SDK accepts
    const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

    // Use OpenAI Whisper for transcription
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en'
    });

    const transcript = transcription.text;

    return res.status(200).json({ 
      transcript,
      momentId 
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return res.status(500).json({ 
      error: 'Transcription failed',
      details: error.message 
    });
  }
}
