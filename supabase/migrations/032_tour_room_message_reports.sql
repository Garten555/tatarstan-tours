ALTER TABLE tour_room_messages
  ADD COLUMN IF NOT EXISTS is_reported BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reported_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_tour_room_messages_reported ON tour_room_messages(is_reported) WHERE is_reported = true;















