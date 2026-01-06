import React, { useState } from 'react';
import { ArrowLeft, MessageCircle, Library, Upload, Share2, Sparkles, User, Mail, X, Check, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AboutPage({ onNavigate, user }) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteStatus, setInviteStatus] = useState(null); // 'success' | 'error' | null
  const [inviteMessage, setInviteMessage] = useState('');

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviteLoading(true);
    setInviteStatus(null);

    try {
      const headers = { 'Content-Type': 'application/json' };
      
      // Add auth token if user is logged in
      if (user && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }

      const res = await fetch('/api/invite', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setInviteStatus('success');
        setInviteMessage('Invitation sent!');
        setInviteEmail('');
      } else {
        setInviteStatus('error');
        setInviteMessage(data.error || 'Failed to send invitation');
      }
    } catch (err) {
      setInviteStatus('error');
      setInviteMessage('Failed to send invitation');
    } finally {
      setInviteLoading(false);
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
          <h1 className="font-serif text-3xl sm:text-4xl text-[#4A5940] mb-4">How It Works</h1>
          <p className="text-base text-[#5F7252] leading-relaxed max-w-xl mx-auto">
            I've spent years building this collection—books I couldn't stop thinking about long after I finished them. Browse by my curated themes, or tell me what you're looking for. I love helping people find their next great read.
          </p>
        </div>

        {/* Progressive Journey - Visual Flow */}
        <div className="space-y-4 mb-8">
          
          {/* Step 1: ASK */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#5F7252] text-white flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-xl text-[#4A5940] mb-1">Ask</h3>
                <p className="text-sm text-[#7A8F6C]">
                  Tell me what you're looking for, or browse my curated theme collections. I'll help you find your next great read—whether it's in my library or from the world's.
                </p>
              </div>
            </div>
            <div className="mt-4 ml-[4.5rem]">
              <button
                onClick={() => {
                  onNavigate('curator-themes');
                  window.scrollTo(0, 0);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5F7252]/10 text-[#5F7252] text-sm font-medium hover:bg-[#5F7252]/20 transition-colors"
              >
                Browse Curator Themes
              </button>
            </div>
          </div>

          {/* Step 2: BUILD */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#5F7252] text-white flex items-center justify-center flex-shrink-0">
                <Library className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-xl text-[#4A5940] mb-1">Build</h3>
                <p className="text-sm text-[#7A8F6C]">
                  Tell me what you've read. I'll meet you where you are—recommending from your taste while helping you discover what's next.
                </p>
              </div>
            </div>
            <div className="mt-4 ml-[4.5rem]">
              <button
                onClick={() => {
                  onNavigate('my-books');
                  window.scrollTo(0, 0);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5F7252]/10 text-[#5F7252] text-sm font-medium hover:bg-[#5F7252]/20 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Add books you've read
              </button>
              
              {/* Rating Guide - Compact */}
              <div className="mt-4 pt-4 border-t border-[#E8EBE4]">
                <p className="text-xs text-[#7A8F6C] mb-2">Rate your books with hearts:</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" style={{ fill: '#F5E8E8', color: '#F5E8E8' }} /> Not for me</span>
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" style={{ fill: '#DBADAD', color: '#DBADAD' }} /> Solid read</span>
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" style={{ fill: '#C97B7B', color: '#C97B7B' }} /> All-time fave</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: SHARE */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#5F7252] text-white flex items-center justify-center flex-shrink-0">
                <Share2 className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-xl text-[#4A5940] mb-1">Share</h3>
                <p className="text-sm text-[#7A8F6C]">
                  Be the friend with great book recommendations. Send your picks to people who trust your taste.
                </p>
              </div>
            </div>
            <div className="mt-4 ml-[4.5rem]">
              <button
                onClick={() => {
                  setShowInviteModal(true);
                  setInviteStatus(null);
                  setInviteMessage('');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5F7252]/10 text-[#5F7252] text-sm font-medium hover:bg-[#5F7252]/20 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Invite a Friend
              </button>
            </div>
          </div>

          {/* Step 4: CURATE */}
          <div className="bg-[#5F7252]/10 rounded-xl p-6 border border-[#5F7252]/20">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#5F7252] text-white flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-serif text-xl text-[#4A5940]">Curate</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#5F7252]/20 text-[#5F7252]">Coming Soon</span>
                </div>
                <p className="text-sm text-[#7A8F6C] mb-3">
                  Become a curator yourself. Create your own themes, build your library, and help others find their next great read.
                </p>
                <button
                  onClick={() => {
                    onNavigate('become-curator');
                    window.scrollTo(0, 0);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5F7252] text-white text-sm font-medium hover:bg-[#4A5940] transition-colors"
                >
                  Join the Waitlist
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Ready to Start CTA */}
        <div className="bg-[#F8F6EE] rounded-2xl p-6 sm:p-8 border border-[#D4DAD0] shadow-sm text-center">
          <h2 className="font-serif text-2xl text-[#4A5940] mb-3">Ready to find your next great read?</h2>
          <p className="text-sm text-[#7A8F6C] mb-6">
            Whether from my curated collection or discoveries from the world's library.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                onNavigate('home');
                window.scrollTo(0, 0);
              }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#5F7252] text-white text-sm font-medium hover:bg-[#4A5940] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Ask Sarah
            </button>
            <button
              onClick={() => {
                onNavigate('meet-sarah');
                window.scrollTo(0, 0);
              }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-[#5F7252] text-[#5F7252] text-sm font-medium hover:bg-[#F8F6EE] transition-colors"
            >
              <User className="w-4 h-4" />
              Meet Sarah
            </button>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-[#E8EBE4]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-serif text-[#4A5940]">Invite a Friend</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 hover:bg-[#E8EBE4] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#96A888]" />
              </button>
            </div>

            <p className="text-sm text-[#7A8F6C] mb-6">
              Share the love of reading! Your friend will receive an email invitation to join Sarah's Books.
            </p>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5F7252] mb-2">
                  Friend's Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#96A888]" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-[#E8EBE4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5F7252] focus:border-transparent"
                    placeholder="friend@email.com"
                    required
                  />
                </div>
              </div>

              {inviteStatus === 'success' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-green-600">{inviteMessage}</p>
                </div>
              )}

              {inviteStatus === 'error' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{inviteMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={inviteLoading}
                className="w-full py-2.5 bg-[#5F7252] text-white rounded-lg font-medium hover:bg-[#4A5940] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inviteLoading ? 'Sending...' : 'Send Invitation'}
              </button>
            </form>

            {!user && (
              <p className="mt-4 text-xs text-[#96A888] text-center">
                Sign in to track your referrals
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
