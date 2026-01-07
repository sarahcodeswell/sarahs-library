import React, { useState } from 'react';
import { ArrowLeft, Users, Search, Mail, Shield, Heart, CheckCircle, Sparkles } from 'lucide-react';
import { track } from '@vercel/analytics';
import { db } from '../lib/supabase';

export default function ReadWithFriendsPage({ onNavigate, user, onShowAuthModal }) {
  const [email, setEmail] = useState(user?.email || '');
  const [name, setName] = useState('');
  const [interests, setInterests] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const featureOptions = [
    { id: 'direct_sharing', label: 'Share books directly with friends' },
    { id: 'user_search', label: 'Search for friends on the platform' },
    { id: 'email_invites', label: 'Invite friends via email' },
    { id: 'recommendations_inbox', label: 'Enhanced recommendations inbox' },
  ];

  const handleInterestToggle = (featureId) => {
    setInterests(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const { error: dbError } = await db.createBetaTester({
        user_id: user?.id || null,
        email: email,
        name: name || null,
        interested_features: interests,
        feedback: feedback || null
      });

      if (dbError) throw dbError;

      track('beta_signup', {
        feature: 'read_with_friends',
        interests: interests.join(',')
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <button
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Home</span>
        </button>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#5F7252]/10 mb-4">
            <Users className="w-8 h-8 text-[#5F7252]" />
          </div>
          <h1 className="text-4xl font-serif text-[#4A5940] mb-3">Read with Friends</h1>
          <p className="text-lg text-[#7A8F6C] max-w-2xl mx-auto">
            Share book recommendations directly with friends on Sarah's Books. Coming soon!
          </p>
        </div>

        {/* What's Coming Section */}
        <div className="bg-white rounded-xl border border-[#E8EBE4] p-8 mb-8">
          <h2 className="text-2xl font-serif text-[#4A5940] mb-6 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#5F7252]" />
            What's Coming
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Feature 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#5F7252]/10 flex items-center justify-center">
                <Search className="w-5 h-5 text-[#5F7252]" />
              </div>
              <div>
                <h3 className="font-medium text-[#4A5940] mb-1">Find Friends</h3>
                <p className="text-sm text-[#7A8F6C]">
                  Search for friends on the platform and connect over shared book interests
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#5F7252]/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-[#5F7252]" />
              </div>
              <div>
                <h3 className="font-medium text-[#4A5940] mb-1">Share Directly</h3>
                <p className="text-sm text-[#7A8F6C]">
                  Share book recommendations directly within the app—no more copy/pasting links
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#5F7252]/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-[#5F7252]" />
              </div>
              <div>
                <h3 className="font-medium text-[#4A5940] mb-1">Invite Friends</h3>
                <p className="text-sm text-[#7A8F6C]">
                  Invite friends who aren't on the platform yet via email
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#5F7252]/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#5F7252]" />
              </div>
              <div>
                <h3 className="font-medium text-[#4A5940] mb-1">Privacy First</h3>
                <p className="text-sm text-[#7A8F6C]">
                  Control who can find you, with privacy settings that put you in control
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Important Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <h3 className="font-medium text-blue-900 mb-2">This is a Book Discovery Tool</h3>
          <p className="text-sm text-blue-700">
            Read with Friends is designed for sharing book recommendations only. This is not a social network 
            or messaging platform—just a thoughtful way to share great books with people you care about.
          </p>
        </div>

        {/* Beta Signup Form */}
        {!submitted ? (
          <div className="bg-white rounded-xl border border-[#E8EBE4] p-8">
            <h2 className="text-2xl font-serif text-[#4A5940] mb-2">Join the Beta</h2>
            <p className="text-[#7A8F6C] mb-6">
              Be among the first to try Read with Friends. We'll notify you when it's ready!
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#4A5940] mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#D4DAD0] bg-white text-[#4A5940] placeholder-[#96A888] focus:outline-none focus:ring-2 focus:ring-[#5F7252] focus:border-transparent"
                  placeholder="your@email.com"
                  disabled={!!user?.email}
                />
              </div>

              {/* Name (optional) */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#4A5940] mb-2">
                  Name (optional)
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#D4DAD0] bg-white text-[#4A5940] placeholder-[#96A888] focus:outline-none focus:ring-2 focus:ring-[#5F7252] focus:border-transparent"
                  placeholder="Your name"
                />
              </div>

              {/* Interests */}
              <div>
                <label className="block text-sm font-medium text-[#4A5940] mb-3">
                  Which features interest you most?
                </label>
                <div className="space-y-2">
                  {featureOptions.map(option => (
                    <label key={option.id} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={interests.includes(option.id)}
                        onChange={() => handleInterestToggle(option.id)}
                        className="mt-0.5 w-4 h-4 rounded border-[#D4DAD0] text-[#5F7252] focus:ring-[#5F7252]"
                      />
                      <span className="text-sm text-[#5F7252]">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Feedback */}
              <div>
                <label htmlFor="feedback" className="block text-sm font-medium text-[#4A5940] mb-2">
                  Any thoughts or suggestions? (optional)
                </label>
                <textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#D4DAD0] bg-white text-[#4A5940] placeholder-[#96A888] focus:outline-none focus:ring-2 focus:ring-[#5F7252] focus:border-transparent resize-none"
                  placeholder="What would make this feature valuable for you?"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="w-full px-6 py-3 bg-[#5F7252] text-white rounded-lg font-medium hover:bg-[#4A5940] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Signing Up...' : 'Sign Up for Beta'}
              </button>
            </form>
          </div>
        ) : (
          /* Success Message */
          <div className="bg-white rounded-xl border border-[#E8EBE4] p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-serif text-[#4A5940] mb-2">You're on the list!</h2>
            <p className="text-[#7A8F6C] mb-6">
              We'll email you at <strong>{email}</strong> when Read with Friends is ready to test.
            </p>
            <button
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#5F7252] text-white rounded-lg font-medium hover:bg-[#4A5940] transition-colors"
            >
              Back to Home
            </button>
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-12 space-y-6">
          <h2 className="text-2xl font-serif text-[#4A5940]">Frequently Asked Questions</h2>
          
          <div className="bg-white rounded-xl border border-[#E8EBE4] p-6">
            <h3 className="font-medium text-[#4A5940] mb-2">When will this be available?</h3>
            <p className="text-sm text-[#7A8F6C]">
              We're building thoughtfully to ensure the feature is safe, private, and delightful to use. 
              Beta testers will get early access, followed by a gradual rollout to all users.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#E8EBE4] p-6">
            <h3 className="font-medium text-[#4A5940] mb-2">Will my email be shared with other users?</h3>
            <p className="text-sm text-[#7A8F6C]">
              No. Your email address will never be visible to other users. Friends can search for you by 
              name only, and only if you've chosen to make your profile searchable.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#E8EBE4] p-6">
            <h3 className="font-medium text-[#4A5940] mb-2">Is this a social network?</h3>
            <p className="text-sm text-[#7A8F6C]">
              No. Sarah's Books is a book discovery platform, not social media. Read with Friends is 
              specifically for sharing book recommendations—there are no feeds, likes, or messaging features.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#E8EBE4] p-6">
            <h3 className="font-medium text-[#4A5940] mb-2">What about privacy and safety?</h3>
            <p className="text-sm text-[#7A8F6C]">
              Privacy and safety are our top priorities. The feature includes age verification (18+), 
              privacy controls, rate limiting, blocking, and reporting. Your profile is private by default.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
