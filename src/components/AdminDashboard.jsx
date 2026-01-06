import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, BookOpen, BookMarked, Heart, Share2, UserPlus, RefreshCw, TrendingUp, MapPin, Calendar, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PERIODS = [
  { value: '1d', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'lifetime', label: 'All time' }
];

function StatCard({ title, value, subtitle, icon: Icon, color = 'bg-[#5F7252]' }) {
  return (
    <div className="bg-white rounded-xl border border-[#E8EBE4] p-4 sm:p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 ${color}/10 rounded-lg`}>
          <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
      <div className="text-2xl font-semibold text-[#4A5940] mb-1">{value}</div>
      <div className="text-sm font-medium text-[#5F7252]">{title}</div>
      {subtitle && <div className="text-xs text-[#96A888] mt-1">{subtitle}</div>}
    </div>
  );
}

function ProgressBar({ label, value, percent, color = 'bg-[#5F7252]' }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#5F7252]">{label}</span>
        <span className="text-[#96A888]">{value} ({percent}%)</span>
      </div>
      <div className="h-2 bg-[#E8EBE4] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default function AdminDashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('lifetime');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/admin/stats?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-[#5F7252] animate-spin mx-auto mb-3" />
          <div className="text-[#7A8F6C]">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">Error: {error}</div>
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] transition-colors mb-4 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-[#4A5940]" style={{ fontFamily: 'Crimson Pro' }}>
                  Admin Dashboard
                </h1>
                {stats?.dataQualityScore && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    stats.dataQualityScore >= 70 ? 'bg-green-100 text-green-700' :
                    stats.dataQualityScore >= 40 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    Quality: {stats.dataQualityScore}/100
                  </span>
                )}
              </div>
              {lastUpdated && (
                <p className="text-xs text-[#96A888] mt-1">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-2 border border-[#D4DAD0] rounded-lg text-sm text-[#4A5940] bg-white focus:outline-none focus:ring-2 focus:ring-[#5F7252]"
              >
                {PERIODS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <button
                onClick={fetchStats}
                disabled={loading}
                className="p-2 border border-[#D4DAD0] rounded-lg hover:bg-[#F8F6EE] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-[#5F7252] ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard
            title="Total Users"
            value={stats?.users?.total || 0}
            subtitle={period !== 'lifetime' ? `+${stats?.users?.inPeriod || 0} in period` : `${stats?.users?.withProfiles || 0} with profiles`}
            icon={Users}
          />
          <StatCard
            title="Books Queued"
            value={stats?.queue?.totalBooks || 0}
            subtitle={`Avg ${stats?.queue?.avgPerUser || 0} per user`}
            icon={BookMarked}
          />
          <StatCard
            title="Books Read"
            value={stats?.read?.totalFinished || 0}
            subtitle={`${stats?.read?.totalRated || 0} rated (avg ${stats?.read?.avgRating || 0}★)`}
            icon={BookOpen}
          />
          <StatCard
            title="Curator Waitlist"
            value={stats?.curatorWaitlist?.total || 0}
            subtitle="Pending curators"
            icon={UserPlus}
            color="bg-violet-500"
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <StatCard
            title="Recommendations"
            value={stats?.recommendations?.total || 0}
            subtitle={`${stats?.recommendations?.shared || 0} shared`}
            icon={Heart}
          />
          <StatCard
            title="Referrals"
            value={`${stats?.referrals?.accepted || 0} / ${stats?.referrals?.sent || 0}`}
            subtitle={`${Math.round((stats?.referrals?.conversionRate || 0) * 100)}% conversion`}
            icon={Share2}
          />
          <StatCard
            title="Platform K-Factor"
            value={stats?.referrals?.platformKFactor || '0.00'}
            subtitle="Viral coefficient"
            icon={TrendingUp}
            color="bg-emerald-500"
          />
          <StatCard
            title="Avg Age"
            value={stats?.demographics?.averageAge || '—'}
            subtitle="Years old"
            icon={Calendar}
          />
        </div>

        {/* Demographics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Countries */}
          <div className="bg-white rounded-xl border border-[#E8EBE4] p-5">
            <h3 className="text-sm font-semibold text-[#4A5940] mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Users by Country
            </h3>
            {stats?.demographics?.byCountry?.length > 0 ? (
              <div className="space-y-2">
                {stats.demographics.byCountry.slice(0, 5).map((c, i) => (
                  <ProgressBar
                    key={i}
                    label={c.country}
                    value={c.count}
                    percent={c.percent}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#96A888] italic">No location data yet</p>
            )}
          </div>

          {/* Age Distribution */}
          <div className="bg-white rounded-xl border border-[#E8EBE4] p-5">
            <h3 className="text-sm font-semibold text-[#4A5940] mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Age Distribution
            </h3>
            {stats?.demographics?.ageDistribution?.some(a => a.count > 0) ? (
              <div className="space-y-2">
                {stats.demographics.ageDistribution.map((a, i) => (
                  <ProgressBar
                    key={i}
                    label={a.range}
                    value={a.count}
                    percent={a.percent}
                    color={a.range === '25-34' ? 'bg-[#5F7252]' : 'bg-[#96A888]'}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#96A888] italic">No age data yet</p>
            )}
          </div>
        </div>

        {/* Top Genres */}
        <div className="bg-white rounded-xl border border-[#E8EBE4] p-5 mb-6">
          <h3 className="text-sm font-semibold text-[#4A5940] mb-4">Top Genres</h3>
          {stats?.demographics?.topGenres?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {stats.demographics.topGenres.slice(0, 6).map((g, i) => (
                <ProgressBar
                  key={i}
                  label={g.genre}
                  value={g.count}
                  percent={g.percent}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#96A888] italic">No genre preferences yet</p>
          )}
        </div>

        {/* K-Factor Leaderboard */}
        {stats?.referrals?.topReferrers?.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E8EBE4] p-5 mb-6">
            <h3 className="text-sm font-semibold text-[#4A5940] mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top Referrers (K-Factor Leaderboard)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[#96A888] border-b border-[#E8EBE4]">
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">User</th>
                    <th className="pb-2 font-medium text-right">Sent</th>
                    <th className="pb-2 font-medium text-right">Accepted</th>
                    <th className="pb-2 font-medium text-right">K-Factor</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.referrals.topReferrers.map((r, i) => (
                    <tr key={i} className="border-b border-[#E8EBE4] last:border-0">
                      <td className="py-2 text-[#5F7252] font-medium">{i + 1}</td>
                      <td className="py-2 text-[#4A5940]">{r.email}</td>
                      <td className="py-2 text-right text-[#7A8F6C]">{r.sent}</td>
                      <td className="py-2 text-right text-[#5F7252] font-medium">{r.accepted}</td>
                      <td className="py-2 text-right">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          parseFloat(r.kFactor) >= 0.5 ? 'bg-green-100 text-green-700' :
                          parseFloat(r.kFactor) >= 0.25 ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {r.kFactor}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Data Quality Breakdown */}
        <div className="bg-white rounded-xl border border-[#E8EBE4] p-5 mb-6">
          <h3 className="text-sm font-semibold text-[#4A5940] mb-4">Data Quality Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            <ProgressBar
              label="Profile Completeness"
              value=""
              percent={stats?.dataQuality?.profileCompleteness || 0}
            />
            <ProgressBar
              label="Engagement Rate"
              value=""
              percent={stats?.dataQuality?.engagementRate || 0}
            />
            <ProgressBar
              label="Rating Density"
              value=""
              percent={stats?.dataQuality?.ratingDensity || 0}
            />
            <ProgressBar
              label="Referral Health"
              value=""
              percent={stats?.dataQuality?.referralHealth || 0}
              color="bg-emerald-500"
            />
          </div>
        </div>

        {/* Curator Waitlist */}
        {stats?.curatorWaitlist?.recent?.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E8EBE4] p-5">
            <h3 className="text-sm font-semibold text-[#4A5940] mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Recent Curator Waitlist Signups
            </h3>
            <div className="space-y-2">
              {stats.curatorWaitlist.recent.map((w, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-[#E8EBE4] last:border-0">
                  <span className="text-[#4A5940]">{w.email}</span>
                  <span className="text-xs text-[#96A888]">
                    {new Date(w.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
