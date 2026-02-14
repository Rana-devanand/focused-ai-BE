-- Add notification_sent column to email_tasks table if it doesn't exist
ALTER TABLE email_tasks ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false;
