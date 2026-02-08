-- Add reporting fields for review comments
ALTER TABLE review_comments
  ADD COLUMN IF NOT EXISTS is_reported BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reported_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_review_comments_reported ON review_comments(is_reported) WHERE is_reported = true;

-- Add ban fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON profiles(is_banned) WHERE is_banned = true;















