// Supabase client configuration
// Install: npm install @supabase/supabase-js

import { createClient } from '@supabase/supabase-js';
import { stripAccoladesFromDescription } from './descriptionUtils';

// These will come from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Only create client if we have valid credentials
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'sarahs-books-auth',
        flowType: 'pkce',
        debug: import.meta.env.DEV // Enable debug logging in dev mode
      }
    })
  : null;

// Auth helpers
export const auth = {
  signUp: async (email, password) => {
    if (!supabase) return { data: null, error: { message: 'Auth not configured' } };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  },

  signIn: async (email, password) => {
    if (!supabase) return { data: null, error: { message: 'Auth not configured' } };
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  signOut: async () => {
    if (!supabase) return { error: null };
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  resetPassword: async (email) => {
    if (!supabase) return { data: null, error: { message: 'Auth not configured' } };
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  },

  updatePassword: async (newPassword) => {
    if (!supabase) return { data: null, error: { message: 'Auth not configured' } };
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  },

  getUser: async () => {
    if (!supabase) return null;
    try {
      // First try to get the session (which will auto-refresh if needed)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('Session error:', sessionError.message);
        return null;
      }
      
      if (session?.user) {
        return session.user;
      }
      
      // Fallback to getUser if no session
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  onAuthStateChange: (callback) => {
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(callback);
  },

  updateUser: async (updates) => {
    if (!supabase) return { data: null, error: { message: 'Auth not configured' } };
    const { data, error } = await supabase.auth.updateUser(updates);
    return { data, error };
  },
};

// Database helpers
export const db = {
  // Taste Profile operations
  getTasteProfile: async (userId) => {
    if (!supabase) return { data: null, error: null };
    const { data, error } = await supabase
      .from('taste_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    return { data, error };
  },

  upsertTasteProfile: async (userId, profile) => {
    if (!supabase) return { data: null, error: null };
    
    // Auto-generate book-themed referral code if not provided
    const generateBookCode = (id) => {
      const bookWords = [
        'CHAPTER', 'NOVEL', 'STORY', 'READER', 'PAGES', 'PROSE', 
        'SHELF', 'SPINE', 'COVER', 'WORDS', 'TALES', 'BOOKS',
        'PLOT', 'QUEST', 'SAGA', 'EPIC', 'VERSE', 'INK'
      ];
      // Use first 4 chars of userId to pick a word deterministically
      const hash = parseInt(id.replace(/-/g, '').substring(0, 4), 16);
      const word = bookWords[hash % bookWords.length];
      // Add 3 random-ish digits from userId
      const digits = id.replace(/-/g, '').substring(4, 7).toUpperCase();
      return `${word}${digits}`;
    };
    const referralCode = profile.referral_code || generateBookCode(userId);
    
    const { data, error } = await supabase
      .from('taste_profiles')
      .upsert({
        user_id: userId,
        liked_books: profile.likedBooks || [],
        liked_themes: profile.likedThemes || [],
        liked_authors: profile.likedAuthors || [],
        profile_photo_url: profile.profile_photo_url || null,
        favorite_authors: profile.favorite_authors || [],
        birth_year: profile.birth_year || null,
        city: profile.city || null,
        state: profile.state || null,
        country: profile.country || null,
        favorite_genres: profile.favorite_genres || [],
        favorite_bookstore_name: profile.favorite_bookstore_name || null,
        favorite_bookstore_place_id: profile.favorite_bookstore_place_id || null,
        favorite_bookstore_address: profile.favorite_bookstore_address || null,
        referral_code: referralCode,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      });
    return { data, error };
  },

  // Reading Queue operations
  getReadingQueue: async (userId) => {
    if (!supabase) return { data: null, error: null };
    
    // Add retry logic for network issues
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const { data, error } = await supabase
          .from('reading_queue')
          .select('*')
          .eq('user_id', userId)
          .order('added_at', { ascending: false });
        
        if (!error || error.code !== 'PGRST301') {
          return { data, error };
        }
        
        if (import.meta.env.DEV) {
          console.log(`getReadingQueue: Retry attempt ${attempts + 1}/${maxAttempts}`);
        }
        attempts++;
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        
      } catch (err) {
        console.error(`getReadingQueue: Attempt ${attempts + 1} failed:`, err);
        attempts++;
        
        if (attempts >= maxAttempts) {
          return { data: null, error: { message: 'Network error after retries' } };
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
    
    return { data: null, error: { message: 'Max retry attempts exceeded' } };
  },

  addToReadingQueue: async (userId, book) => {
    if (!supabase) {
      console.error('addToReadingQueue: Supabase client not initialized');
      return { data: null, error: { message: 'Supabase not configured' } };
    }
    
    if (import.meta.env.DEV) {
      console.log('addToReadingQueue: Starting insert for', { userId, book });
    }
    
    const insertData = {
      user_id: userId,
      book_title: book.title,
      book_author: book.author,
      status: book.status || 'want_to_read',
    };
    
    // Include ISBN if provided (primary identifier)
    if (book.isbn) {
      insertData.isbn = book.isbn;
    }
    if (book.isbn13) {
      insertData.isbn13 = book.isbn13;
    }
    if (book.isbn10) {
      insertData.isbn10 = book.isbn10;
    }
    
    // Include cover image if provided
    if (book.cover_image_url) {
      insertData.cover_image_url = book.cover_image_url;
    }
    
    // Include rating if provided
    if (book.rating !== undefined) {
      insertData.rating = book.rating;
    }
    
    // Include description if provided (from recommendations) - strip accolades for clean data
    if (book.description) {
      insertData.description = stripAccoladesFromDescription(book.description);
    }
    
    // Include why_recommended if provided
    if (book.why) {
      insertData.why_recommended = book.why;
    }
    
    // Include reputation/accolades if provided
    if (book.reputation) {
      insertData.reputation = book.reputation;
    }
    
    // Include is_active for currently reading books (Reading Now vs On Hold)
    if (book.is_active !== undefined) {
      insertData.is_active = book.is_active;
    }
    
    try {
      const { data, error } = await supabase
        .from('reading_queue')
        .insert([insertData])
        .select();
      
      if (import.meta.env.DEV) {
        console.log('addToReadingQueue: Insert complete', { data, error });
      }
      return { data, error };
    } catch (err) {
      console.error('addToReadingQueue: Exception during insert', err);
      return { data: null, error: { message: err.message || 'Insert failed' } };
    }
  },

  removeFromReadingQueue: async (id) => {
    if (!supabase) return { error: null };
    const { error } = await supabase
      .from('reading_queue')
      .delete()
      .eq('id', id);
    return { error };
  },

  updateReadingQueueStatus: async (id, status) => {
    if (!supabase) {
      console.error('updateReadingQueueStatus: Supabase client not initialized');
      return { data: null, error: { message: 'Supabase not configured' } };
    }
    
    if (import.meta.env.DEV) {
      console.log('updateReadingQueueStatus: Updating', { id, status });
    }
    
    try {
      const { data, error } = await supabase
        .from('reading_queue')
        .update({ status })
        .eq('id', id)
        .select();
      
      if (error) {
        console.error('updateReadingQueueStatus: Database error', error);
      } else if (import.meta.env.DEV) {
        console.log('updateReadingQueueStatus: Success', data);
      }
      
      return { data, error };
    } catch (err) {
      console.error('updateReadingQueueStatus: Exception', err);
      return { data: null, error: { message: err.message || 'Update failed' } };
    }
  },

  updateReadingQueueItem: async (id, updates) => {
    if (!supabase) return { data: null, error: null };
    
    try {
      const updateData = {};
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.rating !== undefined) updateData.rating = updates.rating;
      if (updates.description !== undefined) updateData.description = stripAccoladesFromDescription(updates.description);
      if (updates.reputation !== undefined) updateData.reputation = updates.reputation;
      
      const { data, error } = await supabase
        .from('reading_queue')
        .update(updateData)
        .eq('id', id)
        .select();
      
      return { data, error };
    } catch (err) {
      console.error('updateReadingQueueItem: Exception', err);
      return { data: null, error: { message: err.message || 'Update failed' } };
    }
  },

  // Toggle book ownership status
  updateBookOwnership: async (id, owned) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    
    try {
      const { data, error } = await supabase
        .from('reading_queue')
        .update({ owned })
        .eq('id', id)
        .select();
      
      return { data, error };
    } catch (err) {
      console.error('updateBookOwnership: Exception', err);
      return { data: null, error: { message: err.message || 'Update failed' } };
    }
  },

  // User Books operations
  getUserBooks: async (userId) => {
    if (!supabase) return { data: null, error: null };
    
    try {
      const { data, error } = await supabase
        .from('user_books')
        .select('*')
        .eq('user_id', userId)
        .order('added_at', { ascending: false });
      
      return { data, error };
    } catch (err) {
      console.error('getUserBooks: Exception', err);
      return { data: null, error: { message: err.message || 'Fetch failed' } };
    }
  },

  addUserBook: async (userId, book) => {
    if (!supabase) {
      console.error('addUserBook: Supabase client not initialized');
      return { data: null, error: { message: 'Supabase not configured' } };
    }
    
    if (import.meta.env.DEV) {
      console.log('addUserBook: Starting insert for', { userId, book });
    }
    
    try {
      const { data, error } = await supabase
        .from('user_books')
        .insert({
          user_id: userId,
          book_title: book.title,
          book_author: book.author,
          isbn: book.isbn || null,
          cover_image_url: book.coverImageUrl || null,
          added_via: book.addedVia || 'manual',
          notes: book.notes || null,
          added_at: new Date().toISOString(),
        })
        .select();
      
      if (import.meta.env.DEV) {
        console.log('addUserBook: Insert complete', { data, error });
      }
      return { data, error };
    } catch (err) {
      console.error('addUserBook: Exception during insert', err);
      return { data: null, error: { message: err.message || 'Insert failed' } };
    }
  },

  removeUserBook: async (id) => {
    if (!supabase) return { error: null };
    
    try {
      const { error } = await supabase
        .from('user_books')
        .delete()
        .eq('id', id);
      
      return { error };
    } catch (err) {
      console.error('removeUserBook: Exception', err);
      return { error: { message: err.message || 'Delete failed' } };
    }
  },

  updateUserBook: async (id, updates) => {
    if (!supabase) return { data: null, error: null };
    
    try {
      const updateData = {};
      if (updates.title !== undefined) updateData.book_title = updates.title;
      if (updates.author !== undefined) updateData.book_author = updates.author;
      if (updates.isbn !== undefined) updateData.isbn = updates.isbn;
      if (updates.coverImageUrl !== undefined) updateData.cover_image_url = updates.coverImageUrl;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.rating !== undefined) updateData.rating = updates.rating;
      
      const { data, error } = await supabase
        .from('user_books')
        .update(updateData)
        .eq('id', id)
        .select();
      
      return { data, error };
    } catch (err) {
      console.error('updateUserBook: Exception', err);
      return { data: null, error: { message: err.message || 'Update failed' } };
    }
  },

  // Recommendations functions
  getUserRecommendations: async (userId) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    
    try {
      const { data, error } = await supabase
        .from('user_recommendations')
        .select(`
          *,
          shared_recommendations (
            share_token,
            view_count,
            last_viewed_at
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      return { data, error };
    } catch (err) {
      console.error('getUserRecommendations: Exception', err);
      return { data: null, error: { message: err.message || 'Fetch failed' } };
    }
  },

  createRecommendation: async (userId, book, note, sharedWith = null) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    
    try {
      const insertData = {
        user_id: userId,
        book_title: book.book_title || book.title,
        book_author: book.book_author || book.author,
        book_isbn: book.isbn || null,
        book_description: stripAccoladesFromDescription(book.description || book.why_recommended) || null,
        recommendation_note: note,
        is_from_collection: true
      };
      
      if (sharedWith) {
        insertData.shared_with = sharedWith;
      }
      
      const { data, error } = await supabase
        .from('user_recommendations')
        .insert(insertData)
        .select()
        .single();
      
      return { data, error };
    } catch (err) {
      console.error('createRecommendation: Exception', err);
      return { data: null, error: { message: err.message || 'Create failed' } };
    }
  },

  updateRecommendation: async (id, note) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    
    try {
      const { data, error } = await supabase
        .from('user_recommendations')
        .update({ recommendation_note: note })
        .eq('id', id)
        .select()
        .single();
      
      return { data, error };
    } catch (err) {
      console.error('updateRecommendation: Exception', err);
      return { data: null, error: { message: err.message || 'Update failed' } };
    }
  },

  deleteRecommendation: async (id) => {
    if (!supabase) return { error: null };
    
    try {
      const { error } = await supabase
        .from('user_recommendations')
        .delete()
        .eq('id', id);
      
      return { error };
    } catch (err) {
      console.error('deleteRecommendation: Exception', err);
      return { error: { message: err.message || 'Delete failed' } };
    }
  },

  createShareLink: async (recommendationId, recommenderName = null, referralCode = null) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    
    try {
      // Generate unique token
      const shareToken = Math.random().toString(36).substring(2, 15) + 
                        Math.random().toString(36).substring(2, 15);
      
      const insertData = {
        recommendation_id: recommendationId,
        share_token: shareToken
      };
      
      if (recommenderName) {
        insertData.recommender_name = recommenderName;
      }
      
      const { data, error } = await supabase
        .from('shared_recommendations')
        .insert(insertData)
        .select()
        .single();
      
      if (data) {
        // Build share URL with optional referral code for viral tracking
        let shareUrl = `${window.location.origin}/r/${shareToken}`;
        if (referralCode) {
          shareUrl += `?ref=${referralCode}`;
        }
        
        return {
          data: {
            ...data,
            shareUrl
          },
          error: null
        };
      }
      
      return { data: null, error };
    } catch (err) {
      console.error('createShareLink: Exception', err);
      return { data: null, error: { message: err.message || 'Share link creation failed' } };
    }
  },

  getSharedRecommendation: async (shareToken) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    
    try {
      if (import.meta.env.DEV) {
        console.log('[getSharedRecommendation] Looking up token:', shareToken);
      }
      
      const { data, error } = await supabase
        .from('shared_recommendations')
        .select(`
          id,
          share_token,
          recommendation_id,
          recommender_name,
          view_count,
          created_at,
          user_recommendations (
            book_title,
            book_author,
            book_isbn,
            book_description,
            recommendation_note,
            created_at
          )
        `)
        .eq('share_token', shareToken)
        .single();
      
      if (error) {
        console.error('[getSharedRecommendation] Query error:', error);
        return { data: null, error };
      }
      
      if (import.meta.env.DEV) {
        console.log('[getSharedRecommendation] Found data:', data);
      }
      
      // Increment view count
      if (data) {
        await supabase
          .from('shared_recommendations')
          .update({
            view_count: (data.view_count || 0) + 1,
            last_viewed_at: new Date().toISOString()
          })
          .eq('id', data.id);
      }
      
      return { data, error: null };
    } catch (err) {
      console.error('[getSharedRecommendation] Exception:', err);
      return { data: null, error: { message: err.message || 'Fetch failed' } };
    }
  },

  // Track when a shared recommendation is accepted (added to queue)
  markSharedRecommendationAccepted: async (shareToken, acceptedByUserId) => {
    if (!supabase) return { error: { message: 'Supabase not configured' } };
    
    try {
      const { error } = await supabase
        .from('shared_recommendations')
        .update({
          accepted_at: new Date().toISOString(),
          accepted_by: acceptedByUserId
        })
        .eq('share_token', shareToken);
      
      if (error) {
        console.error('[markSharedRecommendationAccepted] Error:', error);
      }
      return { error };
    } catch (err) {
      console.error('[markSharedRecommendationAccepted] Exception:', err);
      return { error: { message: err.message || 'Update failed' } };
    }
  },

  // Received Recommendations (Books Shared with Me)
  
  // Create a received recommendation entry when user views a shared link
  createReceivedRecommendation: async (userId, sharedRecommendationData) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    
    try {
      const { data, error } = await supabase
        .from('received_recommendations')
        .insert({
          recipient_user_id: userId,
          shared_recommendation_id: sharedRecommendationData.id,
          recommender_name: sharedRecommendationData.recommender_name || 'A friend',
          book_title: sharedRecommendationData.user_recommendations.book_title,
          book_author: sharedRecommendationData.user_recommendations.book_author,
          book_isbn: sharedRecommendationData.user_recommendations.book_isbn,
          book_description: sharedRecommendationData.user_recommendations.book_description,
          recommendation_note: sharedRecommendationData.user_recommendations.recommendation_note,
          status: 'pending'
        })
        .select()
        .single();
      
      return { data, error };
    } catch (err) {
      console.error('createReceivedRecommendation: Exception', err);
      return { data: null, error: { message: err.message || 'Create failed' } };
    }
  },

  // Get all received recommendations for a user
  getReceivedRecommendations: async (userId) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    
    try {
      const { data, error } = await supabase
        .from('received_recommendations')
        .select('*')
        .eq('recipient_user_id', userId)
        .order('received_at', { ascending: false });
      
      return { data, error };
    } catch (err) {
      console.error('getReceivedRecommendations: Exception', err);
      return { data: null, error: { message: err.message || 'Fetch failed' } };
    }
  },

  // Update received recommendation status
  updateReceivedRecommendationStatus: async (receivedRecId, status, additionalData = {}) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    
    try {
      const updateData = { status, ...additionalData };
      
      // Set appropriate timestamp based on status
      if (status === 'accepted' && !updateData.added_to_queue_at) {
        updateData.added_to_queue_at = new Date().toISOString();
      } else if (status === 'declined' && !updateData.declined_at) {
        updateData.declined_at = new Date().toISOString();
      } else if (status === 'archived' && !updateData.archived_at) {
        updateData.archived_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('received_recommendations')
        .update(updateData)
        .eq('id', receivedRecId)
        .select()
        .single();
      
      return { data, error };
    } catch (err) {
      console.error('updateReceivedRecommendationStatus: Exception', err);
      return { data: null, error: { message: err.message || 'Update failed' } };
    }
  },

  // Check if user already has this shared recommendation in their inbox
  checkReceivedRecommendationExists: async (userId, sharedRecommendationId) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    
    try {
      const { data, error } = await supabase
        .from('received_recommendations')
        .select('id, status')
        .eq('recipient_user_id', userId)
        .eq('shared_recommendation_id', sharedRecommendationId)
        .maybeSingle();
      
      return { data, error };
    } catch (err) {
      console.error('checkReceivedRecommendationExists: Exception', err);
      return { data: null, error: { message: err.message || 'Check failed' } };
    }
  },

  // Delete a received recommendation
  deleteReceivedRecommendation: async (receivedRecId) => {
    if (!supabase) return { error: null };
    
    try {
      const { error } = await supabase
        .from('received_recommendations')
        .delete()
        .eq('id', receivedRecId);
      
      return { error };
    } catch (err) {
      console.error('deleteReceivedRecommendation: Exception', err);
      return { error: { message: err.message || 'Delete failed' } };
    }
  },

  // Chat History operations
  getChatHistory: async (userId, sessionId = null) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    
    try {
      let query = supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }
      
      const { data, error } = await query;
      return { data, error };
    } catch (err) {
      console.error('getChatHistory: Exception', err);
      return { data: null, error: { message: err.message || 'Fetch failed' } };
    }
  },

  saveChatMessage: async (userId, sessionId, messageText, isUserMessage, chatMode) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .insert({
          user_id: userId,
          session_id: sessionId,
          message_text: messageText,
          is_user_message: isUserMessage,
          chat_mode: chatMode
        })
        .select()
        .single();
      
      return { data, error };
    } catch (err) {
      console.error('saveChatMessage: Exception', err);
      return { data: null, error: { message: err.message || 'Save failed' } };
    }
  },

  // Get user exclusion list (queries both tables directly for reliability)
  // Returns both titles and ISBNs for more reliable matching
  getUserExclusionList: async (userId) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    
    try {
      // Query both tables in parallel for speed - include ISBN for reliable matching
      const [queueResult, dismissedResult] = await Promise.all([
        supabase
          .from('reading_queue')
          .select('book_title, isbn')
          .eq('user_id', userId),
        supabase
          .from('dismissed_recommendations')
          .select('book_title')
          .eq('user_id', userId)
      ]);
      
      if (queueResult.error) {
        console.error('getUserExclusionList: Queue error', queueResult.error);
      }
      if (dismissedResult.error) {
        console.error('getUserExclusionList: Dismissed error', dismissedResult.error);
      }
      
      // Combine and deduplicate - use ISBN when available, fallback to title
      const queueTitles = queueResult.data?.map(row => row.book_title) || [];
      const queueISBNs = queueResult.data?.filter(row => row.isbn).map(row => row.isbn) || [];
      const dismissedTitles = dismissedResult.data?.map(row => row.book_title) || [];
      const allTitles = [...new Set([...queueTitles, ...dismissedTitles])];
      
      if (import.meta.env.DEV) {
        console.log(`[ExclusionList] Queue: ${queueTitles.length}, ISBNs: ${queueISBNs.length}, Dismissed: ${dismissedTitles.length}, Total: ${allTitles.length}`);
      }
      
      // Return both titles and ISBNs for comprehensive matching
      return { 
        data: allTitles, 
        isbns: queueISBNs,
        error: null 
      };
    } catch (err) {
      console.error('getUserExclusionList: Exception', err);
      return { data: null, error: { message: err.message || 'Fetch failed' } };
    }
  },

  // Dismissed Recommendations operations
  addDismissedRecommendation: async (userId, bookTitle, bookAuthor) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    
    try {
      const { data, error } = await supabase
        .from('dismissed_recommendations')
        .insert({
          user_id: userId,
          book_title: bookTitle,
          book_author: bookAuthor
        })
        .select();
      
      if (error) {
        console.error('addDismissedRecommendation: Error', error);
        return { data: null, error };
      }
      
      return { data: data?.[0], error: null };
    } catch (err) {
      console.error('addDismissedRecommendation: Exception', err);
      return { data: null, error: { message: err.message || 'Insert failed' } };
    }
  },

  deleteChatHistory: async (userId, sessionId = null) => {
    if (!supabase) return { error: null };
    
    try {
      let query = supabase
        .from('chat_history')
        .delete()
        .eq('user_id', userId);
      
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }
      
      const { error } = await query;
      return { error };
    } catch (err) {
      console.error('deleteChatHistory: Exception', err);
      return { error: { message: err.message || 'Delete failed' } };
    }
  },

  // Beta Testers operations
  createBetaTester: async ({ user_id, email, name, interested_features, feedback }) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    
    try {
      const { data, error } = await supabase
        .from('beta_testers')
        .insert({
          user_id,
          email,
          name,
          interested_features,
          feedback
        })
        .select()
        .single();
      
      if (error) {
        console.error('createBetaTester: Error', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (err) {
      console.error('createBetaTester: Exception', err);
      return { data: null, error: { message: err.message || 'Insert failed' } };
    }
  },
};
