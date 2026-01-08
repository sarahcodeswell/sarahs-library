// Referral Code Utilities
// Centralized functions for generating and managing referral codes

/**
 * Generate a book-themed referral code
 * @param {string} identifier - Email or user ID to generate code from
 * @returns {string} A unique referral code like "CHAPTER7A3"
 */
export function generateReferralCode(identifier) {
  if (!identifier) return null;
  
  const bookWords = [
    'CHAPTER', 'NOVEL', 'STORY', 'READER', 'PAGES', 'PROSE', 
    'SHELF', 'SPINE', 'COVER', 'WORDS', 'TALES', 'BOOKS',
    'PLOT', 'QUEST', 'SAGA', 'EPIC', 'VERSE', 'INK'
  ];
  
  // Create a hash from the identifier
  const cleanId = identifier.replace(/[^a-zA-Z0-9]/g, '');
  let hash = 0;
  for (let i = 0; i < cleanId.length; i++) {
    hash = ((hash << 5) - hash) + cleanId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  hash = Math.abs(hash);
  
  const word = bookWords[hash % bookWords.length];
  const digits = cleanId.substring(0, 3).toUpperCase();
  
  return `${word}${digits}`;
}

/**
 * Get or create a referral code for an email
 * @param {Object} supabase - Supabase client with service role
 * @param {string} email - Email address
 * @param {string} source - Where the code was generated ('curator_waitlist', 'beta_signup', 'profile', 'invite')
 * @param {string|null} userId - Optional user ID if already signed up
 * @returns {Promise<{code: string, isNew: boolean, error?: string}>}
 */
export async function getOrCreateReferralCode(supabase, email, source, userId = null) {
  const normalizedEmail = email.toLowerCase().trim();
  
  try {
    // First, check if a code already exists for this email
    const { data: existing, error: lookupError } = await supabase
      .from('referral_codes')
      .select('code, user_id')
      .eq('email', normalizedEmail)
      .single();
    
    if (existing && !lookupError) {
      // Code exists - update user_id if provided and not already set
      if (userId && !existing.user_id) {
        await supabase
          .from('referral_codes')
          .update({ user_id: userId, linked_at: new Date().toISOString() })
          .eq('email', normalizedEmail);
      }
      return { code: existing.code, isNew: false };
    }
    
    // No existing code - generate a new one
    const newCode = generateReferralCode(normalizedEmail);
    
    // Insert the new code
    const { error: insertError } = await supabase
      .from('referral_codes')
      .insert({
        email: normalizedEmail,
        code: newCode,
        user_id: userId,
        source,
        linked_at: userId ? new Date().toISOString() : null
      });
    
    if (insertError) {
      // Handle race condition - code might have been created by another request
      if (insertError.code === '23505') { // Unique violation
        const { data: retry } = await supabase
          .from('referral_codes')
          .select('code')
          .eq('email', normalizedEmail)
          .single();
        
        if (retry) {
          return { code: retry.code, isNew: false };
        }
      }
      
      console.error('Error creating referral code:', insertError);
      return { code: null, isNew: false, error: insertError.message };
    }
    
    return { code: newCode, isNew: true };
  } catch (error) {
    console.error('Referral code error:', error);
    return { code: null, isNew: false, error: error.message };
  }
}

/**
 * Look up a referral code and get the inviter's info
 * @param {Object} supabase - Supabase client
 * @param {string} code - Referral code to look up
 * @returns {Promise<{inviterId: string|null, inviterEmail: string|null, error?: string}>}
 */
export async function lookupReferralCode(supabase, code) {
  if (!code) return { inviterId: null, inviterEmail: null };
  
  try {
    const { data, error } = await supabase
      .from('referral_codes')
      .select('user_id, email')
      .eq('code', code.toUpperCase())
      .single();
    
    if (error || !data) {
      return { inviterId: null, inviterEmail: null };
    }
    
    return { inviterId: data.user_id, inviterEmail: data.email };
  } catch (error) {
    console.error('Referral lookup error:', error);
    return { inviterId: null, inviterEmail: null, error: error.message };
  }
}

/**
 * Link a user ID to an existing referral code (when user signs up)
 * @param {Object} supabase - Supabase client with service role
 * @param {string} email - User's email
 * @param {string} userId - User's ID
 * @returns {Promise<{success: boolean, code?: string}>}
 */
export async function linkUserToReferralCode(supabase, email, userId) {
  const normalizedEmail = email.toLowerCase().trim();
  
  try {
    const { data, error } = await supabase
      .from('referral_codes')
      .update({ user_id: userId, linked_at: new Date().toISOString() })
      .eq('email', normalizedEmail)
      .is('user_id', null)
      .select('code')
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error linking user to referral code:', error);
      return { success: false };
    }
    
    return { success: true, code: data?.code };
  } catch (error) {
    console.error('Link referral code error:', error);
    return { success: false };
  }
}
