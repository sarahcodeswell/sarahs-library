import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, MessageSquare, BookMarked, ShoppingBag, Activity, TrendingUp } from 'lucide-react';
import { db } from '../lib/supabase';

export default function AdminDashboard({ onNavigate, user }) {
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalReadingQueueItems: 0,
    totalUserBooks: 0,
    totalChatMessages: 0,
    loading: true
  });

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      // Note: Database counts require admin RLS policies or service role
      // For now, showing note to use Supabase dashboard for detailed DB metrics
      
      setMetrics({
        totalUsers: 'See Supabase',
        totalReadingQueueItems: 'See Supabase',
        totalUserBooks: 'See Supabase',
        totalChatMessages: 'See Vercel Analytics',
        loading: false
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
      setMetrics(prev => ({ ...prev, loading: false }));
    }
  };

  if (metrics.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
        <div className="text-[#7A8F6C]">Loading metrics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] transition-colors mb-4 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          <h1 className="text-2xl font-semibold text-[#4A5940] mb-2" style={{ fontFamily: 'Crimson Pro' }}>
            Admin Dashboard
          </h1>
          <p className="text-sm text-[#7A8F6C]">Analytics and metrics for Sarah's Books</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Supabase Database */}
          <div className="bg-white rounded-xl border border-[#E8EBE4] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-[#5F7252]/10 rounded-lg">
                <Users className="w-6 h-6 text-[#5F7252]" />
              </div>
            </div>
            <div className="text-lg font-semibold text-[#4A5940] mb-2">Database Metrics</div>
            <div className="text-xs text-[#7A8F6C] leading-relaxed mb-3">
              View user accounts, saved books, reading queues, and user-generated content in your Supabase dashboard.
            </div>
            <a 
              href="https://supabase.com/dashboard/project/nibaydimofsavkkepnku/editor" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-[#5F7252] hover:text-[#4A5940] font-medium underline"
            >
              Open Supabase Dashboard →
            </a>
          </div>

          {/* Vercel Analytics */}
          <div className="bg-white rounded-xl border border-[#E8EBE4] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-[#5F7252]/10 rounded-lg">
                <Activity className="w-6 h-6 text-[#5F7252]" />
              </div>
            </div>
            <div className="text-lg font-semibold text-[#4A5940] mb-2">User Analytics</div>
            <div className="text-xs text-[#7A8F6C] leading-relaxed mb-3">
              View page views, sessions, chat messages, and custom event tracking in your Vercel Analytics dashboard.
            </div>
            <a 
              href="https://vercel.com/sarahcodeswell/sarahs-library/analytics" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-[#5F7252] hover:text-[#4A5940] font-medium underline"
            >
              Open Vercel Analytics →
            </a>
          </div>

          {/* Vercel Analytics Note */}
          <div className="bg-white rounded-xl border border-[#E8EBE4] p-6 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-[#5F7252]/10 rounded-lg">
                <ShoppingBag className="w-6 h-6 text-[#5F7252]" />
              </div>
            </div>
            <div className="text-sm text-[#4A5940] font-medium mb-2">Purchase & Click Tracking</div>
            <div className="text-xs text-[#7A8F6C] leading-relaxed">
              Detailed click tracking (Buy, Listen, Library links) and conversion metrics are available in your{' '}
              <a 
                href="https://vercel.com/sarahcodeswell/sarahs-library/analytics" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#5F7252] hover:text-[#4A5940] underline"
              >
                Vercel Analytics Dashboard
              </a>
              . Track events like: bookshop_link_click, kindle_link_click, libby_link_click, recommendation_saved, and more.
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-xl border border-[#E8EBE4] p-6">
          <h2 className="text-lg font-semibold text-[#4A5940] mb-4" style={{ fontFamily: 'Crimson Pro' }}>
            Analytics Resources
          </h2>
          <div className="space-y-3 text-sm text-[#5F7252]">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-[#5F7252] rounded-full mt-1.5 flex-shrink-0" />
              <div>
                <span className="font-medium">Vercel Analytics:</span> Real-time page views, user sessions, and custom event tracking
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-[#5F7252] rounded-full mt-1.5 flex-shrink-0" />
              <div>
                <span className="font-medium">Database Metrics:</span> User accounts, saved books, chat history, and user-generated content
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-[#5F7252] rounded-full mt-1.5 flex-shrink-0" />
              <div>
                <span className="font-medium">Tracked Events:</span> session_start, chat_message, recommendation_saved, bookshop_link_click, kindle_link_click, libby_link_click, librofm_link_click, audible_link_click, and more
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
