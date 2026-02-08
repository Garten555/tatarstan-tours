-- Add reporting fields for reviews
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS is_reported BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reported_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_reviews_reported ON reviews(is_reported) WHERE is_reported = true;















