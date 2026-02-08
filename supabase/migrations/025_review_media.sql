-- Migration 025: Review media attachments

CREATE TABLE IF NOT EXISTS review_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  media_url TEXT NOT NULL,
  media_path TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_media_review_id ON review_media(review_id);
CREATE INDEX IF NOT EXISTS idx_review_media_created_at ON review_media(created_at DESC);

ALTER TABLE review_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published review media is public" ON review_media;
CREATE POLICY "Published review media is public"
  ON review_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = review_id AND r.is_published = true
    )
  );

DROP POLICY IF EXISTS "Users can manage own review media" ON review_media;
CREATE POLICY "Users can manage own review media"
  ON review_media FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = review_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = review_id AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage all review media" ON review_media;
CREATE POLICY "Admins can manage all review media"
  ON review_media FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'support_admin')
    )
  );

DROP POLICY IF EXISTS "service_role can manage review media" ON review_media;
CREATE POLICY "service_role can manage review media"
  ON review_media FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
















