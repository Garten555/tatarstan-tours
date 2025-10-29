-- Migration 004: Tours extension and Reviews table
-- Date: 2025-10-28

-- Step 1: Add new values to tour_status enum
ALTER TYPE tour_status ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE tour_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE tour_status ADD VALUE IF NOT EXISTS 'cancelled';

-- Step 2: Create new enum types
DO $$ BEGIN
  CREATE TYPE tour_type_enum AS ENUM ('excursion', 'hiking', 'cruise', 'bus_tour', 'walking_tour');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE tour_category_enum AS ENUM ('history', 'nature', 'culture', 'architecture', 'food', 'adventure');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 3: Rename column
ALTER TABLE tours RENAME COLUMN current_bookings TO current_participants;

-- Step 4: Add new columns
ALTER TABLE tours ADD COLUMN IF NOT EXISTS tour_type tour_type_enum DEFAULT 'excursion';
ALTER TABLE tours ADD COLUMN IF NOT EXISTS category tour_category_enum DEFAULT 'history';

-- Step 5: Add indexes
CREATE INDEX IF NOT EXISTS idx_tours_type ON tours(tour_type);
CREATE INDEX IF NOT EXISTS idx_tours_category ON tours(category);

-- Step 6: Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  video_url TEXT,
  video_path TEXT,
  is_approved BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(booking_id)
);

-- Step 7: Add indexes for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_tour ON reviews(tour_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_published ON reviews(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- Step 8: Create trigger function for reviews updated_at
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reviews_updated_at ON reviews;
CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- Step 9: Create trigger function for tour participants
CREATE OR REPLACE FUNCTION update_tour_participants()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'confirmed') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'confirmed' AND OLD.status != 'confirmed') THEN
    UPDATE tours 
    SET current_participants = current_participants + (
      SELECT COUNT(*) FROM booking_attendees WHERE booking_id = NEW.id
    )
    WHERE id = NEW.tour_id;
  ELSIF (TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status = 'confirmed') THEN
    UPDATE tours 
    SET current_participants = current_participants - (
      SELECT COUNT(*) FROM booking_attendees WHERE booking_id = NEW.id
    )
    WHERE id = NEW.tour_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
    UPDATE tours 
    SET current_participants = current_participants - (
      SELECT COUNT(*) FROM booking_attendees WHERE booking_id = OLD.id
    )
    WHERE id = OLD.tour_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bookings_participants_trigger ON bookings;
CREATE TRIGGER bookings_participants_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_tour_participants();

-- Step 10: Enable RLS for reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Step 11: Create RLS policies for reviews
DROP POLICY IF EXISTS "Published reviews are public" ON reviews;
CREATE POLICY "Published reviews are public"
  ON reviews FOR SELECT
  USING (is_published = true);

DROP POLICY IF EXISTS "User can create review for own booking" ON reviews;
CREATE POLICY "User can create review for own booking"
  ON reviews FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
        AND bookings.user_id = auth.uid()
        AND bookings.status IN ('completed', 'cancelled')
    )
  );

DROP POLICY IF EXISTS "User can edit own reviews" ON reviews;
CREATE POLICY "User can edit own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id AND is_published = false)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User can delete own reviews" ON reviews;
CREATE POLICY "User can delete own reviews"
  ON reviews FOR DELETE
  USING (auth.uid() = user_id AND is_published = false);

DROP POLICY IF EXISTS "Admins can manage all reviews" ON reviews;
CREATE POLICY "Admins can manage all reviews"
  ON reviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'support_admin')
    )
  );

DROP POLICY IF EXISTS "service_role can manage reviews" ON reviews;
CREATE POLICY "service_role can manage reviews"
  ON reviews FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 12: Create helper function to check if user can review
CREATE OR REPLACE FUNCTION can_user_review_tour(
  p_user_id UUID,
  p_tour_id UUID
) RETURNS TABLE (
  can_review BOOLEAN,
  booking_id UUID,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN b.id IS NULL THEN false
      WHEN r.id IS NOT NULL THEN false
      WHEN b.status NOT IN ('completed', 'cancelled') THEN false
      ELSE true
    END AS can_review,
    b.id AS booking_id,
    CASE
      WHEN b.id IS NULL THEN 'No booking found'
      WHEN r.id IS NOT NULL THEN 'Review already exists'
      WHEN b.status NOT IN ('completed', 'cancelled') THEN 'Booking not completed'
      ELSE 'Can leave review'
    END AS reason
  FROM bookings b
  LEFT JOIN reviews r ON r.booking_id = b.id
  WHERE b.user_id = p_user_id AND b.tour_id = p_tour_id
  ORDER BY b.created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, 'No booking found'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 13: Create helper function to get tour average rating
CREATE OR REPLACE FUNCTION get_tour_average_rating(p_tour_id UUID)
RETURNS TABLE (
  average_rating NUMERIC(3,2),
  total_reviews INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(rating)::NUMERIC, 2) AS average_rating,
    COUNT(*)::INTEGER AS total_reviews
  FROM reviews
  WHERE tour_id = p_tour_id AND is_published = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 14: Create helper function to check if tour is available
CREATE OR REPLACE FUNCTION is_tour_available(p_tour_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  tour_record RECORD;
BEGIN
  SELECT status, start_date, current_participants, max_participants
  INTO tour_record
  FROM tours
  WHERE id = p_tour_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  RETURN (
    tour_record.status IN ('draft', 'published') AND
    tour_record.start_date > NOW() AND
    tour_record.current_participants < tour_record.max_participants
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

