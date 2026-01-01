// Run the ISBN/cover migration
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('Adding ISBN and cover columns to reading_queue...\n');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE reading_queue 
      ADD COLUMN IF NOT EXISTS isbn TEXT,
      ADD COLUMN IF NOT EXISTS isbn10 TEXT,
      ADD COLUMN IF NOT EXISTS isbn13 TEXT,
      ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
      ADD COLUMN IF NOT EXISTS open_library_key TEXT,
      ADD COLUMN IF NOT EXISTS first_publish_year INTEGER;
      
      CREATE INDEX IF NOT EXISTS idx_reading_queue_isbn ON reading_queue(isbn);
    `
  });
  
  if (error) {
    // RPC might not exist, try direct query
    console.log('RPC not available, trying direct approach...');
    
    // Test if columns exist by selecting them
    const { data, error: testError } = await supabase
      .from('reading_queue')
      .select('isbn')
      .limit(1);
    
    if (testError && testError.message.includes('isbn')) {
      console.log('❌ Columns do not exist. Please run this SQL in Supabase dashboard:\n');
      console.log(`
ALTER TABLE reading_queue 
ADD COLUMN IF NOT EXISTS isbn TEXT,
ADD COLUMN IF NOT EXISTS isbn10 TEXT,
ADD COLUMN IF NOT EXISTS isbn13 TEXT,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS open_library_key TEXT,
ADD COLUMN IF NOT EXISTS first_publish_year INTEGER;

CREATE INDEX IF NOT EXISTS idx_reading_queue_isbn ON reading_queue(isbn);
      `);
    } else {
      console.log('✅ Columns already exist or were added successfully!');
    }
  } else {
    console.log('✅ Migration complete!');
  }
}

runMigration().catch(console.error);
