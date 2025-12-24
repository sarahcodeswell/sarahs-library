import React from 'react';
import { User, BookOpen, LogOut, X, BookCheck } from 'lucide-react';
import { useUser, useReadingQueue } from '../contexts';

export default function UserProfile({ tasteProfile }) {
  const { user, signOut } = useUser();
  const { readingQueue, removeFromQueue, updateQueueStatus } = useReadingQueue();

  const handleSignOut = async () => {
    await signOut();
  };

  const handleRemoveFromQueue = async (bookId) => {
    await removeFromQueue(bookId);
  };

  const handleMarkAsRead = async (bookId) => {
    await updateQueueStatus(bookId, 'finished');
  };

  // Separate and sort books
  const wantToRead = readingQueue
    ?.filter(book => book.status === 'want_to_read')
    .sort((a, b) => new Date(b.added_at) - new Date(a.added_at)) || [];
  
  const finishedBooks = readingQueue
    ?.filter(book => book.status === 'finished')
    .sort((a, b) => new Date(b.added_at) - new Date(a.added_at)) || [];

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

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-[#F8F6EE] rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <BookCheck className="w-4 h-4 text-[#5F7252] flex-shrink-0" />
            <span className="text-xs text-[#7A8F6C] font-medium leading-tight">Books Read</span>
          </div>
          <p className="text-2xl font-serif text-[#4A5940] leading-none">
            {finishedBooks.length}
          </p>
        </div>
        <div className="p-4 bg-[#F8F6EE] rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-[#5F7252] flex-shrink-0" />
            <span className="text-xs text-[#7A8F6C] font-medium leading-tight">Want to Read</span>
          </div>
          <p className="text-2xl font-serif text-[#4A5940] leading-none">
            {wantToRead.length}
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

      {/* Want to Read Section */}
      {wantToRead.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-[#5F7252] mb-2">Want to Read ({wantToRead.length})</h4>
          <div className="space-y-2">
            {wantToRead.map((book) => (
              <div
                key={book.id}
                className="p-3 bg-[#F8F6EE] rounded-lg text-xs flex items-start justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#4A5940] truncate">{book.book_title}</p>
                  {book.book_author && (
                    <p className="text-[#96A888] truncate">{book.book_author}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleMarkAsRead(book.id);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-[#5F7252] text-white active:bg-[#4A5940] rounded transition-colors touch-manipulation"
                    title="Mark as read"
                  >
                    <BookCheck className="w-3 h-3" />
                    Read
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleRemoveFromQueue(book.id);
                    }}
                    className="p-2 active:bg-red-50 rounded transition-colors touch-manipulation"
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

      {/* Empty state for Want to Read */}
      {wantToRead.length === 0 && finishedBooks.length === 0 && (
        <div className="text-center py-8">
          <BookOpen className="w-12 h-12 text-[#D4DAD0] mx-auto mb-3" />
          <p className="text-sm text-[#96A888] mb-1">No books in your queue yet</p>
          <p className="text-xs text-[#B8C4AC]">Bookmark recommendations to add them here</p>
        </div>
      )}

      {/* Finished Books Section */}
      {finishedBooks.length > 0 && (
        <div className="mt-6 pt-6 border-t border-[#E8EBE4]">
          <h4 className="text-sm font-medium text-[#5F7252] mb-2">Finished ({finishedBooks.length})</h4>
          <div className="space-y-2">
            {finishedBooks.map((book) => (
              <div
                key={book.id}
                className="p-3 bg-[#F8F6EE] rounded-lg text-xs flex items-start justify-between gap-2 opacity-75"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#4A5940] truncate">{book.book_title}</p>
                  {book.book_author && (
                    <p className="text-[#96A888] truncate">{book.book_author}</p>
                  )}
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-[#5F7252] font-medium">
                    <BookCheck className="w-3 h-3" />
                    Read
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleRemoveFromQueue(book.id);
                    }}
                    className="p-2 active:bg-red-50 rounded transition-colors touch-manipulation"
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
