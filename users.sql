-- Create users table in Supabase PostgreSQL
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  role VARCHAR(50) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  password VARCHAR(255),
  refresh_token TEXT,
  blocked BOOLEAN DEFAULT false,
  block_reason TEXT DEFAULT '',
  provider VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (provider IN ('google', 'manual', 'facebook', 'apple', 'linkedin')),
  facebook_id VARCHAR(255),
  image TEXT,
  linkedin_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on provider for filtering
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row update
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) - optional but recommended
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role has full access to users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
