-- Add is_read column to email_tasks
ALTER TABLE email_tasks ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE email_tasks ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;
-- Add completed_at for better tracking
ALTER TABLE email_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
