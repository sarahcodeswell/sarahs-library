import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/supabase';
import { setUserContext, clearUserContext } from '../lib/sentry';

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
          if (currentUser) {
            setUserContext(currentUser);
          }
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

    const { data: { subscription } } = auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        const newUser = session?.user ?? null;
        setUser(newUser);
        if (newUser) {
          setUserContext(newUser);
          
          // Check for referral code and record it for new signups
          if (_event === 'SIGNED_IN' || _event === 'SIGNED_UP') {
            const referralCode = localStorage.getItem('referral_code');
            if (referralCode) {
              try {
                await fetch('/api/record-referral', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    referralCode,
                    newUserId: newUser.id,
                    newUserEmail: newUser.email
                  })
                });
                // Clear the referral code after recording
                localStorage.removeItem('referral_code');
              } catch (error) {
                console.error('Failed to record referral:', error);
              }
            }
          }
        } else {
          clearUserContext();
        }
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
    clearUserContext();
  };

  const updateUserMetadata = async (metadata) => {
    if (user) {
      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          ...metadata
        }
      });
    }
  };

  const value = {
    user,
    authLoading,
    showAuthModal,
    setShowAuthModal,
    signOut,
    updateUserMetadata,
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
