import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageCircle, Library, Upload, Share2, Sparkles, User, Mail, X, Check, Heart, Link, Copy, Users } from 'lucide-react';
import { supabase, db } from '../lib/supabase';

// Generate a book-themed referral code from user ID
const generateReferralCode = (userId) => {
  if (!userId) return null;
  const bookWords = [
    'CHAPTER', 'NOVEL', 'STORY', 'READER', 'PAGES', 'PROSE', 
    'SHELF', 'SPINE', 'COVER', 'WORDS', 'TALES', 'BOOKS',
    'PLOT', 'QUEST', 'SAGA', 'EPIC', 'VERSE', 'INK'
  ];
  const hash = parseInt(userId.replace(/-/g, '').substring(0, 4), 16);
  const word = bookWords[hash % bookWords.length];
  const digits = userId.replace(/-/g, '').substring(4, 7).toUpperCase();
  return `${word}${digits}`;
};

export default function AboutPage({ onNavigate, user }) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteStatus, setInviteStatus] = useState(null); // 'success' | 'error' | null
  const [inviteMessage, setInviteMessage] = useState('');
  const [referralCode, setReferralCode] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [inviteTab, setInviteTab] = useState('link'); // 'link' or 'email'

  // Load or generate referral code for logged-in user
  useEffect(() => {
    const loadReferralCode = async () => {
      if (!user) return;
      
      try {
        const { data: profile } = await db.getTasteProfile(user.id);
        
        if (profile?.referral_code) {
          setReferralCode(profile.referral_code);
        } else {
          // Generate and save a new referral code
          const newCode = generateReferralCode(user.id);
          setReferralCode(newCode);
          
          await db.upsertTasteProfile(user.id, {
            ...(profile || {}),
            referral_code: newCode
          });
        }
      } catch (error) {
        console.error('Error loading referral code:', error);
      }
    };
    
    loadReferralCode();
  }, [user]);

  const referralLink = referralCode ? `https://www.sarahsbooks.com/?ref=${referralCode}` : 'https://www.sarahsbooks.com';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

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
            I've spent years building this collection—books I couldn't stop thinking about long after I finished them. Browse by curator themes, or tell me what you're looking for. I love helping people find their next great read.
          </p>
        </div>

        {/* Journey Steps */}
        <div className="space-y-4 mb-8">
          
          {/* Step 1: DISCOVER */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#5F7252] text-white flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-xl text-[#4A5940] mb-1">Discover</h3>
                <p className="text-sm text-[#7A8F6C]">
                  Tell me what you're looking for, or browse curator theme collections. I'll help you find your next great read—whether it's from curator's picks or from the world's catalog.
                </p>
              </div>
            </div>
            <div className="mt-4 sm:ml-[4.5rem]">
              <button
                onClick={() => {
                  onNavigate('curator-themes');
                  window.scrollTo(0, 0);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E8EBE4] text-[#4A5940] text-sm font-medium hover:bg-[#D4DAD0] transition-colors"
              >
                Browse Curator Themes
              </button>
            </div>
          </div>

          {/* Step 2: COLLECT */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#5F7252] text-white flex items-center justify-center flex-shrink-0">
                <Library className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-xl text-[#4A5940] mb-1">Collect</h3>
                <p className="text-sm text-[#7A8F6C]">
                  Tell me what you've read. I'll meet you where you are—recommending from your taste while helping you discover what's next.
                </p>
              </div>
            </div>
            <div className="mt-4 sm:ml-[4.5rem]">
              <button
                onClick={() => {
                  onNavigate('my-books');
                  window.scrollTo(0, 0);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E8EBE4] text-[#4A5940] text-sm font-medium hover:bg-[#D4DAD0] transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload books you've read
              </button>
              
              {/* Rating Guide */}
              <div className="mt-4 pt-4 border-t border-[#E8EBE4]">
                <p className="text-xs font-medium text-[#4A5940] mb-3">Rating Guide</p>
                <div className="space-y-2">
                  {[
                    { hearts: 1, label: 'Not my cup of tea', colors: ['#F5E8E8'] },
                    { hearts: 2, label: 'Had some good moments', colors: ['#F5E8E8', '#E8CBCB'] },
                    { hearts: 3, label: 'Solid read, glad I read it', colors: ['#F5E8E8', '#E8CBCB', '#DBADAD'] },
                    { hearts: 4, label: 'Really loved this one', colors: ['#F5E8E8', '#E8CBCB', '#DBADAD', '#CE9494'] },
                    { hearts: 5, label: 'All-time favorite', colors: ['#F5E8E8', '#E8CBCB', '#DBADAD', '#CE9494', '#C97B7B'] },
                  ].map(({ hearts, label, colors }) => (
                    <div key={hearts} className="flex items-center gap-3">
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Heart
                            key={i}
                            className="w-3.5 h-3.5"
                            style={{
                              fill: i <= hearts ? colors[i - 1] : 'none',
                              color: i <= hearts ? colors[i - 1] : '#D4DAD0',
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-[#5F7252] italic">{label}</span>
                    </div>
                  ))}
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
            <div className="mt-4 sm:ml-[4.5rem] space-y-3">
              <button
                onClick={() => {
                  setShowInviteModal(true);
                  setInviteStatus(null);
                  setInviteMessage('');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E8EBE4] text-[#4A5940] text-sm font-medium hover:bg-[#D4DAD0] transition-colors"
              >
                <Mail className="w-4 h-4" />
                Invite a Friend
              </button>
              
              {/* Read with Friends Promotion */}
              <div className="p-4 bg-[#5F7252]/10 rounded-lg border border-[#5F7252]/20">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-[#5F7252]" />
                  <span className="text-sm font-medium text-[#4A5940]">Read with Friends</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#5F7252]/20 text-[#5F7252]">Coming Soon</span>
                </div>
                <p className="text-xs text-[#7A8F6C] mb-3">
                  Share recommendations directly with friends on Sarah's Books—a thoughtful way to connect over great books.
                </p>
                <button
                  onClick={() => {
                    onNavigate('read-with-friends');
                    window.scrollTo(0, 0);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#5F7252] text-white text-xs font-medium hover:bg-[#4A5940] transition-colors"
                >
                  Sign up for the Beta
                </button>
              </div>
            </div>
          </div>

          {/* Step 4: CURATE */}
          <div className="bg-[#5F7252]/10 rounded-xl p-6 border border-[#5F7252]/20">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#5F7252] text-white flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                  <h3 className="font-serif text-xl text-[#4A5940]">Curate</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#5F7252]/20 text-[#5F7252] self-start">Coming Soon</span>
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
            Whether from curator's picks or discoveries from the world's catalog.
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

            <p className="text-sm text-[#7A8F6C] mb-4">
              Share the love of reading!
            </p>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setInviteTab('link')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  inviteTab === 'link' 
                    ? 'bg-[#5F7252] text-white' 
                    : 'bg-[#F8F6EE] text-[#5F7252] hover:bg-[#E8EBE4]'
                }`}
              >
                <Link className="w-4 h-4" />
                Share Link
              </button>
              <button
                onClick={() => setInviteTab('email')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  inviteTab === 'email' 
                    ? 'bg-[#5F7252] text-white' 
                    : 'bg-[#F8F6EE] text-[#5F7252] hover:bg-[#E8EBE4]'
                }`}
              >
                <Mail className="w-4 h-4" />
                Send Email
              </button>
            </div>

            {/* Share Link Tab */}
            {inviteTab === 'link' && (
              <div className="space-y-4">
                <p className="text-xs text-[#96A888]">
                  Copy your personal referral link to share on social media or anywhere else.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={referralLink}
                    readOnly
                    className="flex-1 px-3 py-2.5 border border-[#E8EBE4] rounded-lg bg-[#F8F6EE] text-[#4A5940] text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                      linkCopied 
                        ? 'bg-green-500 text-white' 
                        : 'bg-[#5F7252] text-white hover:bg-[#4A5940]'
                    }`}
                  >
                    {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {linkCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                {!user && (
                  <p className="text-xs text-[#96A888] text-center">
                    Sign in to get your personal referral link and track who you've invited.
                  </p>
                )}
              </div>
            )}

            {/* Send Email Tab */}
            {inviteTab === 'email' && (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
