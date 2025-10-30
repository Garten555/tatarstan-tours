-- Migration 008: Add missing columns to tour_media

-- Добавляем недостающие колонки
ALTER TABLE tour_media 
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Комментарии
COMMENT ON COLUMN tour_media.file_name IS 'Оригинальное имя загруженного файла';
COMMENT ON COLUMN tour_media.file_size IS 'Размер файла в байтах';
COMMENT ON COLUMN tour_media.mime_type IS 'MIME-тип файла (image/jpeg, video/mp4 и т.д.)';

