CREATE TABLE IF NOT EXISTS review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_comments_review_id ON review_comments(review_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_user_id ON review_comments(user_id);

ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read review comments" ON review_comments;
CREATE POLICY "Anyone can read review comments"
  ON review_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create review comments" ON review_comments;
CREATE POLICY "Users can create review comments"
  ON review_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);















