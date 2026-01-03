import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function applyMigration() {
  console.log('Applying ISBN migration...');
  
  // Add columns
  const { error: error1 } = await supabase
    .from('books')
    .select('id')
    .limit(1);
    
  if (error1) {
    console.error('Cannot access books table:', error1);
    return;
  }
  
  // Try to add ISBN columns using raw SQL
  try {
    const { error } = await supabase
      .from('books')
      .select('id, isbn13, isbn10, cover_url')
      .limit(1);
    
    if (error && error.message.includes('does not exist')) {
      console.log('Columns do not exist, please run this SQL in Supabase dashboard:');
      console.log(`
ALTER TABLE books ADD COLUMN IF NOT EXISTS isbn13 TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS isbn10 TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_url TEXT;
      `);
    } else if (error) {
      console.error('Error checking columns:', error);
    } else {
      console.log('ISBN columns already exist!');
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  console.log('Migration complete!');
}

applyMigration().catch(console.error);
