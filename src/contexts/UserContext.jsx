import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/supabase';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const currentUser = await auth.getUser();
        if (mounted) {
          setUser(currentUser);
          setAuthLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await auth.signOut();
    setUser(null);
  };

  const value = {
    user,
    authLoading,
    showAuthModal,
    setShowAuthModal,
    signOut,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
