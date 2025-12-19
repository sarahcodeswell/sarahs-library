import React from 'react';
import { User, Heart, BookOpen, LogOut } from 'lucide-react';
import { auth } from '../lib/supabase';

export default function UserProfile({ user, tasteProfile, readingQueue, onSignOut }) {
  const handleSignOut = async () => {
    await auth.signOut();
    onSignOut();
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8EBE4] p-6 shadow-sm">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#5F7252] to-[#7A8F6C] flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-[#4A5940]">{user.email}</h3>
            <p className="text-xs text-[#96A888]">Member since {new Date(user.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="p-2 hover:bg-[#E8EBE4] rounded-lg transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4 text-[#96A888]" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-[#F8F6EE] rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-[#5F7252]" />
            <span className="text-xs text-[#7A8F6C] font-medium">Liked Books</span>
          </div>
          <p className="text-2xl font-serif text-[#4A5940]">
            {tasteProfile?.likedBooks?.length || 0}
          </p>
        </div>
        <div className="p-4 bg-[#F8F6EE] rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-[#5F7252]" />
            <span className="text-xs text-[#7A8F6C] font-medium">Reading Queue</span>
          </div>
          <p className="text-2xl font-serif text-[#4A5940]">
            {readingQueue?.length || 0}
          </p>
        </div>
      </div>

      {tasteProfile?.likedAuthors?.length > 0 && (
        <div className="mb-4">
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

      {readingQueue?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-[#5F7252] mb-2">Reading Queue</h4>
          <div className="space-y-2">
            {readingQueue.slice(0, 3).map((book) => (
              <div
                key={book.id}
                className="p-2 bg-[#F8F6EE] rounded-lg text-xs"
              >
                <p className="font-medium text-[#4A5940]">{book.book_title}</p>
                {book.book_author && (
                  <p className="text-[#96A888]">{book.book_author}</p>
                )}
              </div>
            ))}
            {readingQueue.length > 3 && (
              <p className="text-xs text-[#96A888] text-center">
                +{readingQueue.length - 3} more
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
