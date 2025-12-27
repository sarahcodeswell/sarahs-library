import React, { useState, useEffect } from 'react';
import { User, LogOut, Save, Camera, X, Plus, BookMarked, BookOpen, Heart } from 'lucide-react';
import { useUser, useReadingQueue } from '../contexts';
import { db, supabase, auth } from '../lib/supabase';

export default function UserProfile({ tasteProfile }) {
  const { user, signOut, updateUserMetadata } = useUser();
  const { readingQueue } = useReadingQueue();
  const [readingPreferences, setReadingPreferences] = useState('');
  const [favoriteAuthors, setFavoriteAuthors] = useState([]);
  const [newAuthor, setNewAuthor] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [stats, setStats] = useState({
    collectionCount: 0,
    queueCount: 0,
    recommendationsCount: 0
  });

  // Load existing preferences and profile data on mount
  useEffect(() => {
    if (user?.user_metadata?.reading_preferences) {
      setReadingPreferences(user.user_metadata.reading_preferences);
    }
    loadProfileData();
    loadStats();
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await db.getTasteProfile(user.id);
      if (profile) {
        setFavoriteAuthors(profile.favorite_authors || []);
        setProfilePhotoUrl(profile.profile_photo_url);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadStats = async () => {
    if (!user) return;
    
    try {
      console.log('[Profile] Loading stats for user:', user.id);
      // Get reading queue data
      const { data: queue, error: queueError } = await db.getReadingQueue(user.id);
      if (queueError) {
        console.error('[Profile] Error loading reading queue:', queueError);
      }
      console.log('[Profile] Reading queue loaded:', { total: queue?.length, queue });
      
      // Collection = books marked as 'finished' (matches My Collection page logic)
      const finishedBooks = queue?.filter(item => item.status === 'finished') || [];
      
      // Queue = books marked as 'want_to_read' or 'reading'
      const queueBooks = queue?.filter(item => 
        item.status === 'want_to_read' || item.status === 'reading'
      ) || [];
      
      // Get recommendations count
      const { data: recommendations } = await db.getUserRecommendations(user.id);
      
      const stats = {
        collectionCount: finishedBooks.length,
        queueCount: queueBooks.length,
        recommendationsCount: recommendations?.length || 0
      };
      console.log('[Profile] Stats calculated:', stats);
      console.log('[Profile] Finished books:', finishedBooks.map(b => ({ title: b.book_title, status: b.status })));
      console.log('[Profile] Queue books:', queueBooks.map(b => ({ title: b.book_title, status: b.status })));
      setStats(stats);
    } catch (error) {
      console.error('[Profile] Error loading stats:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    console.log('[Profile] Photo upload started:', { file: file?.name, size: file?.size, type: file?.type, userId: user?.id });
    if (!file || !user) {
      console.error('[Profile] Photo upload failed: missing file or user');
      return;
    }

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      setSaveMessage('Please upload an image file');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSaveMessage('Image must be less than 5MB');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setIsUploadingPhoto(true);
    setSaveMessage('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      console.log('[Profile] Uploading to storage:', fileName);
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error('[Profile] Storage upload error:', uploadError);
        throw uploadError;
      }
      console.log('[Profile] Storage upload successful');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      // Update profile with photo URL
      const currentProfile = tasteProfile || {};
      console.log('[Profile] Updating taste profile with photo URL:', { publicUrl, currentProfile });
      const result = await db.upsertTasteProfile(user.id, {
        ...currentProfile,
        profile_photo_url: publicUrl
      });
      console.log('[Profile] Taste profile update result:', result);

      setProfilePhotoUrl(publicUrl);
      setSaveMessage('Photo uploaded successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error uploading photo:', error);
      setSaveMessage('Failed to upload photo. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleAddAuthor = async () => {
    if (!newAuthor.trim() || !user) return;
    
    const authorToAdd = newAuthor.trim();
    if (favoriteAuthors.includes(authorToAdd)) {
      setSaveMessage('Author already in your favorites');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    const updatedAuthors = [...favoriteAuthors, authorToAdd];
    setFavoriteAuthors(updatedAuthors);
    setNewAuthor('');

    try {
      const currentProfile = tasteProfile || {};
      await db.upsertTasteProfile(user.id, {
        ...currentProfile,
        favorite_authors: updatedAuthors
      });
      setSaveMessage('Author added!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error adding author:', error);
      setSaveMessage('Failed to add author');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleRemoveAuthor = async (authorToRemove) => {
    if (!user) return;
    
    const updatedAuthors = favoriteAuthors.filter(a => a !== authorToRemove);
    setFavoriteAuthors(updatedAuthors);

    try {
      const currentProfile = tasteProfile || {};
      await db.upsertTasteProfile(user.id, {
        ...currentProfile,
        favorite_authors: updatedAuthors
      });
    } catch (error) {
      console.error('Error removing author:', error);
    }
  };

  const handleSavePreferences = async () => {
    if (!readingPreferences.trim()) {
      setSaveMessage('Please enter your reading preferences');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    try {
      console.log('[Profile] Saving reading preferences:', readingPreferences.substring(0, 50) + '...');
      const { data, error } = await auth.updateUser({
        data: { reading_preferences: readingPreferences }
      });

      if (error) {
        console.error('[Profile] Auth update error:', error);
        throw error;
      }
      console.log('[Profile] Auth update successful:', data?.user?.user_metadata);

      // Update local user context
      if (updateUserMetadata) {
        console.log('[Profile] Updating local user context');
        updateUserMetadata({ reading_preferences: readingPreferences });
      } else {
        console.warn('[Profile] updateUserMetadata not available');
      }

      setSaveMessage('Saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSaveMessage('Failed to save. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header with Photo */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            {profilePhotoUrl ? (
              <img
                src={profilePhotoUrl}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover border-2 border-[#E8EBE4]"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#5F7252] to-[#7A8F6C] flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
            )}
            <label
              htmlFor="photo-upload"
              className="absolute bottom-0 right-0 w-7 h-7 bg-white border border-[#D4DAD0] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#F8F6EE] transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-[#5F7252]" />
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={isUploadingPhoto}
                className="hidden"
              />
            </label>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-[#4A5940] truncate">{user.email}</h3>
            <p className="text-xs text-[#96A888]">Member since {new Date(user.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* User Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[#F8F6EE] rounded-lg p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <BookOpen className="w-4 h-4 text-[#5F7252]" />
            </div>
            <div className="text-lg font-semibold text-[#4A5940]">{stats.collectionCount}</div>
            <div className="text-xs text-[#7A8F6C]">Collection</div>
          </div>
          <div className="bg-[#F8F6EE] rounded-lg p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <BookMarked className="w-4 h-4 text-[#5F7252]" />
            </div>
            <div className="text-lg font-semibold text-[#4A5940]">{stats.queueCount}</div>
            <div className="text-xs text-[#7A8F6C]">Reading Queue</div>
          </div>
          <div className="bg-[#F8F6EE] rounded-lg p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <Heart className="w-4 h-4 text-[#5F7252]" />
            </div>
            <div className="text-lg font-semibold text-[#4A5940]">{stats.recommendationsCount}</div>
            <div className="text-xs text-[#7A8F6C]">Shared</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#D4DAD0] hover:bg-[#F8F6EE] text-[#5F7252] rounded-lg transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Reading taste preferences */}
      <div className="pt-6 border-t border-[#E8EBE4]">
        <h4 className="text-sm font-medium text-[#5F7252] mb-2">Reading Preferences</h4>
        <p className="text-xs text-[#96A888] mb-3">
          Share your reading tastes, favorite genres, themes, or what you're looking for in your next book.
        </p>
        <textarea
          value={readingPreferences}
          onChange={(e) => setReadingPreferences(e.target.value)}
          placeholder="e.g., I love historical fiction with strong female leads, especially stories set in the 20th century. I'm also interested in memoirs about resilience and personal growth..."
          className="w-full px-3 py-2.5 rounded-lg border border-[#D4DAD0] bg-white text-[#4A5940] placeholder-[#96A888] text-sm focus:outline-none focus:ring-2 focus:ring-[#5F7252] focus:border-transparent resize-none"
          rows={6}
        />
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={handleSavePreferences}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
          {saveMessage && (
            <span className={`text-xs ${
              saveMessage.includes('success') || saveMessage.includes('added') || saveMessage.includes('uploaded') 
                ? 'text-[#5F7252]' 
                : 'text-red-500'
            }`}>
              {saveMessage}
            </span>
          )}
        </div>
      </div>


      {/* Favorite Authors */}
      <div className="pt-6 border-t border-[#E8EBE4]">
        <h4 className="text-sm font-medium text-[#5F7252] mb-2">Favorite Authors</h4>
        <p className="text-xs text-[#96A888] mb-3">
          Add your favorite authors to get better personalized recommendations.
        </p>
        
        {/* Add Author Input */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newAuthor}
            onChange={(e) => setNewAuthor(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddAuthor()}
            placeholder="e.g., Toni Morrison"
            className="flex-1 px-3 py-2 rounded-lg border border-[#D4DAD0] bg-white text-[#4A5940] placeholder-[#96A888] text-sm focus:outline-none focus:ring-2 focus:ring-[#5F7252] focus:border-transparent"
          />
          <button
            onClick={handleAddAuthor}
            disabled={!newAuthor.trim()}
            className="px-3 py-2 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Authors List */}
        {favoriteAuthors.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {favoriteAuthors.map((author, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#E8EBE4] text-[#5F7252] rounded-full"
              >
                {author}
                <button
                  onClick={() => handleRemoveAuthor(author)}
                  className="hover:text-[#4A5940] transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#96A888] italic">No favorite authors added yet</p>
        )}
      </div>
    </div>
  );
}
