// Generate AI "Why Sarah Recommends" assessments for each book
// Run: node scripts/generate-sarah-assessments.js
// Output: scripts/sarah-assessments.json (for review/editing)

import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { config } from 'dotenv';

config({ path: '.env.local' });

const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error('Missing OPENAI_API_KEY in .env.local');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiApiKey });

// Load Sarah's book catalog
const booksPath = path.join(process.cwd(), 'src', 'books.json');
const books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));

// Sarah's curator persona for consistent voice
const SARAH_PERSONA = `You are Sarah, a passionate book curator who runs a personalized book recommendation service. 
You have a warm, thoughtful voice and genuinely care about connecting readers with books that will resonate with them.
Your recommendations focus on emotional impact, character depth, and themes that make readers think.
You especially love books featuring strong women, stories about identity and belonging, and narratives that explore justice and emotional complexity.
Keep your assessments personal, specific, and under 2-3 sentences. Avoid generic praise.`;

async function generateAssessment(book) {
  const prompt = `Based on this book, write a brief "Why I recommend it" in Sarah's voice:

Title: ${book.title}
Author: ${book.author}
Description: ${book.description}
Themes: ${(book.themes || []).join(', ')}
${book.favorite ? "This is one of Sarah's all-time favorites." : ""}

Write 1-2 sentences explaining why Sarah loves this book and who it's perfect for. Be specific about what makes it special.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SARAH_PERSONA },
        { role: "user", content: prompt }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });
    
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error(`Error generating assessment for "${book.title}":`, error.message);
    return null;
  }
}

async function main() {
  console.log(`\n📚 Generating Sarah's assessments for ${books.length} books...\n`);
  
  const assessments = [];
  
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    console.log(`[${i + 1}/${books.length}] ${book.title}...`);
    
    const assessment = await generateAssessment(book);
    
    assessments.push({
      title: book.title,
      author: book.author,
      themes: book.themes,
      favorite: book.favorite || false,
      sarah_assessment: assessment || "[NEEDS MANUAL ENTRY]"
    });
    
    if (assessment) {
      console.log(`   ✅ "${assessment.substring(0, 60)}..."`);
    } else {
      console.log(`   ❌ Failed - needs manual entry`);
    }
    
    // Rate limiting
    if (i < books.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  // Save to JSON file for review
  const outputPath = path.join(process.cwd(), 'scripts', 'sarah-assessments.json');
  fs.writeFileSync(outputPath, JSON.stringify(assessments, null, 2));
  
  console.log(`\n✅ Done! Assessments saved to: ${outputPath}`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Review and edit the assessments in sarah-assessments.json`);
  console.log(`   2. Run: node scripts/apply-assessments.js to merge into books.json`);
  console.log(`   3. Run: node scripts/generate-embeddings.js to update vector DB`);
}

main().catch(console.error);
