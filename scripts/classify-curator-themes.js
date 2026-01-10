// Classify all books with curator themes using Claude
// Updates books.json with primary and secondary themes for each book

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

// Curator theme definitions (rich descriptions for Claude)
const CURATOR_THEMES = {
  women: {
    name: "Women's Untold Stories",
    description: `Books that excavate women's hidden contributions, survival under impossible conditions, and navigation of systems that weren't built for them. Female authors and female protagonists—not just in quantity, but in type. Books that give voice to women history overlooked. Think Kristin Hannah, Paula McLain, Marie Benedict. Historical fiction about women scientists erased from history, nurses in Vietnam, women who built empires in the shadows.`
  },
  beach: {
    name: "Beach Reads",
    description: `The books you devour in a weekend—the ones that make you laugh out loud on an airplane or stay up way too late because you have to know what happens next. Lighthearted, entertaining reads that are pure enjoyment without demanding too much. Think Emily Henry's witty banter, Abby Jimenez's warm humor, Fredrik Backman's heartwarming stories, cozy mysteries. Pure reading joy, no homework required.`
  },
  emotional: {
    name: "Emotional Truth",
    description: `Books that explore the depths of the human experience—grief, joy, heartbreak, missed chances. The thrillers here are psychological rather than procedural (Gone Girl, Verity). The romances grapple with real loss (The Midnight Library, A Man Called Ove). Stories that cost something to read—that leave the reader changed rather than simply entertained. Books that stay with you long after you've finished.`
  },
  identity: {
    name: "Identity & Belonging",
    description: `Characters navigating the gap between their authentic selves and the selves the world expects. Racial identity and passing (Vanishing Half, The Personal Librarian), class performance (Such a Fun Age), gender identity (This Is How It Always Is, The Danish Girl), cultural identity across diaspora (Homegoing). Who we are versus who we present ourselves to be.`
  },
  spiritual: {
    name: "Spiritual Seeking",
    description: `Pluralistic wisdom across traditions—not looking for one answer but collecting wisdom. Buddhism (Dalai Lama, Thich Nhat Hanh, Pema Chödrön), Hindu traditions, secular vulnerability research (Brené Brown), ancient wisdom (Baltasar Gracián). Working through tensions between ego dissolution and showing up vulnerably as oneself. Mindfulness, meaning-making, inner work.`
  },
  justice: {
    name: "Invisible Injustices",
    description: `Systems that fail people quietly. Criminal justice (Just Mercy, The Sun Does Shine, An American Marriage). Orphan trains, treatment of Vietnam nurses, erasure of women scientists, Guatemala's suppressed history. How power operates invisibly and how ordinary people become complicit. Systemic failures, historical erasure, institutional corruption.`
  }
};

// Process books in batches
async function classifyBooks(books) {
  const BATCH_SIZE = 15; // Process 15 books at a time to stay within token limits
  const results = [];
  
  for (let i = 0; i < books.length; i += BATCH_SIZE) {
    const batch = books.slice(i, i + BATCH_SIZE);
    console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(books.length / BATCH_SIZE)} (books ${i + 1}-${Math.min(i + BATCH_SIZE, books.length)})`);
    
    const batchResults = await classifyBatch(batch);
    results.push(...batchResults);
    
    // Rate limiting
    if (i + BATCH_SIZE < books.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

async function classifyBatch(batch) {
  const themeDescriptions = Object.entries(CURATOR_THEMES)
    .map(([key, theme]) => `**${key}** (${theme.name}): ${theme.description}`)
    .join('\n\n');
  
  const bookList = batch.map((book, i) => 
    `${i + 1}. "${book.title}" by ${book.author}
   Genre: ${book.genre || 'Unknown'}
   Description: ${book.description || 'No description'}
   Current themes: ${(book.themes || []).join(', ') || 'None'}`
  ).join('\n\n');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `You are classifying books for a curator's personal library. Each book should be tagged with curator themes based on how well it fits the theme descriptions below.

CURATOR THEMES:
${themeDescriptions}

BOOKS TO CLASSIFY:
${bookList}

For each book, assign themes in order of relevance (primary theme first, then secondary themes if applicable). A book can have 1-4 themes. Only assign themes that genuinely fit—don't force themes that don't apply.

Respond with a JSON array where each object has:
- "title": exact book title
- "themes": array of theme keys in order of relevance (e.g., ["emotional", "women", "identity"])

Example response:
[
  {"title": "The Great Alone", "themes": ["women", "emotional"]},
  {"title": "Beach Read", "themes": ["beach", "emotional"]}
]

Return ONLY the JSON array, no other text.`
    }]
  });

  try {
    const jsonText = response.content[0].text.trim();
    const classifications = JSON.parse(jsonText);
    
    // Map back to original books
    return batch.map(book => {
      const classification = classifications.find(c => 
        c.title.toLowerCase() === book.title.toLowerCase()
      );
      return {
        ...book,
        themes: classification?.themes || book.themes || []
      };
    });
  } catch (error) {
    console.error('Error parsing Claude response:', error);
    console.error('Response was:', response.content[0].text);
    // Return original books unchanged on error
    return batch;
  }
}

async function main() {
  console.log(`\n📚 Classifying ${books.length} books with curator themes...\n`);
  console.log('Themes:', Object.keys(CURATOR_THEMES).join(', '));
  
  const classifiedBooks = await classifyBooks(books);
  
  // Write updated books.json
  const outputPath = path.join(process.cwd(), 'src', 'books.json');
  fs.writeFileSync(outputPath, JSON.stringify(classifiedBooks, null, 4));
  
  console.log(`\n✅ Updated ${outputPath}`);
  
  // Summary stats
  const themeCounts = {};
  Object.keys(CURATOR_THEMES).forEach(t => themeCounts[t] = 0);
  
  classifiedBooks.forEach(book => {
    (book.themes || []).forEach(theme => {
      if (themeCounts[theme] !== undefined) {
        themeCounts[theme]++;
      }
    });
  });
  
  console.log('\n📊 Theme distribution:');
  Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([theme, count]) => {
      console.log(`  ${theme}: ${count} books`);
    });
  
  // Count books with beach theme
  const beachBooks = classifiedBooks.filter(b => b.themes?.includes('beach'));
  console.log(`\n🏖️ Beach reads (${beachBooks.length} books):`);
  beachBooks.forEach(b => console.log(`  - ${b.title}`));
}

main().catch(console.error);
