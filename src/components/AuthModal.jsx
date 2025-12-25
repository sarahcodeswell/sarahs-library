import React, { useState } from 'react';
import { X, Mail, Lock } from 'lucide-react';
import { auth, supabase } from '../lib/supabase';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (mode === 'signup') {
        result = await auth.signUp(email, password);
      } else {
        result = await auth.signIn(email, password);
      }

      if (result.error) {
        setError(result.error.message);
      } else {
        onAuthSuccess(result.data.user);
        onClose();
      }
    } catch (err) {
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
      if (import.meta.env.DEV) {
        console.log('Starting OAuth sign in with:', provider);
      }
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}${window.location.pathname}`
        }
      });
      
      if (import.meta.env.DEV) {
        console.log('OAuth response:', { data, error });
      }
      
      if (error) {
        console.error('OAuth error:', error);
        setError(error.message);
        setLoading(false);
      }
      // If successful, the page will redirect to Google
      // Loading state will persist until redirect
    } catch (err) {
      console.error('OAuth exception:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-[#E8EBE4]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-serif text-[#4A5940]">
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#E8EBE4] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#96A888]" />
          </button>
        </div>

        <p className="text-sm text-[#7A8F6C] mb-6">
          {mode === 'signin'
            ? 'Discover great reads, build your library, and share recommendations'
            : 'Discover great reads, build your library, and share recommendations'}
        </p>

        {/* OAuth Buttons */}
        <div className="mb-6">
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
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E8EBE4]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-[#96A888]">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-[#5F7252] mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#96A888]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-[#E8EBE4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5F7252] focus:border-transparent"
                placeholder="••••••••"
                required
                minLength={6}
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
            disabled={loading}
            className="w-full py-2.5 bg-[#5F7252] text-white rounded-lg font-medium hover:bg-[#4A5940] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
            }}
            className="text-sm text-[#5F7252] hover:text-[#4A5940] font-medium"
          >
            {mode === 'signin'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
