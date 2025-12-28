// Supabase client configuration
// Install: npm install @supabase/supabase-js

import { createClient } from '@supabase/supabase-js';

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

  getUser: async () => {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
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
    const { data, error } = await supabase
      .from('taste_profiles')
      .upsert({
        user_id: userId,
        liked_books: profile.likedBooks || [],
        liked_themes: profile.likedThemes || [],
        liked_authors: profile.likedAuthors || [],
        profile_photo_url: profile.profile_photo_url || null,
        favorite_authors: profile.favorite_authors || [],
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
    
    try {
      const { data, error } = await supabase
        .from('reading_queue')
        .insert({
          user_id: userId,
          book_title: book.title,
          book_author: book.author,
          status: book.status || 'want_to_read',
          added_at: new Date().toISOString(),
        })
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
    if (!supabase) return { data: null, error: null };
    const { data, error } = await supabase
      .from('reading_queue')
      .update({ status })
      .eq('id', id)
      .select();
    return { data, error };
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
      const { data, error } = await supabase
        .from('user_books')
        .update({
          book_title: updates.title,
          book_author: updates.author,
          isbn: updates.isbn,
          cover_image_url: updates.coverImageUrl,
          notes: updates.notes,
        })
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

  createRecommendation: async (userId, book, note) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    
    try {
      const { data, error } = await supabase
        .from('user_recommendations')
        .insert({
          user_id: userId,
          book_title: book.book_title || book.title,
          book_author: book.book_author || book.author,
          book_isbn: book.isbn || null,
          recommendation_note: note,
          is_from_collection: true
        })
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

  createShareLink: async (recommendationId) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    
    try {
      // Generate unique token
      const shareToken = Math.random().toString(36).substring(2, 15) + 
                        Math.random().toString(36).substring(2, 15);
      
      const { data, error } = await supabase
        .from('shared_recommendations')
        .insert({
          recommendation_id: recommendationId,
          share_token: shareToken
        })
        .select()
        .single();
      
      if (data) {
        return {
          data: {
            ...data,
            shareUrl: `${window.location.origin}/r/${shareToken}`
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
      const { data, error } = await supabase
        .from('shared_recommendations')
        .select(`
          *,
          user_recommendations (
            book_title,
            book_author,
            book_isbn,
            recommendation_note,
            created_at
          )
        `)
        .eq('share_token', shareToken)
        .single();
      
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
      
      return { data, error };
    } catch (err) {
      console.error('getSharedRecommendation: Exception', err);
      return { data: null, error: { message: err.message || 'Fetch failed' } };
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

  // Get user exclusion list (optimized with materialized view)
  getUserExclusionList: async (userId) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    
    try {
      const { data, error } = await supabase
        .from('user_exclusion_list')
        .select('book_title')
        .eq('user_id', userId);
      
      if (error) {
        console.error('getUserExclusionList: Error', error);
        return { data: null, error };
      }
      
      // Return just the book titles as an array
      const titles = data?.map(row => row.book_title) || [];
      return { data: titles, error: null };
    } catch (err) {
      console.error('getUserExclusionList: Exception', err);
      return { data: null, error: { message: err.message || 'Fetch failed' } };
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
};
