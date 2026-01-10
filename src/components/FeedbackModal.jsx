import React, { useState } from 'react';
import { X, MessageSquare, Lightbulb, Bug, Quote, Send, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CATEGORIES = [
  { id: 'quote', label: 'Share a Quote', icon: Quote, description: 'A testimonial or kind words' },
  { id: 'feature_request', label: 'Feature Request', icon: Lightbulb, description: 'Something you\'d love to see' },
  { id: 'bug', label: 'Report a Bug', icon: Bug, description: 'Something isn\'t working right' },
  { id: 'general', label: 'General Feedback', icon: MessageSquare, description: 'Anything else on your mind' },
];

export default function FeedbackModal({ isOpen, onClose, user }) {
  const [category, setCategory] = useState(null);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category || !message.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('feedback')
        .insert({
          user_id: user?.id || null,
          category,
          message: message.trim(),
          email: email.trim() || null,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
        });

      if (insertError) throw insertError;

      setIsSubmitted(true);
      setTimeout(() => {
        onClose();
        // Reset state after close animation
        setTimeout(() => {
          setCategory(null);
          setMessage('');
          setIsSubmitted(false);
        }, 300);
      }, 2000);
    } catch (err) {
      console.error('Feedback submission error:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state after close
    setTimeout(() => {
      setCategory(null);
      setMessage('');
      setError('');
      setIsSubmitted(false);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E8EBE4]">
          <h2 className="text-lg font-semibold text-[#4A5940]">Send Feedback</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-[#F8F6EE] rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-[#96A888]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {isSubmitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-[#5F7252] rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#4A5940] mb-2">Thank you!</h3>
              <p className="text-sm text-[#5F7252]">Your feedback means the world to me.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Category Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#4A5940] mb-2">
                  What type of feedback?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-[#5F7252] bg-[#5F7252]/10'
                            : 'border-[#E8EBE4] hover:border-[#5F7252]/50'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mb-1 ${isSelected ? 'text-[#5F7252]' : 'text-[#96A888]'}`} />
                        <div className={`text-sm font-medium ${isSelected ? 'text-[#4A5940]' : 'text-[#5F7252]'}`}>
                          {cat.label}
                        </div>
                        <div className="text-xs text-[#96A888]">{cat.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#4A5940] mb-2">
                  Your message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    category === 'quote' ? "I love Sarah's Books because..." :
                    category === 'feature_request' ? "It would be great if..." :
                    category === 'bug' ? "I noticed that..." :
                    "I wanted to share..."
                  }
                  className="w-full px-3 py-2 border border-[#E8EBE4] rounded-xl text-sm text-[#4A5940] placeholder-[#96A888] focus:outline-none focus:ring-2 focus:ring-[#5F7252]/30 focus:border-[#5F7252] resize-none"
                  rows={4}
                  required
                />
              </div>

              {/* Email (optional for non-logged-in users) */}
              {!user && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#4A5940] mb-2">
                    Email <span className="text-[#96A888] font-normal">(optional, for follow-up)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 border border-[#E8EBE4] rounded-xl text-sm text-[#4A5940] placeholder-[#96A888] focus:outline-none focus:ring-2 focus:ring-[#5F7252]/30 focus:border-[#5F7252]"
                  />
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!category || !message.trim() || isSubmitting}
                className="w-full py-3 bg-[#5F7252] text-white rounded-xl font-medium hover:bg-[#4A5940] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Feedback
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
