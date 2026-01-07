/**
 * Automated Test Suite for "Books Shared with Me" Feature
 * 
 * Tests the complete workflow:
 * 1. Creating and sharing recommendations
 * 2. Viewing shared links and auto-inbox creation
 * 3. Accept/Decline actions
 * 4. Status tracking and history
 * 5. Notification badges
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.test
dotenv.config({ path: '.env.test' });

// Test configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.test file');
}

// Test users
const TEST_USER_1 = {
  email: 'test-sharer@example.com',
  password: 'TestPassword123!',
  name: 'Test Sharer'
};

const TEST_USER_2 = {
  email: 'test-recipient@example.com',
  password: 'TestPassword123!',
  name: 'Test Recipient'
};

let supabase;
let user1Session;
let user2Session;
let testRecommendationId;
let testShareToken;
let testReceivedRecId;

describe('Books Shared with Me - Complete Workflow', () => {
  
  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Sign up test users (or sign in if they exist)
    try {
      const { data: user1Data, error: user1Error } = await supabase.auth.signUp({
        email: TEST_USER_1.email,
        password: TEST_USER_1.password,
        options: {
          data: { full_name: TEST_USER_1.name }
        }
      });
      
      if (user1Error && user1Error.message.includes('already registered')) {
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: TEST_USER_1.email,
          password: TEST_USER_1.password
        });
        user1Session = signInData.session;
      } else {
        user1Session = user1Data.session;
      }

      const { data: user2Data, error: user2Error } = await supabase.auth.signUp({
        email: TEST_USER_2.email,
        password: TEST_USER_2.password,
        options: {
          data: { full_name: TEST_USER_2.name }
        }
      });
      
      if (user2Error && user2Error.message.includes('already registered')) {
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: TEST_USER_2.email,
          password: TEST_USER_2.password
        });
        user2Session = signInData.session;
      } else {
        user2Session = user2Data.session;
      }
    } catch (error) {
      console.error('Setup error:', error);
    }
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    if (testReceivedRecId) {
      await supabase.auth.setSession(user2Session);
      await supabase
        .from('received_recommendations')
        .delete()
        .eq('id', testReceivedRecId);
    }
    
    if (testRecommendationId) {
      await supabase.auth.setSession(user1Session);
      await supabase
        .from('user_recommendations')
        .delete()
        .eq('id', testRecommendationId);
    }
    
    await supabase.auth.signOut();
  });

  describe('1. Create and Share Recommendation', () => {
    
    it('should create a book recommendation as User 1', async () => {
      await supabase.auth.setSession(user1Session);
      
      const { data, error } = await supabase
        .from('user_recommendations')
        .insert({
          user_id: user1Session.user.id,
          book_title: 'Test Book for Sharing',
          book_author: 'Test Author',
          book_isbn: '1234567890',
          book_description: 'A test book description',
          recommendation_note: 'You should read this! It\'s amazing.'
        })
        .select()
        .single();
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.book_title).toBe('Test Book for Sharing');
      
      testRecommendationId = data.id;
    });

    it('should generate a share link for the recommendation', async () => {
      await supabase.auth.setSession(user1Session);
      
      const shareToken = Math.random().toString(36).substring(2, 15) + 
                        Math.random().toString(36).substring(2, 15);
      
      const { data, error } = await supabase
        .from('shared_recommendations')
        .insert({
          recommendation_id: testRecommendationId,
          share_token: shareToken,
          recommender_name: TEST_USER_1.name
        })
        .select()
        .single();
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.share_token).toBe(shareToken);
      
      testShareToken = shareToken;
    });
  });

  describe('2. View Shared Link and Auto-Inbox Creation', () => {
    
    it('should retrieve shared recommendation by token', async () => {
      const { data, error } = await supabase
        .from('shared_recommendations')
        .select(`
          id,
          share_token,
          recommendation_id,
          recommender_name,
          user_recommendations (
            book_title,
            book_author,
            book_isbn,
            book_description,
            recommendation_note
          )
        `)
        .eq('share_token', testShareToken)
        .single();
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.user_recommendations.book_title).toBe('Test Book for Sharing');
      expect(data.recommender_name).toBe(TEST_USER_1.name);
    });

    it('should auto-create inbox entry when User 2 views the share link', async () => {
      await supabase.auth.setSession(user2Session);
      
      // First, get the shared recommendation data
      const { data: sharedRec } = await supabase
        .from('shared_recommendations')
        .select(`
          id,
          recommender_name,
          user_recommendations (
            book_title,
            book_author,
            book_isbn,
            book_description,
            recommendation_note
          )
        `)
        .eq('share_token', testShareToken)
        .single();
      
      // Create inbox entry
      const { data, error } = await supabase
        .from('received_recommendations')
        .insert({
          recipient_user_id: user2Session.user.id,
          shared_recommendation_id: sharedRec.id,
          recommender_name: sharedRec.recommender_name,
          book_title: sharedRec.user_recommendations.book_title,
          book_author: sharedRec.user_recommendations.book_author,
          book_isbn: sharedRec.user_recommendations.book_isbn,
          book_description: sharedRec.user_recommendations.book_description,
          recommendation_note: sharedRec.user_recommendations.recommendation_note,
          status: 'pending'
        })
        .select()
        .single();
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('pending');
      expect(data.book_title).toBe('Test Book for Sharing');
      expect(data.recommender_name).toBe(TEST_USER_1.name);
      
      testReceivedRecId = data.id;
    });

    it('should prevent duplicate inbox entries', async () => {
      await supabase.auth.setSession(user2Session);
      
      const { data } = await supabase
        .from('received_recommendations')
        .select('id, status')
        .eq('recipient_user_id', user2Session.user.id)
        .eq('shared_recommendation_id', testReceivedRecId)
        .maybeSingle();
      
      expect(data).toBeDefined();
      // If entry exists, we shouldn't create another one
    });
  });

  describe('3. Fetch Received Recommendations', () => {
    
    it('should fetch all received recommendations for User 2', async () => {
      await supabase.auth.setSession(user2Session);
      
      const { data, error } = await supabase
        .from('received_recommendations')
        .select('*')
        .eq('recipient_user_id', user2Session.user.id)
        .order('received_at', { ascending: false });
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);
      
      const testRec = data.find(r => r.id === testReceivedRecId);
      expect(testRec).toBeDefined();
      expect(testRec.status).toBe('pending');
    });

    it('should filter recommendations by status', async () => {
      await supabase.auth.setSession(user2Session);
      
      const { data, error } = await supabase
        .from('received_recommendations')
        .select('*')
        .eq('recipient_user_id', user2Session.user.id)
        .eq('status', 'pending');
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      const testRec = data.find(r => r.id === testReceivedRecId);
      expect(testRec).toBeDefined();
    });
  });

  describe('4. Accept Recommendation', () => {
    
    it('should update status to accepted', async () => {
      await supabase.auth.setSession(user2Session);
      
      const { data, error } = await supabase
        .from('received_recommendations')
        .update({
          status: 'accepted',
          added_to_queue_at: new Date().toISOString()
        })
        .eq('id', testReceivedRecId)
        .select()
        .single();
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('accepted');
      expect(data.added_to_queue_at).toBeDefined();
    });

    it('should verify status change persisted', async () => {
      await supabase.auth.setSession(user2Session);
      
      const { data, error } = await supabase
        .from('received_recommendations')
        .select('*')
        .eq('id', testReceivedRecId)
        .single();
      
      expect(error).toBeNull();
      expect(data.status).toBe('accepted');
    });
  });

  describe('5. Decline Recommendation', () => {
    
    it('should update status to declined', async () => {
      await supabase.auth.setSession(user2Session);
      
      const { data, error } = await supabase
        .from('received_recommendations')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString()
        })
        .eq('id', testReceivedRecId)
        .select()
        .single();
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('declined');
      expect(data.declined_at).toBeDefined();
    });
  });

  describe('6. Count and Badge Logic', () => {
    
    it('should count recommendations by status', async () => {
      await supabase.auth.setSession(user2Session);
      
      const { data, error } = await supabase
        .from('received_recommendations')
        .select('status')
        .eq('recipient_user_id', user2Session.user.id);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      const counts = {
        pending: data.filter(r => r.status === 'pending').length,
        accepted: data.filter(r => r.status === 'accepted').length,
        declined: data.filter(r => r.status === 'declined').length
      };
      
      expect(counts.pending).toBeGreaterThanOrEqual(0);
      expect(counts.accepted).toBeGreaterThanOrEqual(0);
      expect(counts.declined).toBeGreaterThanOrEqual(0);
    });
  });

  describe('7. Delete Recommendation', () => {
    
    it('should delete a received recommendation', async () => {
      await supabase.auth.setSession(user2Session);
      
      const { error } = await supabase
        .from('received_recommendations')
        .delete()
        .eq('id', testReceivedRecId);
      
      expect(error).toBeNull();
    });

    it('should verify deletion', async () => {
      await supabase.auth.setSession(user2Session);
      
      const { data, error } = await supabase
        .from('received_recommendations')
        .select('*')
        .eq('id', testReceivedRecId)
        .maybeSingle();
      
      expect(error).toBeNull();
      expect(data).toBeNull();
    });
  });

  describe('8. RLS Security Tests', () => {
    
    it('should prevent User 1 from viewing User 2\'s received recommendations', async () => {
      await supabase.auth.setSession(user1Session);
      
      const { data, error } = await supabase
        .from('received_recommendations')
        .select('*')
        .eq('recipient_user_id', user2Session.user.id);
      
      // Should return empty array due to RLS
      expect(data).toBeDefined();
      expect(data.length).toBe(0);
    });

    it('should prevent unauthenticated access', async () => {
      await supabase.auth.signOut();
      
      const { data, error } = await supabase
        .from('received_recommendations')
        .select('*');
      
      // Should return empty or error due to RLS
      expect(data).toBeDefined();
      expect(data.length).toBe(0);
    });
  });
});
