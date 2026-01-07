import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { db } from '../lib/supabase';
import { useUser } from './UserContext';

const ReceivedRecommendationsContext = createContext();

export function ReceivedRecommendationsProvider({ children }) {
  const { user } = useUser();
  const [receivedRecommendations, setReceivedRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all received recommendations
  const fetchReceivedRecommendations = useCallback(async () => {
    if (!user) {
      setReceivedRecommendations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await db.getReceivedRecommendations(user.id);
    
    if (error) {
      console.error('Error fetching received recommendations:', error);
      setReceivedRecommendations([]);
    } else {
      setReceivedRecommendations(data || []);
    }
    
    setIsLoading(false);
  }, [user]);

  // Load recommendations when user changes
  useEffect(() => {
    fetchReceivedRecommendations();
  }, [fetchReceivedRecommendations]);

  // Accept a recommendation (add to queue)
  const acceptRecommendation = useCallback(async (receivedRecId, addToQueueCallback) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      // Call the provided callback to add to queue
      const queueResult = await addToQueueCallback();
      
      if (!queueResult.success) {
        return { success: false, error: queueResult.error };
      }

      // Update status to accepted
      const { data, error } = await db.updateReceivedRecommendationStatus(
        receivedRecId, 
        'accepted',
        { added_to_queue_at: new Date().toISOString() }
      );

      if (error) {
        console.error('Error updating received recommendation:', error);
        return { success: false, error: error.message };
      }

      // Refresh list
      await fetchReceivedRecommendations();
      
      return { success: true, data };
    } catch (err) {
      console.error('Error accepting recommendation:', err);
      return { success: false, error: err.message };
    }
  }, [user, fetchReceivedRecommendations]);

  // Decline a recommendation
  const declineRecommendation = useCallback(async (receivedRecId) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await db.updateReceivedRecommendationStatus(
      receivedRecId, 
      'declined'
    );

    if (error) {
      console.error('Error declining recommendation:', error);
      return { success: false, error: error.message };
    }

    // Refresh list
    await fetchReceivedRecommendations();
    
    return { success: true, data };
  }, [user, fetchReceivedRecommendations]);

  // Archive a recommendation
  const archiveRecommendation = useCallback(async (receivedRecId) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await db.updateReceivedRecommendationStatus(
      receivedRecId, 
      'archived'
    );

    if (error) {
      console.error('Error archiving recommendation:', error);
      return { success: false, error: error.message };
    }

    // Refresh list
    await fetchReceivedRecommendations();
    
    return { success: true, data };
  }, [user, fetchReceivedRecommendations]);

  // Delete a recommendation
  const deleteRecommendation = useCallback(async (receivedRecId) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await db.deleteReceivedRecommendation(receivedRecId);

    if (error) {
      console.error('Error deleting recommendation:', error);
      return { success: false, error: error.message };
    }

    // Refresh list
    await fetchReceivedRecommendations();
    
    return { success: true };
  }, [user, fetchReceivedRecommendations]);

  // Get counts by status
  const getCounts = useCallback(() => {
    const pending = receivedRecommendations.filter(r => r.status === 'pending').length;
    const accepted = receivedRecommendations.filter(r => r.status === 'accepted').length;
    const declined = receivedRecommendations.filter(r => r.status === 'declined').length;
    
    return { pending, accepted, declined, total: receivedRecommendations.length };
  }, [receivedRecommendations]);

  const value = {
    receivedRecommendations,
    isLoading,
    acceptRecommendation,
    declineRecommendation,
    archiveRecommendation,
    deleteRecommendation,
    refreshReceivedRecommendations: fetchReceivedRecommendations,
    getCounts,
  };

  return (
    <ReceivedRecommendationsContext.Provider value={value}>
      {children}
    </ReceivedRecommendationsContext.Provider>
  );
}

export function useReceivedRecommendations() {
  const context = useContext(ReceivedRecommendationsContext);
  if (!context) {
    throw new Error('useReceivedRecommendations must be used within ReceivedRecommendationsProvider');
  }
  return context;
}
