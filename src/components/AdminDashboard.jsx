import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, MessageSquare, BookMarked, ShoppingBag, Activity, TrendingUp, Database } from 'lucide-react';
import { db } from '../lib/supabase';
import { populateMasterAdminReadingQueue, checkMasterAdminReadingQueue } from '../lib/adminUtils';

export default function AdminDashboard({ onNavigate, user }) {
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalReadingQueueItems: 0,
    totalUserBooks: 0,
    totalChatMessages: 0,
    loading: true
  });
  const [queueStatus, setQueueStatus] = useState(null);
  const [isPopulating, setIsPopulating] = useState(false);
  const [populationResult, setPopulationResult] = useState(null);

  useEffect(() => {
    loadMetrics();
    checkQueue();
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

  const checkQueue = async () => {
    if (!user) return;
    const status = await checkMasterAdminReadingQueue(user.id, user.email);
    setQueueStatus(status);
  };

  const handlePopulateQueue = async () => {
    if (!user) return;
    setIsPopulating(true);
    setPopulationResult(null);
    
    const result = await populateMasterAdminReadingQueue(user.id, user.email);
    setPopulationResult(result);
    setIsPopulating(false);
    
    // Refresh queue status
    await checkQueue();
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

        {/* Reading Queue Population */}
        {queueStatus && (
          <div className="bg-white rounded-xl border border-[#E8EBE4] p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-[#5F7252]/10 rounded-lg">
                <Database className="w-6 h-6 text-[#5F7252]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#4A5940]" style={{ fontFamily: 'Crimson Pro' }}>
                  Master Admin Reading Queue
                </h2>
                <p className="text-xs text-[#7A8F6C]">
                  Populate your reading queue with all 200 curated books
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#F8F6EE] rounded-lg">
                <div className="text-sm">
                  <span className="text-[#4A5940] font-medium">Current finished books: </span>
                  <span className="text-[#5F7252]">{queueStatus.currentCount}</span>
                </div>
                <div className="text-sm">
                  <span className="text-[#4A5940] font-medium">Expected: </span>
                  <span className="text-[#5F7252]">{queueStatus.expectedCount}</span>
                </div>
              </div>

              {queueStatus.needsPopulation && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800 mb-2">
                    ⚠️ Your reading queue is missing {queueStatus.missing} books. Click below to populate it with all curated books.
                  </p>
                  <p className="text-xs text-amber-700">
                    This will ensure recommendations don't include books from your collection.
                  </p>
                </div>
              )}

              {populationResult && (
                <div className={`p-3 rounded-lg ${populationResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className={`text-xs ${populationResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {populationResult.success ? (
                      <>
                        ✅ Successfully added {populationResult.added} books!
                        {populationResult.skipped > 0 && ` (${populationResult.skipped} already existed)`}
                        {populationResult.errors > 0 && ` (${populationResult.errors} errors)`}
                      </>
                    ) : (
                      `❌ Error: ${populationResult.error}`
                    )}
                  </p>
                </div>
              )}

              <button
                onClick={handlePopulateQueue}
                disabled={isPopulating || !queueStatus.needsPopulation}
                className="w-full px-4 py-2.5 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPopulating ? 'Populating...' : queueStatus.needsPopulation ? 'Populate Reading Queue' : 'Reading Queue Up to Date ✓'}
              </button>
            </div>
          </div>
        )}

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
