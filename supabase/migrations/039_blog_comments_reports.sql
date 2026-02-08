-- Add reporting fields for blog comments (similar to review_comments)
ALTER TABLE blog_comments
  ADD COLUMN IF NOT EXISTS is_reported BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reported_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_blog_comments_reported ON blog_comments(is_reported) WHERE is_reported = true;










