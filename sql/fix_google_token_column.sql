-- Fix the google access token column name
-- Drop the incorrectly named column and add the correct one
ALTER TABLE users DROP COLUMN IF EXISTS googleaccesstoken;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_access_token TEXT;
