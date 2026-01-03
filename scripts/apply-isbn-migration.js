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
  
  // Try to add ISBN columns
  try {
    await supabase.rpc('exec', { 
      sql: 'ALTER TABLE books ADD COLUMN IF NOT EXISTS isbn13 TEXT;' 
    });
  } catch (e) {
    console.log('ISBN13 column may already exist');
  }
  
  try {
    await supabase.rpc('exec', { 
      sql: 'ALTER TABLE books ADD COLUMN IF NOT EXISTS isbn10 TEXT;' 
    });
  } catch (e) {
    console.log('ISBN10 column may already exist');
  }
  
  try {
    await supabase.rpc('exec', { 
      sql: 'ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_url TEXT;' 
    });
  } catch (e) {
    console.log('cover_url column may already exist');
  }
  
  console.log('Migration complete!');
}

applyMigration().catch(console.error);
