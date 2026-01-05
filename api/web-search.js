// Web search API endpoint using Serper (Google Search API)
// Used for getting current information about books, authors, new releases

import { withRetry, isRetryableError } from './utils/retry.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const serperApiKey = process.env.SERPER_API_KEY;

  if (!serperApiKey) {
    console.error('SERPER_API_KEY not configured');
    return res.status(200).json({ 
      results: [],
      error: 'Web search not configured' 
    });
  }

  try {
    // Use retry logic for transient failures
    const response = await withRetry(
      async () => {
        const resp = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': serperApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            q: query,
            num: 5
          }),
        });
        
        if (!resp.ok && resp.status >= 500) {
          const error = new Error(`Serper API error: ${resp.status}`);
          error.status = resp.status;
          throw error;
        }
        
        return resp;
      },
      { maxRetries: 2, initialDelay: 500 }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Serper API error:', errorText);
      return res.status(200).json({ 
        results: [],
        error: 'Web search failed' 
      });
    }

    const data = await response.json();
    
    // Extract and format the most useful results
    const results = [];
    
    // Add knowledge graph if available (often has the direct answer)
    if (data.knowledgeGraph) {
      results.push({
        type: 'knowledge',
        title: data.knowledgeGraph.title,
        description: data.knowledgeGraph.description,
        attributes: data.knowledgeGraph.attributes
      });
    }
    
    // Add answer box if available
    if (data.answerBox) {
      results.push({
        type: 'answer',
        title: data.answerBox.title,
        answer: data.answerBox.answer || data.answerBox.snippet
      });
    }
    
    // Add organic results
    if (data.organic) {
      data.organic.slice(0, 5).forEach(result => {
        // Extract ISBN from snippet if present
        const isbnMatch = result.snippet?.match(/ISBN[-\s]?(\d{10,13})/i);
        const isbn = isbnMatch ? isbnMatch[1].replace(/[-\s]/g, '') : null;
        
        results.push({
          type: 'organic',
          title: result.title,
          snippet: result.snippet,
          link: result.link,
          isbn: isbn
        });
      });
    }

    return res.status(200).json({ results });
  } catch (error) {
    console.error('Web search error:', error);
    return res.status(200).json({ 
      results: [],
      error: 'Web search failed' 
    });
  }
}
