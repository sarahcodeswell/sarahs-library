/**
 * Fix books with null status - set them to 'want_to_read'
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fix() {
  // Check status distribution
  const { data: all } = await supabase.from('reading_queue').select('status');
  
  const statusCounts = {};
  (all || []).forEach(b => {
    const s = b.status || 'null';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  
  console.log('Status distribution:');
  console.log(statusCounts);
  
  // Find books with null status
  const { data: nullBooks, error } = await supabase
    .from('reading_queue')
    .select('id, book_title, user_id')
    .is('status', null);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`\nFound ${nullBooks?.length || 0} books with null status`);
  
  if (nullBooks && nullBooks.length > 0) {
    console.log('\nUpdating to want_to_read...');
    
    const { error: updateError } = await supabase
      .from('reading_queue')
      .update({ status: 'want_to_read' })
      .is('status', null);
    
    if (updateError) {
      console.error('Update error:', updateError);
    } else {
      console.log(`✅ Updated ${nullBooks.length} books to 'want_to_read'`);
    }
  }
}

fix().catch(console.error);
