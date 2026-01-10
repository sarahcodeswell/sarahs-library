import React, { useState, useRef } from 'react';
import { X, MessageSquare, Lightbulb, Bug, Quote, Send, Check, Image, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CATEGORIES = [
  { id: 'quote', label: 'Share a Quote', icon: Quote, description: 'A testimonial or kind words', allowScreenshot: false },
  { id: 'feature_request', label: 'Feature Request', icon: Lightbulb, description: 'Something you\'d love to see', allowScreenshot: false },
  { id: 'bug', label: 'Report a Bug', icon: Bug, description: 'Something isn\'t working right', allowScreenshot: true },
  { id: 'general', label: 'General Feedback', icon: MessageSquare, description: 'Anything else on your mind', allowScreenshot: true },
];

export default function FeedbackModal({ isOpen, onClose, user }) {
  const [category, setCategory] = useState(null);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [pageReference, setPageReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const allowsScreenshot = CATEGORIES.find(c => c.id === category)?.allowScreenshot;
  const needsPageReference = category && category !== 'quote';

  const PAGE_OPTIONS = [
    { value: '', label: 'Select a page...' },
    { value: 'home', label: 'Home / Search' },
    { value: 'recommendations', label: 'Recommendations Results' },
    { value: 'reading-queue', label: 'Reading Queue' },
    { value: 'collection', label: 'My Collection' },
    { value: 'upload-books', label: 'Upload Books' },
    { value: 'profile', label: 'Profile' },
    { value: 'book-detail', label: 'Book Detail Modal' },
    { value: 'other', label: 'Other / Not Sure' },
  ];

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
    setError('');
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
      setScreenshotPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category || !message.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      let screenshotUrl = null;

      // Upload screenshot if present
      if (screenshot) {
        const fileExt = screenshot.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('feedback-screenshots')
          .upload(fileName, screenshot);

        if (uploadError) {
          console.error('Screenshot upload error:', uploadError);
          // Continue without screenshot if upload fails
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('feedback-screenshots')
            .getPublicUrl(fileName);
          screenshotUrl = publicUrl;
        }
      }

      const { error: insertError } = await supabase
        .from('feedback')
        .insert({
          user_id: user?.id || null,
          category,
          message: message.trim(),
          email: email.trim() || null,
          page_url: pageReference || window.location.href,
          user_agent: navigator.userAgent,
          screenshot_url: screenshotUrl,
        });

      if (insertError) throw insertError;

      setIsSubmitted(true);
      removeScreenshot(); // Clean up screenshot preview
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
    removeScreenshot(); // Clean up screenshot preview
    // Reset state after close
    setTimeout(() => {
      setCategory(null);
      setMessage('');
      setPageReference('');
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

              {/* Page Reference (for non-quote feedback) */}
              {needsPageReference && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#4A5940] mb-2">
                    Which page is this about?
                  </label>
                  <select
                    value={pageReference}
                    onChange={(e) => setPageReference(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E8EBE4] rounded-xl text-sm text-[#4A5940] focus:outline-none focus:ring-2 focus:ring-[#5F7252]/30 focus:border-[#5F7252] bg-white"
                  >
                    {PAGE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

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

              {/* Screenshot upload (for bug and general feedback) */}
              {allowsScreenshot && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#4A5940] mb-2">
                    Screenshot <span className="text-[#96A888] font-normal">(optional)</span>
                  </label>
                  
                  {screenshotPreview ? (
                    <div className="relative">
                      <img 
                        src={screenshotPreview} 
                        alt="Screenshot preview" 
                        className="w-full h-32 object-cover rounded-xl border border-[#E8EBE4]"
                      />
                      <button
                        type="button"
                        onClick={removeScreenshot}
                        className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-lg shadow-sm transition-colors"
                        aria-label="Remove screenshot"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-4 border-2 border-dashed border-[#E8EBE4] rounded-xl hover:border-[#5F7252]/50 transition-colors flex flex-col items-center gap-1"
                    >
                      <Image className="w-6 h-6 text-[#96A888]" />
                      <span className="text-xs text-[#96A888]">Click to add screenshot</span>
                    </button>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}

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
