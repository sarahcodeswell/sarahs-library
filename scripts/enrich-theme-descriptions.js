// Generate enriched theme descriptions based on actual books in each category
// Output: Rich descriptions for web copy and recommendation context

import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';

config({ path: '.env.local' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Load books
const booksPath = path.join(process.cwd(), 'src', 'books.json');
const books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));

const THEMES = {
  women: "Women's Untold Stories",
  beach: "Beach Reads", 
  emotional: "Emotional Truth",
  identity: "Identity & Belonging",
  spiritual: "Spiritual Seeking",
  justice: "Invisible Injustices"
};

async function enrichThemeDescription(themeKey, themeName, themeBooks) {
  const bookList = themeBooks.map(b => 
    `• "${b.title}" by ${b.author} - ${b.description || 'No description'}`
  ).join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are Sarah, a book curator with deeply personal taste. Based on the ${themeBooks.length} books in your "${themeName}" collection, write TWO descriptions:

BOOKS IN THIS COLLECTION:
${bookList}

Write:

1. **WEB COPY** (2-3 sentences): A warm, personal description for your website that captures what draws you to these books. Write in first person. Make it feel like you're talking to a friend about why you love this category. Don't list specific books - capture the essence.

2. **RECOMMENDATION CONTEXT** (3-4 sentences): A detailed description for the AI recommendation system that captures the specific patterns, themes, emotional tones, and types of stories in this collection. Be specific about what makes a book fit this category. This will help find similar books.

Format your response exactly like this:
WEB_COPY: [your web copy here]
RECOMMENDATION_CONTEXT: [your recommendation context here]`
    }]
  });

  const text = response.content[0].text;
  
  // Parse response
  const webCopyMatch = text.match(/WEB_COPY:\s*(.+?)(?=RECOMMENDATION_CONTEXT:|$)/s);
  const recContextMatch = text.match(/RECOMMENDATION_CONTEXT:\s*(.+?)$/s);
  
  return {
    webCopy: webCopyMatch ? webCopyMatch[1].trim() : '',
    recommendationContext: recContextMatch ? recContextMatch[1].trim() : ''
  };
}

async function main() {
  console.log('📚 Generating enriched theme descriptions...\n');
  
  const results = {};
  
  for (const [key, name] of Object.entries(THEMES)) {
    const themeBooks = books.filter(b => b.themes?.includes(key));
    console.log(`\n🏷️ Processing: ${name} (${themeBooks.length} books)`);
    
    const enriched = await enrichThemeDescription(key, name, themeBooks);
    results[key] = {
      name,
      bookCount: themeBooks.length,
      ...enriched
    };
    
    console.log('\n--- WEB COPY ---');
    console.log(enriched.webCopy);
    console.log('\n--- RECOMMENDATION CONTEXT ---');
    console.log(enriched.recommendationContext);
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Save to file
  const outputPath = path.join(process.cwd(), 'src', 'lib', 'enrichedThemeDescriptions.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n\n✅ Saved to ${outputPath}`);
  
  // Also output as formatted text for review
  console.log('\n\n========================================');
  console.log('FULL OUTPUT FOR REVIEW');
  console.log('========================================\n');
  
  for (const [key, data] of Object.entries(results)) {
    console.log(`\n## ${data.name} (${data.bookCount} books)\n`);
    console.log('**Web Copy:**');
    console.log(data.webCopy);
    console.log('\n**Recommendation Context:**');
    console.log(data.recommendationContext);
    console.log('\n---');
  }
}

main().catch(console.error);
