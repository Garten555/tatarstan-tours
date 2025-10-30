-- Migration 007: Fix tour_media RLS policies
-- Проблема: медиа не отображается для туров со статусом 'active'

-- 1. Удаляем старую политику SELECT
DROP POLICY IF EXISTS "Anyone can view media of published tours" ON tour_media;

-- 2. Создаем новую политику для просмотра медиа
-- Медиа видно для всех активных и опубликованных туров
CREATE POLICY "Anyone can view media of active tours"
  ON tour_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tours
      WHERE tours.id = tour_media.tour_id
      AND tours.status IN ('active', 'published')
    )
  );

-- 3. Обновляем политику для вставки медиа
-- Service role может вставлять без ограничений (уже есть политика "Tour admins can manage media")
-- Но добавим явное разрешение для service role
CREATE POLICY "Service role can insert media"
  ON tour_media FOR INSERT
  WITH CHECK (true);

-- 4. Комментарии
COMMENT ON POLICY "Anyone can view media of active tours" ON tour_media IS 
  'Пользователи могут просматривать медиа для туров со статусом active или published';

COMMENT ON POLICY "Service role can insert media" ON tour_media IS 
  'Service role может вставлять медиа без ограничений (используется в API загрузки)';

