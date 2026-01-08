// Lightweight ping endpoint for uptime monitoring
// Use this for UptimeRobot to avoid API costs from full health checks
export default async function handler(req, res) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    let dbStatus = 'unknown';
    let dbResponseTime = null;
    
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const start = Date.now();
      const { error } = await supabase.from('user_profiles').select('count').limit(1);
      dbResponseTime = Date.now() - start;
      dbStatus = error ? 'error' : 'ok';
    }

    res.status(dbStatus === 'ok' ? 200 : 503).json({
      status: dbStatus === 'ok' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        responseTime: dbResponseTime ? `${dbResponseTime}ms` : null
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
}
