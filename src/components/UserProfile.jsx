import React, { useState, useEffect } from 'react';
import { User, LogOut, Save } from 'lucide-react';
import { useUser } from '../contexts';
import { db } from '../lib/supabase';

export default function UserProfile({ tasteProfile }) {
  const { user, signOut, updateUserMetadata } = useUser();
  const [readingPreferences, setReadingPreferences] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load existing preferences on mount
  useEffect(() => {
    if (user?.user_metadata?.reading_preferences) {
      setReadingPreferences(user.user_metadata.reading_preferences);
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
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
      const { error } = await db.supabase.auth.updateUser({
        data: { reading_preferences: readingPreferences }
      });

      if (error) throw error;

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
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#5F7252] to-[#7A8F6C] flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-[#4A5940] truncate">{user.email}</h3>
            <p className="text-xs text-[#96A888]">Member since {new Date(user.created_at).toLocaleDateString()}</p>
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
              saveMessage.includes('success') ? 'text-[#5F7252]' : 'text-red-500'
            }`}>
              {saveMessage}
            </span>
          )}
        </div>
      </div>


      {tasteProfile?.likedAuthors?.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-[#5F7252] mb-2">Favorite Authors</h4>
          <div className="flex flex-wrap gap-2">
            {tasteProfile.likedAuthors.slice(0, 5).map((author, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-1 bg-[#E8EBE4] text-[#5F7252] rounded-full"
              >
                {author}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
