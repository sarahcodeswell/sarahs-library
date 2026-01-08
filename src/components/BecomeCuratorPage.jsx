import React, { useState } from 'react';
import { ArrowLeft, Sparkles, BookOpen, Users, Palette, Mail, Check } from 'lucide-react';

export default function BecomeCuratorPage({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/waitlist/curator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join waitlist');
      }
      
      setSubmitted(true);
    } catch (err) {
      console.error('Waitlist error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6B8E9C]/10 text-[#6B8E9C] text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Coming Soon
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#4A5940] mb-4">Become a Curator</h1>
          <p className="text-base text-[#5F7252] leading-relaxed max-w-xl mx-auto">
            You know great books. Your friends trust your taste. Soon, you'll be able to build your own curated library and help others find their next great read.
          </p>
        </div>

        {/* What You'll Be Able To Do */}
        <div className="space-y-4 mb-8">
          <h2 className="font-serif text-xl text-[#4A5940] text-center mb-4">What You'll Be Able To Do</h2>
          
          <div className="bg-[#F8F6EE] rounded-xl p-5 border border-[#D4DAD0]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#6B8E9C]/10 text-[#6B8E9C] flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-[#4A5940] mb-1">Build Your Library</h3>
                <p className="text-sm text-[#7A8F6C]">
                  Catalog the books you've read. Add your reviews, ratings, and personal notes about why each book matters.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#F8F6EE] rounded-xl p-5 border border-[#D4DAD0]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#6B8E9C]/10 text-[#6B8E9C] flex items-center justify-center flex-shrink-0">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-[#4A5940] mb-1">Create Your Themes</h3>
                <p className="text-sm text-[#7A8F6C]">
                  Organize books into themes that reflect your unique perspective. "Books That Changed How I Think" or "Perfect Beach Reads"—you decide.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#F8F6EE] rounded-xl p-5 border border-[#D4DAD0]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#6B8E9C]/10 text-[#6B8E9C] flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-[#4A5940] mb-1">Help Others Discover</h3>
                <p className="text-sm text-[#7A8F6C]">
                  Share your curated collections with friends, family, or the world. Be the trusted voice that helps readers find books they'll love.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Waitlist Signup */}
        <div className="bg-[#6B8E9C]/10 rounded-2xl p-6 sm:p-8 border border-[#6B8E9C]/20">
          {submitted ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#6B8E9C] text-white flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl text-[#4A5940] mb-2">You're on the list!</h3>
              <p className="text-sm text-[#5F7252]">
                We'll let you know as soon as curator features are ready.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h3 className="font-serif text-xl text-[#4A5940] mb-2">Join the Waitlist</h3>
                <p className="text-sm text-[#5F7252]">
                  Be the first to know when curator features launch.
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
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#D4DAD0] bg-white text-[#4A5940] placeholder-[#96A888] focus:outline-none focus:ring-2 focus:ring-[#6B8E9C]/30"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 rounded-lg bg-[#6B8E9C] text-white font-medium hover:bg-[#5a7a87] transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Joining...' : 'Join Waitlist'}
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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#6B8E9C] text-[#6B8E9C] text-sm font-medium hover:bg-[#6B8E9C]/5 transition-colors"
          >
            Ask Sarah for a Recommendation
          </button>
        </div>
      </div>
    </div>
  );
}
