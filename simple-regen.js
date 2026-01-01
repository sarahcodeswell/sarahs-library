// Simple direct API call to regenerate descriptions
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Direct Anthropic API call
async function generateDescription(title, author) {
  const prompt = `Generate a brief, engaging 2-3 sentence description for the book "${title}" by ${author || 'Unknown'}. Keep it concise, spoiler-free, and focused on themes/setting.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch (error) {
    console.error(`Failed for "${title}":`, error.message);
    return null;
  }
}

async function regenerateOne() {
  // Test with just one book first
  const { data: books, error } = await supabase
    .from('reading_queue')
    .select('id, book_title, book_author')
    .or('description.is.null,description.eq.')
    .limit(1);
  
  if (error || !books.length) {
    console.log('No books found or error:', error);
    return;
  }
  
  const book = books[0];
  console.log(`Testing: "${book.book_title}" by ${book.book_author}`);
  
  const description = await generateDescription(book.book_title, book.book_author);
  
  if (description) {
    console.log(`Generated: "${description}"`);
    
    const { error: updateError } = await supabase
      .from('reading_queue')
      .update({ description })
      .eq('id', book.id);
    
    if (!updateError) {
      console.log('✅ Updated successfully!');
    } else {
      console.log('❌ Update failed:', updateError.message);
    }
  } else {
    console.log('❌ No description generated');
  }
}

regenerateOne().catch(console.error);
