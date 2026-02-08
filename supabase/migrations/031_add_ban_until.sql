ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ban_until TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_profiles_ban_until ON profiles(ban_until) WHERE ban_until IS NOT NULL;















