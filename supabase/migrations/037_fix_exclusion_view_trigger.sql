-- Fix the refresh_user_exclusion_list function to run with elevated permissions
-- The trigger fires when users INSERT/UPDATE/DELETE on reading_queue,
-- but migration 031 revoked access to the materialized view from authenticated users.
-- This causes "permission denied for materialized view user_exclusion_list" errors.

-- Make the function run as the owner (postgres) instead of the invoking user
ALTER FUNCTION refresh_user_exclusion_list() SECURITY DEFINER;

-- Ensure the function owner is postgres
ALTER FUNCTION refresh_user_exclusion_list() OWNER TO postgres;
