import React, { useState } from 'react';
import { X, Loader2, Copy, Check, Mail, MessageCircle, Twitter, Facebook } from 'lucide-react';

export default function RecommendationModal({ isOpen, onClose, book, onSubmit }) {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [shareLink, setShareLink] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!note.trim()) {
      setError('Please add a note explaining why you recommend this book.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await onSubmit(book, note.trim());
      if (result && result.shareLink) {
        setShareLink(result.shareLink);
      }
    } catch (_err) {
      setError('Failed to create recommendation. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleClose = () => {
    setNote('');
    setError('');
    setShareLink(null);
    setLinkCopied(false);
    onClose();
  };

  if (!isOpen || !book) return null;

  // Share options for the success state
  const shareText = note 
    ? `I recommend "${book.book_title}" — ${note}`
    : `I recommend "${book.book_title}" by ${book.book_author}`;
  const encodedUrl = encodeURIComponent(shareLink || '');
  const encodedText = encodeURIComponent(shareText);

  const shareOptions = [
    {
      name: 'Copy',
      icon: linkCopied ? Check : Copy,
      color: 'bg-[#5F7252]',
      onClick: handleCopyLink,
      label: linkCopied ? 'Copied!' : 'Copy'
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'bg-[#EA4335]',
      href: `mailto:?subject=${encodeURIComponent(`Book Recommendation: ${book.book_title}`)}&body=${encodedText}%0A%0A${encodedUrl}`
    },
    {
      name: 'iMessage',
      icon: MessageCircle,
      color: 'bg-[#34C759]',
      href: `sms:?body=${encodedText}%20${encodedUrl}`
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-[#25D366]',
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-[#1DA1F2]',
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-[#1877F2]',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[#E8EBE4]">
        <div className="sticky top-0 bg-white rounded-t-2xl z-10 px-6 pt-6 pb-3 border-b border-[#E8EBE4] flex items-center justify-between">
          <h2 className="text-xl font-serif text-[#4A5940]">
            {shareLink ? 'Share Your Recommendation' : 'Recommend a Book'}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-[#E8EBE4] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#96A888]" />
          </button>
        </div>

        {shareLink ? (
          <div className="p-6">
            {/* Success message */}
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 flex items-center gap-2">
                <Check className="w-4 h-4" />
                Recommendation created!
              </p>
            </div>

            {/* Book info */}
            <div className="mb-4 p-4 bg-[#F8F6EE] rounded-lg border border-[#E8EBE4]">
              <h3 className="font-medium text-[#4A5940] mb-1">{book.book_title}</h3>
              {book.book_author && (
                <p className="text-sm text-[#7A8F6C]">by {book.book_author}</p>
              )}
            </div>

            {/* Share options grid */}
            <div className="mb-4">
              <p className="text-sm text-[#5F7252] font-medium mb-3">Share via:</p>
              <div className="grid grid-cols-3 gap-3">
                {shareOptions.map((option) => (
                  option.onClick ? (
                    <button
                      key={option.name}
                      onClick={option.onClick}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[#F8F6EE] transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-full ${option.color} flex items-center justify-center`}>
                        <option.icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs text-[#5F7252] font-medium">{option.label}</span>
                    </button>
                  ) : (
                    <a
                      key={option.name}
                      href={option.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[#F8F6EE] transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-full ${option.color} flex items-center justify-center`}>
                        <option.icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs text-[#5F7252] font-medium">{option.name}</span>
                    </a>
                  )
                ))}
              </div>
            </div>

            {/* Link preview */}
            <div className="mb-4 bg-[#F8F6EE] rounded-lg px-3 py-2 flex items-center gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 bg-transparent text-xs text-[#7A8F6C] outline-none truncate"
              />
              <button
                onClick={handleCopyLink}
                className="text-xs text-[#5F7252] font-medium hover:text-[#4A5940] transition-colors whitespace-nowrap"
              >
                {linkCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-2.5 px-4 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors font-medium"
            >
              Done
            </button>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
