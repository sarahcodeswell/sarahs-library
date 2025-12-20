// Analytics API endpoint for collecting user interaction data
// This runs as a Vercel serverless function

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase client with service role key for write access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { eventType, eventData, userId, sessionId } = req.body;

    if (!eventType) {
      return res.status(400).json({ error: 'Event type is required' });
    }

    // Route to appropriate table based on event type
    switch (eventType) {
      case 'recommendation_saved':
      case 'recommendation_save_failed':
      case 'recommendation_expanded':
      case 'buy_dropdown_opened':
      case 'goodreads_link_click':
      case 'bookshop_link_click':
      case 'share_recommendation':
      case 'collection_book_expanded':
        await trackBookInteraction(eventType, eventData, userId);
        break;

      case 'theme_filter_selected':
      case 'theme_filter_removed':
        await trackThemeInteraction(eventType, eventData, userId);
        break;

      case 'collection_search':
      case 'alphabet_navigation_click':
        await trackSearchQuery(eventType, eventData, userId);
        break;

      case 'session_start':
      case 'session_end':
        await trackSession(eventType, eventData, userId, sessionId);
        break;

      default:
        // Generic event tracking
        await trackGenericEvent(eventType, eventData, userId, sessionId);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({ error: 'Failed to track event' });
  }
}

async function trackBookInteraction(eventType, eventData, userId) {
  const interactionTypeMap = {
    'recommendation_saved': 'save',
    'recommendation_expanded': 'expand',
    'buy_dropdown_opened': 'buy_click',
    'goodreads_link_click': 'review_click',
    'bookshop_link_click': 'buy_click',
    'share_recommendation': 'share',
    'collection_book_expanded': 'expand'
  };

  await supabase.from('book_interactions').insert({
    user_id: userId || null,
    book_title: eventData.book_title || eventData.title,
    book_author: eventData.book_author || eventData.author,
    interaction_type: interactionTypeMap[eventType] || eventType,
    chat_mode: eventData.chat_mode,
    source: eventData.source || 'unknown',
    metadata: eventData
  });
}

async function trackThemeInteraction(eventType, eventData, userId) {
  const action = eventType === 'theme_filter_selected' ? 'selected' : 'removed';
  
  await supabase.from('theme_interactions').insert({
    user_id: userId || null,
    theme_key: eventData.theme,
    action: action
  });
}

async function trackSearchQuery(eventType, eventData, userId) {
  await supabase.from('search_queries').insert({
    user_id: userId || null,
    query_text: eventData.query || eventData.letter || '',
    chat_mode: eventData.chat_mode,
    selected_themes: eventData.selected_themes || [],
    result_count: eventData.result_count
  });
}

async function trackSession(eventType, eventData, userId, sessionId) {
  if (eventType === 'session_start') {
    await supabase.from('user_sessions').insert({
      user_id: userId || null,
      session_id: sessionId || generateSessionId(),
      user_agent: eventData.user_agent,
      screen_width: eventData.screen_width,
      screen_height: eventData.screen_height
    });
  } else if (eventType === 'session_end') {
    await supabase
      .from('user_sessions')
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: eventData.duration_seconds
      })
      .eq('session_id', sessionId);
  }
}

async function trackGenericEvent(eventType, eventData, userId, sessionId) {
  await supabase.from('user_events').insert({
    user_id: userId || null,
    session_id: sessionId || generateSessionId(),
    event_type: eventType,
    event_data: eventData
  });
}

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
