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
        flowType: 'pkce'
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
        liked_books: profile.likedBooks,
        liked_themes: profile.likedThemes,
        liked_authors: profile.likedAuthors,
        updated_at: new Date().toISOString(),
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
        
        console.log(`getReadingQueue: Retry attempt ${attempts + 1}/${maxAttempts}`);
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
    
    // Check for duplicates first
    const { data: existing } = await supabase
      .from('reading_queue')
      .select('id')
      .eq('user_id', userId)
      .eq('book_title', book.title)
      .eq('book_author', book.author)
      .single();
    
    if (existing) {
      console.log('addToReadingQueue: Book already in queue');
      return { data: existing, error: null };
    }
    
    console.log('addToReadingQueue: Starting insert for', { userId, book });
    
    try {
      const { data, error } = await supabase
        .from('reading_queue')
        .insert({
          user_id: userId,
          book_title: book.title,
          book_author: book.author,
          status: 'want_to_read',
          added_at: new Date().toISOString(),
        })
        .select();
      
      console.log('addToReadingQueue: Insert complete', { data, error });
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
};
