-- Migration 018: Добавление поддержки изображений в сообщениях и автоматическое удаление после окончания тура
-- Add image support to messages and auto-delete after tour ends

-- ==========================================
-- ДОБАВЛЕНИЕ ПОЛЯ ДЛЯ ИЗОБРАЖЕНИЙ В СООБЩЕНИЯХ
-- ==========================================

-- Изменяем поле message, чтобы разрешить NULL (для сообщений только с фото)
ALTER TABLE tour_room_messages 
ALTER COLUMN message DROP NOT NULL;

-- Добавляем поле для URL изображения в сообщениях
ALTER TABLE tour_room_messages 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_path TEXT; -- Путь в S3 для удаления

-- Комментарии
COMMENT ON COLUMN tour_room_messages.image_url IS 'URL изображения, прикрепленного к сообщению';
COMMENT ON COLUMN tour_room_messages.image_path IS 'Путь к изображению в S3 для автоматического удаления';

-- ==========================================
-- ФУНКЦИЯ ДЛЯ АВТОМАТИЧЕСКОГО УДАЛЕНИЯ ФОТО ПОСЛЕ ОКОНЧАНИЯ ТУРА
-- ==========================================

-- Функция для удаления изображений из сообщений после окончания тура
CREATE OR REPLACE FUNCTION delete_message_images_after_tour_end()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  message_record RECORD;
  tour_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Находим все сообщения с изображениями в комнатах, где тур уже закончился
  FOR message_record IN
    SELECT 
      trm.id,
      trm.image_url,
      trm.image_path,
      tr.tour_id,
      t.end_date
    FROM tour_room_messages trm
    INNER JOIN tour_rooms tr ON trm.room_id = tr.id
    INNER JOIN tours t ON tr.tour_id = t.id
    WHERE 
      trm.image_url IS NOT NULL
      AND trm.image_path IS NOT NULL
      AND t.end_date IS NOT NULL
      AND t.end_date < NOW()
      AND trm.deleted_at IS NULL
  LOOP
    -- Удаляем URL и путь (фактическое удаление из S3 будет через API/cron)
    UPDATE tour_room_messages
    SET 
      image_url = NULL,
      image_path = NULL
    WHERE id = message_record.id;
    
    -- Логируем (можно добавить таблицу логов если нужно)
    -- RAISE NOTICE 'Deleted image from message % for tour %', message_record.id, message_record.tour_id;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION delete_message_images_after_tour_end() IS 'Удаляет изображения из сообщений после окончания тура (вызывать через cron)';

-- ==========================================
-- ТРИГГЕР ДЛЯ АВТОМАТИЧЕСКОГО УДАЛЕНИЯ
-- ==========================================

-- Создаем функцию-триггер, которая будет вызываться при обновлении тура
CREATE OR REPLACE FUNCTION trigger_delete_message_images()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Если дата окончания тура изменилась и тур уже закончился
  IF NEW.end_date IS NOT NULL AND NEW.end_date < NOW() AND (OLD.end_date IS NULL OR OLD.end_date >= NOW()) THEN
    -- Удаляем изображения из сообщений этого тура
    PERFORM delete_message_images_after_tour_end();
  END IF;
  RETURN NEW;
END;
$$;

-- Создаем триггер на обновление туров
DROP TRIGGER IF EXISTS tour_end_delete_message_images ON tours;
CREATE TRIGGER tour_end_delete_message_images
  AFTER UPDATE OF end_date ON tours
  FOR EACH ROW
  WHEN (NEW.end_date IS NOT NULL AND NEW.end_date < NOW())
  EXECUTE FUNCTION trigger_delete_message_images();

-- ==========================================
-- ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ==========================================

-- Индекс для быстрого поиска сообщений с изображениями
CREATE INDEX IF NOT EXISTS idx_tour_room_messages_image_url 
ON tour_room_messages(image_url) 
WHERE image_url IS NOT NULL;

-- Индекс для поиска сообщений с изображениями в закончившихся турах
CREATE INDEX IF NOT EXISTS idx_tour_room_messages_for_cleanup
ON tour_room_messages(room_id, image_path)
WHERE image_path IS NOT NULL AND deleted_at IS NULL;

