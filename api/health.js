import { createClient } from '@supabase/supabase-js';

// Health check endpoint for monitoring
export default async function handler(req, res) {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      
      // Database connectivity check
      database: {
        status: 'unknown',
        responseTime: null
      },
      
      // External API checks
      apis: {
        anthropic: { status: 'unknown', responseTime: null },
        openai: { status: 'unknown', responseTime: null }
      },
      
      // System resources
      system: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
          external: Math.round(process.memoryUsage().external / 1024 / 1024) // MB
        },
        cpu: process.cpuUsage()
      }
    };

    // Check database connectivity
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const start = Date.now();
        const { error } = await supabase.from('user_profiles').select('count').limit(1);
        const responseTime = Date.now() - start;
        
        healthCheck.database = {
          status: error ? 'unhealthy' : 'healthy',
          responseTime: `${responseTime}ms`
        };
      } else {
        healthCheck.database.status = 'misconfigured';
      }
    } catch (error) {
      healthCheck.database = {
        status: 'unhealthy',
        error: error.message
      };
    }

    // Check Anthropic API
    try {
      const start = Date.now();
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }]
        })
      });
      
      const responseTime = Date.now() - start;
      healthCheck.apis.anthropic = {
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime: `${responseTime}ms`
      };
    } catch (error) {
      healthCheck.apis.anthropic = {
        status: 'unhealthy',
        error: error.message
      };
    }

    // Check OpenAI API
    try {
      const start = Date.now();
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY || ''}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: 'test'
        })
      });
      
      const responseTime = Date.now() - start;
      healthCheck.apis.openai = {
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime: `${responseTime}ms`
      };
    } catch (error) {
      healthCheck.apis.openai = {
        status: 'unhealthy',
        error: error.message
      };
    }

    // Determine overall health
    const allHealthy = [
      healthCheck.database.status === 'healthy',
      healthCheck.apis.anthropic.status === 'healthy',
      healthCheck.apis.openai.status === 'healthy'
    ].every(Boolean);

    const statusCode = allHealthy ? 200 : 503;
    healthCheck.status = allHealthy ? 'healthy' : 'degraded';

    res.status(statusCode).json(healthCheck);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
}
