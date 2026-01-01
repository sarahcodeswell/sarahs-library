import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../lib/supabase';
import { useUser } from './UserContext';

const RecommendationContext = createContext(null);

export function RecommendationProvider({ children }) {
  const { user } = useUser();
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user's recommendations
  const fetchRecommendations = useCallback(async () => {
    if (!user) {
      setRecommendations([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await db.getUserRecommendations(user.id);
      if (error) {
        console.error('Error fetching recommendations:', error);
      } else {
        setRecommendations(data || []);
      }
    } catch (err) {
      console.error('Exception fetching recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load recommendations when user changes
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Create a new recommendation
  const createRecommendation = useCallback(async (book, note) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await db.createRecommendation(user.id, book, note);
    
    if (error) {
      return { success: false, error: error.message };
    }

    // Refresh recommendations list
    await fetchRecommendations();
    
    return { success: true, data };
  }, [user, fetchRecommendations]);

  // Update a recommendation
  const updateRecommendation = useCallback(async (id, note) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await db.updateRecommendation(id, note);
    
    if (error) {
      return { success: false, error: error.message };
    }

    // Refresh recommendations list
    await fetchRecommendations();
    
    return { success: true, data };
  }, [user, fetchRecommendations]);

  // Delete a recommendation
  const deleteRecommendation = useCallback(async (id) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await db.deleteRecommendation(id);
    
    if (error) {
      return { success: false, error: error.message };
    }

    // Refresh recommendations list
    await fetchRecommendations();
    
    return { success: true };
  }, [user, fetchRecommendations]);

  // Create or get share link
  const getShareLink = useCallback(async (recommendationId) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    // Check if share link already exists
    const recommendation = recommendations.find(r => r.id === recommendationId);
    if (recommendation?.shared_recommendations?.[0]?.share_token) {
      const shareUrl = `${window.location.origin}/r/${recommendation.shared_recommendations[0].share_token}`;
      return { success: true, data: { shareUrl } };
    }

    // Get user's display name for the share
    const recommenderName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'A friend';

    // Create new share link with recommender name
    const { data, error } = await db.createShareLink(recommendationId, recommenderName);
    
    if (error) {
      return { success: false, error: error.message };
    }

    // Refresh recommendations list to get the new share link
    await fetchRecommendations();
    
    return { success: true, data };
  }, [user, recommendations, fetchRecommendations]);

  const value = {
    recommendations,
    isLoading,
    createRecommendation,
    updateRecommendation,
    deleteRecommendation,
    getShareLink,
    refreshRecommendations: fetchRecommendations,
  };

  return (
    <RecommendationContext.Provider value={value}>
      {children}
    </RecommendationContext.Provider>
  );
}

export function useRecommendations() {
  const context = useContext(RecommendationContext);
  if (!context) {
    throw new Error('useRecommendations must be used within RecommendationProvider');
  }
  return context;
}
