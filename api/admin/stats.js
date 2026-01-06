import { json, getSupabaseClient, verifyAdmin, getDateRange, MASTER_ADMIN_EMAIL } from './_shared.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const { client: supabase, error: configError } = getSupabaseClient();
    if (configError) {
      return json({ error: configError }, 500);
    }

    const authResult = await verifyAdmin(supabase, req.headers.get('authorization'));
    if (authResult.error) {
      return json({ error: authResult.error }, authResult.status);
    }

    // Parse query params for date filtering
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || 'lifetime';
    const startDate = url.searchParams.get('start');
    const endDate = url.searchParams.get('end');

    // Calculate date filter
    let dateFilter = null;
    if (startDate && endDate) {
      dateFilter = { start: startDate, end: endDate };
    } else if (period !== 'lifetime') {
      dateFilter = { start: getDateRange(period), end: new Date().toISOString() };
    }

    // Fetch all stats in parallel
    const [
      usersResult,
      profilesResult,
      queueResult,
      userBooksResult,
      recommendationsResult,
      sharedRecsResult,
      referralsResult,
      waitlistResult
    ] = await Promise.all([
      // Total users (from auth.users via admin API)
      supabase.auth.admin.listUsers({ perPage: 1000 }),
      
      // Taste profiles with demographics
      supabase.from('taste_profiles').select('*'),
      
      // Reading queue
      supabase.from('reading_queue').select('*'),
      
      // User books (read/rated)
      supabase.from('user_books').select('*'),
      
      // Recommendations
      supabase.from('recommendations').select('*'),
      
      // Shared recommendations
      supabase.from('shared_recommendations').select('*'),
      
      // Referrals
      supabase.from('referrals').select('*'),
      
      // Curator waitlist
      supabase.from('curator_waitlist').select('*')
    ]);

    // Exclude admin from stats
    const adminEmail = 'sarah@darkridge.com';
    const allUsers = usersResult.data?.users || [];
    const adminUser = allUsers.find(u => u.email === adminEmail);
    const adminId = adminUser?.id;
    
    const users = allUsers.filter(u => u.email !== adminEmail);
    const profiles = (profilesResult.data || []).filter(p => p.user_id !== adminId);
    const queue = (queueResult.data || []).filter(q => q.user_id !== adminId);
    const userBooks = (userBooksResult.data || []).filter(b => b.user_id !== adminId);
    const recommendations = (recommendationsResult.data || []).filter(r => r.user_id !== adminId);
    const sharedRecs = sharedRecsResult.data || [];
    const referrals = (referralsResult.data || []).filter(r => r.inviter_id !== adminId);
    const waitlist = (waitlistResult.data || []).filter(w => w.email !== adminEmail);

    // Helper to filter by date
    const filterByDate = (items, dateField = 'created_at') => {
      if (!dateFilter) return items;
      return items.filter(item => {
        const itemDate = new Date(item[dateField]);
        return itemDate >= new Date(dateFilter.start) && itemDate <= new Date(dateFilter.end);
      });
    };

    // Calculate period-specific counts
    const usersInPeriod = filterByDate(users);
    const queueInPeriod = filterByDate(queue);
    const userBooksInPeriod = filterByDate(userBooks);
    const recommendationsInPeriod = filterByDate(recommendations);
    const referralsInPeriod = filterByDate(referrals);

    // User stats
    const userStats = {
      total: users.length,
      inPeriod: usersInPeriod.length,
      withProfiles: profiles.length
    };

    // Queue stats - separate by status
    // want_to_read/reading = Books Queued (want to read)
    // finished = Books Read (finished in-app)
    // already_read = Books in Collection (imported or marked as already read)
    const queuedBooks = queue.filter(q => q.status === 'want_to_read' || q.status === 'reading');
    const finishedBooks = queue.filter(q => q.status === 'finished');
    const alreadyReadBooks = queue.filter(q => q.status === 'already_read');
    
    const queueStats = {
      totalBooks: queue.length,
      queued: queuedBooks.length,
      queuedUsers: new Set(queuedBooks.map(q => q.user_id)).size,
      finished: finishedBooks.length,
      finishedUsers: new Set(finishedBooks.map(q => q.user_id)).size,
      alreadyRead: alreadyReadBooks.length,
      alreadyReadUsers: new Set(alreadyReadBooks.map(q => q.user_id)).size,
      inPeriod: queueInPeriod.length,
      uniqueBooks: new Set(queue.map(q => q.book_title?.toLowerCase())).size,
      avgPerUser: profiles.length > 0 ? (queue.length / profiles.length).toFixed(1) : 0
    };

    // Collection stats (all books in user_books)
    const collectionStats = {
      totalBooks: userBooks.length,
      inPeriod: userBooksInPeriod.length,
      uniqueBooks: new Set(userBooks.map(b => b.book_title?.toLowerCase())).size,
      usersWithCollection: new Set(userBooks.map(b => b.user_id)).size
    };

    // Read/rated stats
    const readBooks = userBooks.filter(b => b.status === 'read');
    const ratedBooks = userBooks.filter(b => b.rating != null);
    const readStats = {
      totalFinished: readBooks.length,
      inPeriod: filterByDate(readBooks).length,
      totalRated: ratedBooks.length,
      avgRating: ratedBooks.length > 0 
        ? (ratedBooks.reduce((sum, b) => sum + b.rating, 0) / ratedBooks.length).toFixed(1) 
        : 0
    };

    // Recommendation stats
    const recStats = {
      total: recommendations.length,
      users: new Set(recommendations.map(r => r.user_id)).size,
      inPeriod: recommendationsInPeriod.length,
      shared: sharedRecs.length,
      // TODO: Track accepted recommendations when source column is added
      accepted: 0,
      acceptRate: 0
    };

    // Referral stats with K-factor
    const acceptedReferrals = referrals.filter(r => r.status === 'accepted');
    const referralStats = {
      sent: referrals.length,
      accepted: acceptedReferrals.length,
      inPeriod: referralsInPeriod.length,
      conversionRate: referrals.length > 0 
        ? (acceptedReferrals.length / referrals.length).toFixed(2) 
        : 0,
      platformKFactor: users.length > 0 
        ? (acceptedReferrals.length / users.length).toFixed(2) 
        : 0
    };

    // Top referrers (K-factor leaderboard)
    const referrerMap = new Map();
    referrals.forEach(r => {
      if (!r.inviter_id) return;
      if (!referrerMap.has(r.inviter_id)) {
        referrerMap.set(r.inviter_id, { sent: 0, accepted: 0 });
      }
      referrerMap.get(r.inviter_id).sent++;
      if (r.status === 'accepted') {
        referrerMap.get(r.inviter_id).accepted++;
      }
    });

    // Get emails for top referrers
    const topReferrers = [];
    for (const [userId, stats] of referrerMap.entries()) {
      const user = users.find(u => u.id === userId);
      if (user && stats.sent > 0) {
        topReferrers.push({
          email: user.email,
          sent: stats.sent,
          accepted: stats.accepted,
          kFactor: (stats.accepted / stats.sent).toFixed(2)
        });
      }
    }
    topReferrers.sort((a, b) => b.accepted - a.accepted);
    referralStats.topReferrers = topReferrers.slice(0, 10);

    // Curator waitlist stats
    const waitlistStats = {
      total: waitlist.length,
      recent: waitlist
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)
        .map(w => ({ email: w.email, createdAt: w.created_at }))
    };

    // Demographics
    const currentYear = new Date().getFullYear();
    const profilesWithAge = profiles.filter(p => p.birth_year);
    const ages = profilesWithAge.map(p => currentYear - p.birth_year);
    
    const ageRanges = [
      { range: '13-17', min: 13, max: 17, count: 0 },
      { range: '18-24', min: 18, max: 24, count: 0 },
      { range: '25-34', min: 25, max: 34, count: 0 },
      { range: '35-44', min: 35, max: 44, count: 0 },
      { range: '45-54', min: 45, max: 54, count: 0 },
      { range: '55+', min: 55, max: 200, count: 0 }
    ];
    ages.forEach(age => {
      const bucket = ageRanges.find(r => age >= r.min && age <= r.max);
      if (bucket) bucket.count++;
    });

    // Country distribution
    const countryMap = new Map();
    profiles.forEach(p => {
      if (p.country) {
        countryMap.set(p.country, (countryMap.get(p.country) || 0) + 1);
      }
    });
    const byCountry = Array.from(countryMap.entries())
      .map(([country, count]) => ({ 
        country, 
        count, 
        percent: Math.round((count / profiles.length) * 100) 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Genre distribution
    const genreMap = new Map();
    profiles.forEach(p => {
      (p.favorite_genres || []).forEach(genre => {
        genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
      });
    });
    const topGenres = Array.from(genreMap.entries())
      .map(([genre, count]) => ({ 
        genre, 
        count, 
        percent: Math.round((count / profiles.length) * 100) 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const demographics = {
      byCountry,
      averageAge: ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null,
      ageDistribution: ageRanges.map(r => ({
        range: r.range,
        count: r.count,
        percent: profilesWithAge.length > 0 ? Math.round((r.count / profilesWithAge.length) * 100) : 0
      })),
      topGenres
    };

    // Data quality score
    const profilesWithLocation = profiles.filter(p => p.city || p.country).length;
    const profilesWithGenres = profiles.filter(p => p.favorite_genres?.length > 0).length;
    const profilesWithAgeCount = profiles.filter(p => p.birth_year).length;
    const usersWithQueue = new Set(queue.map(q => q.user_id)).size;
    const usersWithBooks = new Set(userBooks.map(b => b.user_id)).size;
    
    const profileCompleteness = profiles.length > 0 
      ? Math.round(((profilesWithLocation + profilesWithGenres + profilesWithAgeCount) / (profiles.length * 3)) * 100)
      : 0;
    const engagementRate = users.length > 0 
      ? Math.round(((usersWithQueue + usersWithBooks) / (users.length * 2)) * 100)
      : 0;
    const ratingDensity = usersWithBooks > 0 
      ? Math.min(100, Math.round((ratedBooks.length / usersWithBooks) * 20))
      : 0;
    const referralHealth = Math.min(100, Math.round(parseFloat(referralStats.platformKFactor) * 500));

    const dataQuality = {
      profileCompleteness,
      engagementRate,
      ratingDensity,
      referralHealth,
      overall: Math.round((profileCompleteness + engagementRate + ratingDensity + referralHealth) / 4)
    };

    return json({
      timestamp: new Date().toISOString(),
      period,
      dateFilter,
      dataQualityScore: dataQuality.overall,
      users: userStats,
      queue: queueStats,
      collection: collectionStats,
      read: readStats,
      recommendations: recStats,
      referrals: referralStats,
      curatorWaitlist: waitlistStats,
      demographics,
      dataQuality
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    return json({ error: 'Internal server error', details: error.message }, 500);
  }
}
