-- Migration 009: performance indexes for media lookups

-- Ускоряем выборки медиа по туру и времени
CREATE INDEX IF NOT EXISTS idx_tour_media_tour_id ON tour_media (tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_media_tour_id_created_at ON tour_media (tour_id, created_at);


