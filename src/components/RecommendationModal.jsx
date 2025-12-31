import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

export default function RecommendationModal({ isOpen, onClose, book, onSubmit }) {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!note.trim()) {
      setError('Please add a note explaining why you recommend this book.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(book, note.trim());
      setNote('');
      onClose();
    } catch (_err) {
      setError('Failed to create recommendation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNote('');
    setError('');
    onClose();
  };

  if (!isOpen || !book) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[#E8EBE4]">
        <div className="sticky top-0 bg-white rounded-t-2xl z-10 px-6 pt-6 pb-3 border-b border-[#E8EBE4] flex items-center justify-between">
          <h2 className="text-xl font-serif text-[#4A5940]">Recommend a Book</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-[#E8EBE4] rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-[#96A888]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4 p-4 bg-[#F8F6EE] rounded-lg border border-[#E8EBE4]">
            <h3 className="font-medium text-[#4A5940] mb-1">{book.book_title}</h3>
            {book.book_author && (
              <p className="text-sm text-[#7A8F6C]">by {book.book_author}</p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-[#5F7252] mb-2">
              Why do you recommend this book?
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Share what you loved about this book and why others should read it..."
              className="w-full px-4 py-3 border border-[#E8EBE4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5F7252] focus:border-transparent resize-none"
              rows={5}
              disabled={isSubmitting}
              required
            />
            <p className="text-xs text-[#96A888] mt-2">
              This note will be shared with anyone you send this recommendation to.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 border border-[#D4DAD0] rounded-lg hover:bg-[#F8F6EE] transition-colors text-[#5F7252] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !note.trim()}
              className="flex-1 py-2.5 px-4 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Recommendation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
