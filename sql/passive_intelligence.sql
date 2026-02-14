
-- Calendar Events Table: Stores events synced and analyzed by AI
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  external_id VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  location VARCHAR(255),
  source VARCHAR(50) NOT NULL CHECK (source IN ('GMAIL', 'CALENDAR', 'OUTLOOK', 'DEVICE')),
  ai_category VARCHAR(100), -- e.g., 'Deep Work', 'Meeting', 'Personal'
  ai_summary TEXT, -- AI generated summary
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Tasks Table: Stores tasks extracted from emails by AI
CREATE TABLE IF NOT EXISTS email_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_id VARCHAR(255), -- External ID to prevent duplicates
  subject VARCHAR(255),
  from_address VARCHAR(255),
  snippet TEXT,
  received_at TIMESTAMP WITH TIME ZONE,
  task_description TEXT, -- The task identified by AI
  is_completed BOOLEAN DEFAULT false,
  priority VARCHAR(20) CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
  notification_sent BOOLEAN DEFAULT false,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Stats Table: For Screen Time and Productivity Analytics
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  screen_time_minutes INTEGER DEFAULT 0,
  meeting_count INTEGER DEFAULT 0,
  focus_score INTEGER DEFAULT 0,
  app_usage_breakdown JSONB DEFAULT '[]', -- List of { packageName, durationMinutes, icon? }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Add column if it doesn't exist (creating table IF NOT EXISTS skips this if table exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_stats' AND column_name='app_usage_breakdown') THEN
        ALTER TABLE daily_stats ADD COLUMN app_usage_breakdown JSONB DEFAULT '[]';
    END IF;
END $$;

-- AI Insights Table: For Burnout Warnings and Recommendations
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('BURNOUT_WARNING', 'PRODUCTIVITY_TIP', 'SCHEDULE_OPTIMIZATION')),
  message TEXT NOT NULL,
  metadata JSONB, -- For structured data related to the insight
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON calendar_events(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_email_tasks_user_status ON email_tasks(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON daily_stats(user_id, date);

-- Re-using the update_updated_at_column function from users.sql
-- (It is assumed to exist, but since triggers are per-table, we must apply them)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_calendar_events_updated_at') THEN
    CREATE TRIGGER update_calendar_events_updated_at
      BEFORE UPDATE ON calendar_events
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_email_tasks_updated_at') THEN
    CREATE TRIGGER update_email_tasks_updated_at
      BEFORE UPDATE ON email_tasks
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_daily_stats_updated_at') THEN
    CREATE TRIGGER update_daily_stats_updated_at
      BEFORE UPDATE ON daily_stats
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
