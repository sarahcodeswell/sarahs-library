import React, { useState } from 'react';
import { X, Copy, Mail, MessageCircle, Twitter, Facebook, Check } from 'lucide-react';

export default function ShareModal({ isOpen, onClose, shareUrl, bookTitle, bookAuthor, note }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareText = note 
    ? `I recommend "${bookTitle}" — ${note}`
    : `I recommend "${bookTitle}" by ${bookAuthor}`;

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareOptions = [
    {
      name: 'Copy Link',
      icon: copied ? Check : Copy,
      color: 'bg-[#5F7252]',
      textColor: 'text-white',
      onClick: handleCopy,
      label: copied ? 'Copied!' : 'Copy Link'
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'bg-[#EA4335]',
      textColor: 'text-white',
      href: `mailto:?subject=${encodeURIComponent(`Book Recommendation: ${bookTitle}`)}&body=${encodedText}%0A%0A${encodedUrl}`
    },
    {
      name: 'iMessage',
      icon: MessageCircle,
      color: 'bg-[#34C759]',
      textColor: 'text-white',
      href: `sms:?body=${encodedText}%20${encodedUrl}`
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-[#25D366]',
      textColor: 'text-white',
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-[#1DA1F2]',
      textColor: 'text-white',
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-[#1877F2]',
      textColor: 'text-white',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm mx-auto border border-[#E8EBE4] animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8EBE4]">
          <h3 className="font-medium text-[#4A5940]">Share this book</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#F8F6EE] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#96A888]" />
          </button>
        </div>

        {/* Book Preview */}
        <div className="px-4 py-3 bg-[#F8F6EE] border-b border-[#E8EBE4]">
          <p className="font-medium text-[#4A5940] text-sm">{bookTitle}</p>
          {bookAuthor && <p className="text-xs text-[#7A8F6C]">by {bookAuthor}</p>}
        </div>

        {/* Share Options Grid */}
        <div className="p-4 grid grid-cols-3 gap-3">
          {shareOptions.map((option) => (
            option.onClick ? (
              <button
                key={option.name}
                onClick={option.onClick}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[#F8F6EE] transition-colors"
              >
                <div className={`w-12 h-12 rounded-full ${option.color} flex items-center justify-center`}>
                  <option.icon className={`w-5 h-5 ${option.textColor}`} />
                </div>
                <span className="text-xs text-[#5F7252] font-medium">{option.label}</span>
              </button>
            ) : (
              <a
                key={option.name}
                href={option.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[#F8F6EE] transition-colors"
              >
                <div className={`w-12 h-12 rounded-full ${option.color} flex items-center justify-center`}>
                  <option.icon className={`w-5 h-5 ${option.textColor}`} />
                </div>
                <span className="text-xs text-[#5F7252] font-medium">{option.name}</span>
              </a>
            )
          ))}
        </div>

        {/* URL Preview */}
        <div className="px-4 pb-4">
          <div className="bg-[#F8F6EE] rounded-lg px-3 py-2 flex items-center gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 bg-transparent text-xs text-[#7A8F6C] outline-none truncate"
            />
            <button
              onClick={handleCopy}
              className="text-xs text-[#5F7252] font-medium hover:text-[#4A5940] transition-colors whitespace-nowrap"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
