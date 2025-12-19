// Supabase client configuration
// Install: npm install @supabase/supabase-js

import { createClient } from '@supabase/supabase-js';

// These will come from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export const auth = {
  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Database helpers
export const db = {
  // Taste Profile operations
  getTasteProfile: async (userId) => {
    const { data, error } = await supabase
      .from('taste_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    return { data, error };
  },

  upsertTasteProfile: async (userId, profile) => {
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
    const { data, error } = await supabase
      .from('reading_queue')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false });
    return { data, error };
  },

  addToReadingQueue: async (userId, book) => {
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
    const { error } = await supabase
      .from('reading_queue')
      .delete()
      .eq('id', id);
    return { error };
  },

  updateReadingQueueStatus: async (id, status) => {
    const { data, error } = await supabase
      .from('reading_queue')
      .update({ status })
      .eq('id', id);
    return { data, error };
  },
};
