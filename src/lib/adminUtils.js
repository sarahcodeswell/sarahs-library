/**
 * Admin utility functions for one-time data operations
 */

import { db } from './supabase';
import booksData from '../books.json';

const MASTER_ADMIN_EMAIL = 'sarah@darkridge.com';

/**
 * Populate Master Admin's reading queue with all curated books
 * This should be run once to migrate the 200 curated books into the database
 * After this, all finished book logic will work consistently
 */
export async function populateMasterAdminReadingQueue(userId, userEmail) {
  if (userEmail !== MASTER_ADMIN_EMAIL) {
    console.warn('This function is only for Master Admin');
    return { success: false, error: 'Not authorized' };
  }

  try {
    console.log('[Admin Utils] Starting to populate Master Admin reading queue...');
    console.log('[Admin Utils] Total books to add:', booksData.length);

    // Get existing reading queue to avoid duplicates
    const { data: existingQueue } = await db.getReadingQueue(userId);
    const existingTitles = new Set(
      (existingQueue || []).map(item => item.book_title?.toLowerCase().trim())
    );

    console.log('[Admin Utils] Existing books in queue:', existingTitles.size);

    // Filter out books already in queue
    const booksToAdd = booksData.filter(book => 
      !existingTitles.has(book.title?.toLowerCase().trim())
    );

    console.log('[Admin Utils] Books to add:', booksToAdd.length);

    if (booksToAdd.length === 0) {
      console.log('[Admin Utils] All books already in reading queue');
      return { success: true, added: 0, skipped: booksData.length };
    }

    // Add books in batches to avoid overwhelming the database
    const batchSize = 50;
    let addedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < booksToAdd.length; i += batchSize) {
      const batch = booksToAdd.slice(i, i + batchSize);
      console.log(`[Admin Utils] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(booksToAdd.length / batchSize)}`);

      for (const book of batch) {
        const result = await db.addToReadingQueue(userId, {
          title: book.title,
          author: book.author,
          status: 'finished'
        });

        if (result.success) {
          addedCount++;
        } else {
          errorCount++;
          console.error('[Admin Utils] Failed to add book:', book.title, result.error);
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < booksToAdd.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('[Admin Utils] Population complete!');
    console.log('[Admin Utils] Added:', addedCount);
    console.log('[Admin Utils] Errors:', errorCount);
    console.log('[Admin Utils] Skipped (already existed):', booksData.length - booksToAdd.length);

    return {
      success: true,
      added: addedCount,
      errors: errorCount,
      skipped: booksData.length - booksToAdd.length
    };
  } catch (error) {
    console.error('[Admin Utils] Error populating reading queue:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if Master Admin's reading queue needs population
 */
export async function checkMasterAdminReadingQueue(userId, userEmail) {
  if (userEmail !== MASTER_ADMIN_EMAIL) {
    return { needsPopulation: false };
  }

  try {
    const { data: queue } = await db.getReadingQueue(userId);
    const finishedCount = (queue || []).filter(item => item.status === 'finished').length;
    const needsPopulation = finishedCount < booksData.length;

    return {
      needsPopulation,
      currentCount: finishedCount,
      expectedCount: booksData.length,
      missing: booksData.length - finishedCount
    };
  } catch (error) {
    console.error('[Admin Utils] Error checking reading queue:', error);
    return { needsPopulation: false, error: error.message };
  }
}
