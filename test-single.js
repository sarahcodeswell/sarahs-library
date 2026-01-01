// Test with a single book using the working API route
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Use the deployed API
async function generateDescription(title, author) {
  const prompt = `Generate a brief, engaging 2-3 sentence description for the book "${title}" by ${author || 'Unknown'}. Keep it concise, spoiler-free, and focused on themes/setting.`;

  try {
    const response = await fetch('https://www.sarahsbooks.com/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 100,
        system: [{ type: 'text', text: 'You are a book curator. Generate brief, engaging descriptions.' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      console.log(`Status: ${response.status}`);
      const text = await response.text();
      console.log(`Response: ${text}`);
      return null;
    }

    const data = await response.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

async function testOne() {
  const { data: books, error } = await supabase
    .from('reading_queue')
    .select('id, book_title, book_author')
    .or('description.is.null,description.eq.')
    .limit(1);
  
  if (error || !books.length) {
    console.log('No books found');
    return;
  }
  
  const book = books[0];
  console.log(`Testing: "${book.book_title}"`);
  
  const description = await generateDescription(book.book_title, book.book_author);
  
  if (description) {
    console.log(`✅ Generated: "${description}"`);
    
    const { error: updateError } = await supabase
      .from('reading_queue')
      .update({ description })
      .eq('id', book.id);
    
    if (!updateError) {
      console.log('✅ Updated in database!');
    } else {
      console.log('❌ Update failed:', updateError.message);
    }
  } else {
    console.log('❌ No description generated');
  }
}

testOne().catch(console.error);
