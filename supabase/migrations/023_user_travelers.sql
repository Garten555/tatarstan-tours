-- Migration 023: user_travelers (saved participants for booking)

CREATE TABLE IF NOT EXISTS user_travelers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relationship TEXT NULL,
  is_child BOOLEAN NOT NULL DEFAULT false,
  email TEXT NULL,
  phone TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_travelers_user_id ON user_travelers(user_id);

ALTER TABLE user_travelers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own travelers"
  ON user_travelers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own travelers"
  ON user_travelers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own travelers"
  ON user_travelers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own travelers"
  ON user_travelers FOR DELETE
  USING (auth.uid() = user_id);
















