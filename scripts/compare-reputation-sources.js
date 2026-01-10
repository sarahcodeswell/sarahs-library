#!/usr/bin/env node
/**
 * Compare reputation data quality from different sources:
 * 1. Google Books API (free, no auth)
 * 2. Serper Web Search API (requires API key)
 * 3. Claude AI (requires API key)
 * 
 * Usage: ANTHROPIC_API_KEY=xxx SERPER_API_KEY=xxx node scripts/compare-reputation-sources.js
 */

import Anthropic from '@anthropic-ai/sdk';

const TEST_BOOKS = [
  { title: "People We Meet on Vacation", author: "Emily Henry" },
  { title: "The Nightingale", author: "Kristin Hannah" },
  { title: "Where the Crawdads Sing", author: "Delia Owens" },
  { title: "Educated", author: "Tara Westover" },
  { title: "The Kite Runner", author: "Khaled Hosseini" },
];

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';
const SERPER_API = 'https://google.serper.dev/search';

// ============ GOOGLE BOOKS ============
async function fetchGoogleBooks(title, author) {
  const query = encodeURIComponent(`${title} ${author}`);
  const url = `${GOOGLE_BOOKS_API}?q=${query}&maxResults=1`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return { source: 'Google Books', reputation: null, raw: 'No results' };
    }
    
    const volumeInfo = data.items[0].volumeInfo;
    const parts = [];
    
    if (volumeInfo.averageRating && volumeInfo.ratingsCount) {
      parts.push(`${volumeInfo.averageRating}/5 stars (${volumeInfo.ratingsCount.toLocaleString()} ratings)`);
    }
    
    if (volumeInfo.categories) {
      parts.push(`Categories: ${volumeInfo.categories.join(', ')}`);
    }
    
    return {
      source: 'Google Books',
      reputation: parts.length > 0 ? parts.join(' • ') : null,
      raw: { rating: volumeInfo.averageRating, count: volumeInfo.ratingsCount, categories: volumeInfo.categories }
    };
  } catch (error) {
    return { source: 'Google Books', reputation: null, error: error.message };
  }
}

// ============ SERPER WEB SEARCH ============
async function fetchSerper(title, author) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return { source: 'Serper', reputation: null, error: 'No SERPER_API_KEY' };
  }
  
  try {
    const response = await fetch(SERPER_API, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: `"${title}" "${author}" book awards accolades bestseller`,
        num: 5
      })
    });
    
    const data = await response.json();
    
    // Extract snippets that mention awards/accolades
    const snippets = [];
    if (data.organic) {
      for (const result of data.organic.slice(0, 3)) {
        if (result.snippet) {
          snippets.push(result.snippet);
        }
      }
    }
    
    // Also check knowledge graph
    let knowledgeGraph = null;
    if (data.knowledgeGraph) {
      knowledgeGraph = {
        title: data.knowledgeGraph.title,
        description: data.knowledgeGraph.description,
        attributes: data.knowledgeGraph.attributes
      };
    }
    
    return {
      source: 'Serper',
      reputation: snippets.length > 0 ? snippets[0].substring(0, 200) : null,
      raw: { snippets, knowledgeGraph }
    };
  } catch (error) {
    return { source: 'Serper', reputation: null, error: error.message };
  }
}

// ============ CLAUDE AI ============
async function fetchClaude(title, author) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { source: 'Claude', reputation: null, error: 'No ANTHROPIC_API_KEY' };
  }
  
  try {
    const anthropic = new Anthropic({ apiKey });
    
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `For the book "${title}" by ${author}, provide a brief reputation summary (1-2 sentences max) mentioning any notable awards, accolades, bestseller status, or critical recognition. Examples:
- "Pulitzer Prize winner, New York Times Bestseller"
- "Indie Next List Pick, Agatha Award Winner for Best First Novel"
- "National Book Award Finalist, over 2 million copies sold"

If the book has no notable awards or recognition, respond with just: "none"

Respond with ONLY the reputation text, no explanation or preamble.`
        }
      ]
    });

    const reputation = message.content[0]?.text?.trim();
    
    if (!reputation || reputation.toLowerCase() === 'none') {
      return { source: 'Claude', reputation: null, raw: 'none' };
    }
    
    return { source: 'Claude', reputation, raw: reputation };
  } catch (error) {
    return { source: 'Claude', reputation: null, error: error.message };
  }
}

// ============ MAIN ============
async function main() {
  console.log('🔍 Comparing Reputation Data Sources\n');
  console.log('='.repeat(80));
  
  for (const book of TEST_BOOKS) {
    console.log(`\n📚 "${book.title}" by ${book.author}`);
    console.log('-'.repeat(60));
    
    // Fetch from all sources in parallel
    const [googleResult, serperResult, claudeResult] = await Promise.all([
      fetchGoogleBooks(book.title, book.author),
      fetchSerper(book.title, book.author),
      fetchClaude(book.title, book.author)
    ]);
    
    console.log('\n1. GOOGLE BOOKS:');
    if (googleResult.error) {
      console.log(`   ❌ Error: ${googleResult.error}`);
    } else if (googleResult.reputation) {
      console.log(`   ✅ ${googleResult.reputation}`);
    } else {
      console.log(`   ⚠️  No reputation data`);
    }
    
    console.log('\n2. SERPER WEB SEARCH:');
    if (serperResult.error) {
      console.log(`   ❌ Error: ${serperResult.error}`);
    } else if (serperResult.reputation) {
      console.log(`   ✅ ${serperResult.reputation}`);
    } else {
      console.log(`   ⚠️  No reputation data`);
    }
    
    console.log('\n3. CLAUDE AI:');
    if (claudeResult.error) {
      console.log(`   ❌ Error: ${claudeResult.error}`);
    } else if (claudeResult.reputation) {
      console.log(`   ✅ ${claudeResult.reputation}`);
    } else {
      console.log(`   ⚠️  No reputation data`);
    }
    
    console.log('\n' + '='.repeat(80));
    
    // Small delay between books
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n✅ Comparison complete!');
}

main().catch(console.error);
