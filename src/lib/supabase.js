// Supabase client configuration
// Install: npm install @supabase/supabase-js

import { createClient } from '@supabase/supabase-js';

// These will come from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Only create client if we have valid credentials
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
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
    const { data, error } = await supabase
      .from('reading_queue')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false });
    return { data, error };
  },

  addToReadingQueue: async (userId, book) => {
    if (!supabase) return { data: null, error: null };
    const { data, error } = await supabase
      .from('reading_queue')
      .insert({
        user_id: userId,
        book_title: book.title,
        book_author: book.author,
        status: 'want_to_read',
        added_at: new Date().toISOString(),
      });
    return { data, error };
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
      .eq('id', id);
    return { data, error };
  },
};
