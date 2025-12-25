import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../lib/supabase';
import { useUser } from './UserContext';

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
  }, [loadReadingQueue]);

  const addToQueue = useCallback(async (book) => {
    if (!user) {
      console.error('addToQueue: No user logged in');
      return { success: false, error: 'Not authenticated' };
    }

    const optimisticBook = {
      id: `temp-${Date.now()}`,
      user_id: user.id,
      book_title: book.title,
      book_author: book.author,
      status: book.status || 'want_to_read',
      added_at: new Date().toISOString(),
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

  const value = {
    readingQueue,
    isLoadingQueue,
    addToQueue,
    removeFromQueue,
    updateQueueStatus,
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
    throw new Error('useReadingQueue must be used within a ReadingQueueProvider');
  }
  return context;
}
