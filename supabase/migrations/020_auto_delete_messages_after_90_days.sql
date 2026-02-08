-- Migration 020: Автоматическое удаление сообщений через 90 дней после окончания тура
-- Auto-delete messages 90 days after tour ends

-- ==========================================
-- ФУНКЦИЯ ДЛЯ АВТОМАТИЧЕСКОГО УДАЛЕНИЯ СООБЩЕНИЙ
-- ==========================================

-- Функция для удаления сообщений через 90 дней после окончания тура
CREATE OR REPLACE FUNCTION delete_messages_after_90_days()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Удаляем сообщения (мягкое удаление) из комнат туров, которые закончились более 90 дней назад
  UPDATE tour_room_messages
  SET deleted_at = NOW()
  WHERE deleted_at IS NULL
    AND room_id IN (
      SELECT tr.id
      FROM tour_rooms tr
      INNER JOIN tours t ON tr.tour_id = t.id
      WHERE t.end_date IS NOT NULL
        AND t.end_date < NOW() - INTERVAL '90 days'
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Также очищаем изображения из сообщений для туров старше 90 дней
  UPDATE tour_room_messages
  SET image_url = NULL,
      image_path = NULL
  WHERE image_path IS NOT NULL
    AND room_id IN (
      SELECT tr.id
      FROM tour_rooms tr
      INNER JOIN tours t ON tr.tour_id = t.id
      WHERE t.end_date IS NOT NULL
        AND t.end_date < NOW() - INTERVAL '90 days'
    );
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION delete_messages_after_90_days() IS 'Удаляет сообщения через 90 дней после окончания тура (вызывать через cron)';

-- ==========================================
-- ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ==========================================

-- Индекс для быстрого поиска сообщений, которые нужно удалить
CREATE INDEX IF NOT EXISTS idx_tour_room_messages_for_90day_cleanup
ON tour_room_messages(room_id, deleted_at)
WHERE deleted_at IS NULL;

-- Индекс для связи комнат с турами для проверки даты окончания
CREATE INDEX IF NOT EXISTS idx_tour_rooms_tour_end_date
ON tour_rooms(tour_id);

















