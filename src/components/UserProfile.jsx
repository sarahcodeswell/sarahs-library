import React from 'react';
import { User, BookOpen, LogOut, X, BookCheck } from 'lucide-react';
import { auth, db } from '../lib/supabase';

export default function UserProfile({ user, tasteProfile, readingQueue, onSignOut, onQueueUpdate }) {
  const handleSignOut = async () => {
    await auth.signOut();
    onSignOut();
  };

  const handleRemoveFromQueue = async (bookId) => {
    const { error } = await db.removeFromReadingQueue(bookId);
    if (error) {
      console.error('Error removing from queue:', error);
      return;
    }
    
    if (onQueueUpdate) {
      await onQueueUpdate();
    }
  };

  const handleMarkAsRead = async (bookId) => {
    console.log('Marking book as read:', bookId);
    const { data, error } = await db.updateReadingQueueStatus(bookId, 'read');
    
    if (error) {
      console.error('Error marking book as read:', error);
      return;
    }
    
    console.log('Book marked as read successfully:', data);
    
    if (onQueueUpdate) {
      console.log('Refreshing queue...');
      await onQueueUpdate();
      console.log('Queue refreshed');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8EBE4] p-6 shadow-sm">
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

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-[#F8F6EE] rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <BookCheck className="w-4 h-4 text-[#5F7252]" />
            <span className="text-xs text-[#7A8F6C] font-medium">Books Read</span>
          </div>
          <p className="text-2xl font-serif text-[#4A5940]">
            {readingQueue?.filter(book => book.status === 'read').length || 0}
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
            {readingQueue.map((book) => (
              <div
                key={book.id}
                className="p-3 bg-[#F8F6EE] rounded-lg text-xs flex items-start justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#4A5940] truncate">{book.book_title}</p>
                  {book.book_author && (
                    <p className="text-[#96A888] truncate">{book.book_author}</p>
                  )}
                  {book.status === 'read' && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-[#5F7252] font-medium">
                      <BookCheck className="w-3 h-3" />
                      Read
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {book.status !== 'read' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleMarkAsRead(book.id);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-[#5F7252] text-white hover:bg-[#4A5940] rounded transition-colors"
                      title="Mark as read"
                    >
                      <BookCheck className="w-3 h-3" />
                      Read
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleRemoveFromQueue(book.id);
                    }}
                    className="p-2 hover:bg-red-50 rounded transition-colors"
                    title="Remove from queue"
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
