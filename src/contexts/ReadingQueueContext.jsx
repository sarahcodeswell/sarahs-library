import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../lib/supabase';
import { useUser } from './UserContext';
import logger from '../lib/logger';

const ReadingQueueContext = createContext(null);

export function ReadingQueueProvider({ children }) {
  const { user } = useUser();
  const [readingQueue, setReadingQueue] = useState([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  const loadReadingQueue = useCallback(async () => {
    if (!user) {
      setReadingQueue([]);
      return;
    }

    setIsLoadingQueue(true);
    try {
      const { data, error } = await db.getReadingQueue(user.id);
      if (error) {
        console.error('Error loading reading queue:', error);
      } else {
        setReadingQueue(data || []);
      }
    } catch (err) {
      console.error('Exception loading reading queue:', err);
    } finally {
      setIsLoadingQueue(false);
    }
  }, [user]);

  useEffect(() => {
    loadReadingQueue();
    
    // Check for pending recommendation from shared link after sign-up
    if (user) {
      const pendingRec = sessionStorage.getItem('pendingRecommendation');
      if (pendingRec) {
        try {
          const bookData = JSON.parse(pendingRec);
          sessionStorage.removeItem('pendingRecommendation');
          // Add to queue after a short delay to ensure queue is loaded
          setTimeout(async () => {
            await db.addToReadingQueue(user.id, {
              title: bookData.book_title,
              author: bookData.book_author,
              status: 'want_to_read',
              description: bookData.book_description
            });
            loadReadingQueue();
          }, 500);
        } catch (err) {
          console.error('Error processing pending recommendation:', err);
          sessionStorage.removeItem('pendingRecommendation');
        }
      }
    }
  }, [loadReadingQueue, user]);

  const addToQueue = useCallback(async (book) => {
    if (!user) {
      console.error('addToQueue: No user logged in');
      return { success: false, error: 'Not authenticated' };
    }

    logger.tagged('addToQueue', 'Adding book with data:', book);

    const optimisticBook = {
      id: `temp-${Date.now()}`,
      user_id: user.id,
      book_title: book.title,
      book_author: book.author,
      status: book.status || 'want_to_read',
      added_at: new Date().toISOString(),
      description: book.description || null,
      why_recommended: book.why || null,
    };

    setReadingQueue(prev => [optimisticBook, ...prev]);

    try {
      const { data, error } = await db.addToReadingQueue(user.id, book);
      
      if (error) {
        console.error('addToQueue: Database error', error);
        setReadingQueue(prev => prev.filter(b => b.id !== optimisticBook.id));
        return { success: false, error: error.message };
      }

      setReadingQueue(prev => 
        prev.map(b => b.id === optimisticBook.id ? data[0] : b)
      );

      return { success: true, data: data[0] };
    } catch (err) {
      console.error('addToQueue: Exception', err);
      setReadingQueue(prev => prev.filter(b => b.id !== optimisticBook.id));
      return { success: false, error: err.message };
    }
  }, [user]);

  const removeFromQueue = useCallback(async (bookId) => {
    const bookToRemove = readingQueue.find(b => b.id === bookId);
    if (!bookToRemove) return { success: false };

    setReadingQueue(prev => prev.filter(b => b.id !== bookId));

    try {
      const { error } = await db.removeFromReadingQueue(bookId);
      
      if (error) {
        console.error('removeFromQueue: Database error', error);
        setReadingQueue(prev => [...prev, bookToRemove]);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('removeFromQueue: Exception', err);
      setReadingQueue(prev => [...prev, bookToRemove]);
      return { success: false, error: err.message };
    }
  }, [readingQueue]);

  const updateQueueStatus = useCallback(async (bookId, status) => {
    const bookToUpdate = readingQueue.find(b => b.id === bookId);
    if (!bookToUpdate) return { success: false };

    const previousStatus = bookToUpdate.status;
    setReadingQueue(prev => 
      prev.map(b => b.id === bookId ? { ...b, status } : b)
    );

    try {
      const { data, error } = await db.updateReadingQueueStatus(bookId, status);
      
      if (error) {
        console.error('updateQueueStatus: Database error', error);
        setReadingQueue(prev => 
          prev.map(b => b.id === bookId ? { ...b, status: previousStatus } : b)
        );
        return { success: false, error: error.message };
      }

      return { success: true, data: data[0] };
    } catch (err) {
      console.error('updateQueueStatus: Exception', err);
      setReadingQueue(prev => 
        prev.map(b => b.id === bookId ? { ...b, status: previousStatus } : b)
      );
      return { success: false, error: err.message };
    }
  }, [readingQueue]);

  const updateQueueItem = useCallback(async (bookId, updates) => {
    const bookToUpdate = readingQueue.find(b => b.id === bookId);
    if (!bookToUpdate) return { success: false };

    const previousBook = { ...bookToUpdate };
    setReadingQueue(prev => 
      prev.map(b => b.id === bookId ? { ...b, ...updates } : b)
    );

    try {
      const { data, error } = await db.updateReadingQueueItem(bookId, updates);
      
      if (error) {
        console.error('updateQueueItem: Database error', error);
        setReadingQueue(prev => 
          prev.map(b => b.id === bookId ? previousBook : b)
        );
        return { success: false, error: error.message };
      }

      return { success: true, data: data[0] };
    } catch (err) {
      console.error('updateQueueItem: Exception', err);
      setReadingQueue(prev => 
        prev.map(b => b.id === bookId ? previousBook : b)
      );
      return { success: false, error: err.message };
    }
  }, [readingQueue]);

  const value = {
    readingQueue,
    isLoadingQueue,
    addToQueue,
    removeFromQueue,
    updateQueueStatus,
    updateQueueItem,
    refreshQueue: loadReadingQueue,
  };

  return (
    <ReadingQueueContext.Provider value={value}>
      {children}
    </ReadingQueueContext.Provider>
  );
}

export function useReadingQueue() {
  const context = useContext(ReadingQueueContext);
  if (!context) {
    // Return safe defaults instead of throwing to prevent crashes
    return {
      readingQueue: [],
      isLoadingQueue: false,
      addToQueue: async () => ({ success: false, error: 'Context not available' }),
      removeFromQueue: async () => ({ success: false, error: 'Context not available' }),
      updateQueueStatus: async () => ({ success: false, error: 'Context not available' }),
      updateQueueItem: async () => ({ success: false, error: 'Context not available' }),
      refreshQueue: async () => {}
    };
  }
  return context;
}
