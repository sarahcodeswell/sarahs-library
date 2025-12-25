import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../lib/supabase';
import { useUser } from './UserContext';

const UserBooksContext = createContext(null);

export function UserBooksProvider({ children }) {
  const { user } = useUser();
  const [userBooks, setUserBooks] = useState([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);

  const loadUserBooks = useCallback(async () => {
    if (!user) {
      setUserBooks([]);
      return;
    }

    setIsLoadingBooks(true);
    try {
      const { data, error } = await db.getUserBooks(user.id);
      if (error) {
        console.error('Error loading user books:', error);
      } else {
        setUserBooks(data || []);
      }
    } catch (err) {
      console.error('Exception loading user books:', err);
    } finally {
      setIsLoadingBooks(false);
    }
  }, [user]);

  useEffect(() => {
    loadUserBooks();
  }, [loadUserBooks]);

  const addBook = useCallback(async (book) => {
    if (!user) {
      console.error('addBook: No user logged in');
      return { success: false, error: 'Not authenticated' };
    }

    const optimisticBook = {
      id: `temp-${Date.now()}`,
      user_id: user.id,
      book_title: book.title,
      book_author: book.author,
      isbn: book.isbn || null,
      cover_image_url: book.coverImageUrl || null,
      added_via: book.addedVia || 'manual',
      notes: book.notes || null,
      added_at: new Date().toISOString(),
    };

    setUserBooks(prev => [optimisticBook, ...prev]);

    try {
      const { data, error } = await db.addUserBook(user.id, book);
      
      if (error) {
        console.error('addBook: Database error', error);
        setUserBooks(prev => prev.filter(b => b.id !== optimisticBook.id));
        return { success: false, error: error.message };
      }

      setUserBooks(prev => 
        prev.map(b => b.id === optimisticBook.id ? data[0] : b)
      );

      return { success: true, data: data[0] };
    } catch (err) {
      console.error('addBook: Exception', err);
      setUserBooks(prev => prev.filter(b => b.id !== optimisticBook.id));
      return { success: false, error: err.message };
    }
  }, [user]);

  const removeBook = useCallback(async (bookId) => {
    const bookToRemove = userBooks.find(b => b.id === bookId);
    if (!bookToRemove) return { success: false };

    setUserBooks(prev => prev.filter(b => b.id !== bookId));

    try {
      const { error } = await db.removeUserBook(bookId);
      
      if (error) {
        console.error('removeBook: Database error', error);
        setUserBooks(prev => [...prev, bookToRemove]);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('removeBook: Exception', err);
      setUserBooks(prev => [...prev, bookToRemove]);
      return { success: false, error: err.message };
    }
  }, [userBooks]);

  const updateBook = useCallback(async (bookId, updates) => {
    const bookToUpdate = userBooks.find(b => b.id === bookId);
    if (!bookToUpdate) return { success: false };

    const previousBook = { ...bookToUpdate };
    setUserBooks(prev => 
      prev.map(b => b.id === bookId ? { ...b, ...updates } : b)
    );

    try {
      const { data, error } = await db.updateUserBook(bookId, updates);
      
      if (error) {
        console.error('updateBook: Database error', error);
        setUserBooks(prev => 
          prev.map(b => b.id === bookId ? previousBook : b)
        );
        return { success: false, error: error.message };
      }

      return { success: true, data: data[0] };
    } catch (err) {
      console.error('updateBook: Exception', err);
      setUserBooks(prev => 
        prev.map(b => b.id === bookId ? previousBook : b)
      );
      return { success: false, error: err.message };
    }
  }, [userBooks]);

  const value = {
    userBooks,
    isLoadingBooks,
    addBook,
    removeBook,
    updateBook,
    refreshBooks: loadUserBooks,
  };

  return (
    <UserBooksContext.Provider value={value}>
      {children}
    </UserBooksContext.Provider>
  );
}

export function useUserBooks() {
  const context = useContext(UserBooksContext);
  if (!context) {
    throw new Error('useUserBooks must be used within a UserBooksProvider');
  }
  return context;
}
