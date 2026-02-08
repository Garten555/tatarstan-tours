CREATE TABLE IF NOT EXISTS review_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('like', 'dislike')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_reactions_review_id ON review_reactions(review_id);
CREATE INDEX IF NOT EXISTS idx_review_reactions_user_id ON review_reactions(user_id);

ALTER TABLE review_reactions ENABLE ROW LEVEL SECURITY;

-- Reactions: anyone can read, only owner can modify
DROP POLICY IF EXISTS "Anyone can read review reactions" ON review_reactions;
CREATE POLICY "Anyone can read review reactions"
  ON review_reactions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can manage own reactions" ON review_reactions;
CREATE POLICY "Users can manage own reactions"
  ON review_reactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

