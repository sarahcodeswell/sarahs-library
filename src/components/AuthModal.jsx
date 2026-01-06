import React, { useState } from 'react';
import { X, Mail, Sparkles, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setError('Authentication not configured');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        const errorMsg = error.message || 'Unable to send sign-in link';
        if (errorMsg.includes('rate limit') || error.status === 429) {
          setError('Too many requests. Please wait a few minutes and try again.');
        } else if (error.status === 500) {
          setError('Email service temporarily unavailable. Please try again later.');
        } else {
          setError(errorMsg);
        }
        console.error('Magic link error:', error);
      } else {
        setMagicLinkSent(true);
      }
    } catch (_err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider) => {
    if (!supabase) {
      setError('Authentication not configured');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: false
        }
      });
      
      if (error) {
        console.error('OAuth error:', error);
        setError(error.message);
        setLoading(false);
      }
    } catch (err) {
      console.error('OAuth exception:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    setMagicLinkSent(false);
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-[#E8EBE4]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-serif text-[#4A5940]">
            {magicLinkSent ? 'Check Your Email' : 'Welcome'}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-[#E8EBE4] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#96A888]" />
          </button>
        </div>

        {magicLinkSent ? (
          /* Success State - Magic Link Sent */
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-[#4A5940] font-medium mb-2">
              Magic link sent to {email}
            </p>
            <p className="text-sm text-[#7A8F6C] mb-6">
              Click the link in your email to sign in. You can close this window.
            </p>
            <button
              onClick={() => {
                setMagicLinkSent(false);
                setEmail('');
              }}
              className="text-sm text-[#5F7252] hover:text-[#4A5940] font-medium"
            >
              Use a different email
            </button>
          </div>
        ) : (
          /* Sign In Form */
          <>
            <p className="text-sm text-[#7A8F6C] mb-6">
              Discover great reads, build your library, and share recommendations
            </p>

            {/* OAuth Buttons */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleOAuthSignIn('google')}
                type="button"
                disabled={loading}
                className="w-full py-2.5 px-4 border-2 border-[#E8EBE4] rounded-lg hover:bg-[#F8F6EE] transition-colors flex items-center justify-center gap-3 font-medium text-[#4A5940] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[#E8EBE4] border-t-[#5F7252] rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>
              
              <div className="relative">
                <button
                  type="button"
                  disabled={true}
                  className="w-full py-2.5 px-4 border-2 border-[#1D1D1F]/30 bg-[#1D1D1F]/50 rounded-lg flex items-center justify-center gap-3 font-medium text-white/70 cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Continue with Apple
                </button>
                <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-[#5F7252] text-white text-[10px] font-medium rounded-full">
                  Coming Soon
                </span>
              </div>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E8EBE4]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-[#96A888]">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleMagicLink} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5F7252] mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#96A888]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-[#E8EBE4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5F7252] focus:border-transparent"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-2.5 bg-[#5F7252] text-white rounded-lg font-medium hover:bg-[#4A5940] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Send Magic Link
                  </>
                )}
              </button>
            </form>

            <p className="mt-4 text-xs text-center text-[#96A888]">
              We'll email you a secure link to sign in—no password needed.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
