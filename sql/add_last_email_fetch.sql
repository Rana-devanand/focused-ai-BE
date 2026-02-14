-- Add last_email_fetch column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_email_fetch TIMESTAMP WITH TIME ZONE;
