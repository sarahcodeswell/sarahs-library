import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../lib/supabase';
import { setUserContext, clearUserContext } from '../lib/sentry';

const UserContext = createContext(null);

// User types
const USER_TYPES = {
  READER: 'reader',
  CURATOR: 'curator', 
  ADMIN: 'admin'
};

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(USER_TYPES.READER);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Fetch user type from taste_profiles
  const fetchUserType = async (userId) => {
    if (!userId) {
      setUserType(USER_TYPES.READER);
      return;
    }
    try {
      const { data: profile } = await db.getTasteProfile(userId);
      // Default to reader if no user_type set
      setUserType(profile?.user_type || USER_TYPES.READER);
    } catch (error) {
      console.error('Error fetching user type:', error);
      setUserType(USER_TYPES.READER);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const currentUser = await auth.getUser();
        if (mounted) {
          setUser(currentUser);
          if (currentUser) {
            setUserContext(currentUser);
            fetchUserType(currentUser.id);
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
          fetchUserType(newUser.id);
          
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
          setUserType(USER_TYPES.READER);
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
    setUserType(USER_TYPES.READER);
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

  // Helper functions for user type checks
  const isAdmin = userType === USER_TYPES.ADMIN;
  const isCurator = userType === USER_TYPES.CURATOR;
  const isReader = userType === USER_TYPES.READER;

  const value = {
    user,
    userType,
    isAdmin,
    isCurator,
    isReader,
    authLoading,
    showAuthModal,
    setShowAuthModal,
    signOut,
    updateUserMetadata,
    refreshUserType: () => fetchUserType(user?.id),
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
