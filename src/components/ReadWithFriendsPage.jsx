import React, { useState } from 'react';
import { ArrowLeft, Users, Mail, Heart, Check, Sparkles } from 'lucide-react';
import { track } from '@vercel/analytics';

export default function ReadWithFriendsPage({ onNavigate, user, onShowAuthModal }) {
  const [email, setEmail] = useState(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/waitlist/beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          userId: user?.id || null,
          interestedFeatures: ['read_with_friends']
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign up');
      }

      track('beta_signup', {
        feature: 'read_with_friends'
      });

      setSubmitted(true);
    } catch (err) {
      console.error('Beta signup error:', err);
      setError('Failed to sign up. Please try again or contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back Button */}
        <button
          onClick={() => {
            onNavigate('home');
            window.scrollTo(0, 0);
          }}
          className="inline-flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] transition-colors mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c96b6b]/10 text-[#c96b6b] text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Coming Soon
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#4A5940] mb-4">Read with Friends</h1>
          <p className="text-base text-[#5F7252] leading-relaxed max-w-xl mx-auto">
            Share book recommendations directly with friends on Sarah's Books. A thoughtful way to connect over great books.
          </p>
        </div>

        {/* What You'll Be Able To Do */}
        <div className="space-y-4 mb-8">
          <h2 className="font-serif text-xl text-[#4A5940] text-center mb-4">What You'll Be Able To Do</h2>
          
          <div className="bg-[#F8F6EE] rounded-xl p-5 border border-[#D4DAD0]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#c96b6b]/10 text-[#c96b6b] flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-[#4A5940] mb-1">Find Friends</h3>
                <p className="text-sm text-[#7A8F6C]">
                  Search for friends on the platform and connect over shared book interests.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#F8F6EE] rounded-xl p-5 border border-[#D4DAD0]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#c96b6b]/10 text-[#c96b6b] flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-[#4A5940] mb-1">Share Directly</h3>
                <p className="text-sm text-[#7A8F6C]">
                  Share book recommendations directly within the app—no more copy/pasting links.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#F8F6EE] rounded-xl p-5 border border-[#D4DAD0]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#c96b6b]/10 text-[#c96b6b] flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-[#4A5940] mb-1">Invite Friends</h3>
                <p className="text-sm text-[#7A8F6C]">
                  Invite friends who aren't on the platform yet via email.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Beta Signup */}
        <div className="bg-[#c96b6b]/10 rounded-2xl p-6 sm:p-8 border border-[#c96b6b]/20">
          {submitted ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#c96b6b] text-white flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl text-[#4A5940] mb-2">You're on the list!</h3>
              <p className="text-sm text-[#5F7252]">
                We'll let you know as soon as Read with Friends is ready.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h3 className="font-serif text-xl text-[#4A5940] mb-2">Join the Beta</h3>
                <p className="text-sm text-[#5F7252]">
                  Be the first to know when Read with Friends launches.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#96A888]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#D4DAD0] bg-white text-[#4A5940] placeholder-[#96A888] focus:outline-none focus:ring-2 focus:ring-[#c96b6b]/30"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 rounded-lg bg-[#c96b6b] text-white font-medium hover:bg-[#b85a5a] transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Joining...' : 'Join Beta'}
                  </button>
                </div>
                {error && (
                  <p className="text-red-600 text-sm mt-2 text-center">{error}</p>
                )}
              </form>
            </>
          )}
        </div>

        {/* Back to browsing CTA */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[#7A8F6C] mb-3">In the meantime...</p>
          <button
            onClick={() => {
              onNavigate('home');
              window.scrollTo(0, 0);
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#c96b6b] text-[#c96b6b] text-sm font-medium hover:bg-[#c96b6b]/5 transition-colors"
          >
            Ask Sarah for a Recommendation
          </button>
        </div>
      </div>
    </div>
  );
}
