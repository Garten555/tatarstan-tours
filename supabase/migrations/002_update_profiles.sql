-- Миграция 002: Дополнительные индексы и комментарии
-- Дата: 2025-10-28
-- Описание: Индексы для поиска и комментарии к полям

-- ==========================================
-- ИНДЕКСЫ ДЛЯ PROFILES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_profiles_first_name ON profiles(first_name);
CREATE INDEX IF NOT EXISTS idx_profiles_last_name ON profiles(last_name);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ==========================================
-- КОММЕНТАРИИ ДЛЯ PROFILES
-- ==========================================
COMMENT ON COLUMN profiles.first_name IS 'Имя пользователя (обязательное)';
COMMENT ON COLUMN profiles.last_name IS 'Фамилия пользователя (обязательное)';
COMMENT ON COLUMN profiles.middle_name IS 'Отчество пользователя (опционально)';
COMMENT ON COLUMN profiles.avatar_url IS 'URL аватарки в S3';
COMMENT ON COLUMN profiles.avatar_path IS 'Путь к файлу аватарки в S3 (для удаления при замене)';
COMMENT ON COLUMN profiles.role IS 'Роль пользователя: user, tour_admin, support_admin, super_admin';
COMMENT ON COLUMN profiles.phone IS 'Телефон пользователя (опционально)';

-- ==========================================
-- КОММЕНТАРИИ ДЛЯ TOURS
-- ==========================================
COMMENT ON COLUMN tours.cover_image IS 'URL обложки тура в S3';
COMMENT ON COLUMN tours.cover_path IS 'Путь к обложке в S3 (для удаления при замене)';
COMMENT ON COLUMN tours.yandex_map_data IS 'JSON данные карты маршрута от Яндекс.Карт';

-- ==========================================
-- КОММЕНТАРИИ ДЛЯ TOUR_MEDIA
-- ==========================================
COMMENT ON COLUMN tour_media.media_url IS 'URL медиа файла в S3';
COMMENT ON COLUMN tour_media.media_path IS 'Путь к медиа файлу в S3 (для удаления)';
COMMENT ON COLUMN tour_media.order_index IS 'Порядок отображения в галерее';

-- ==========================================
-- КОММЕНТАРИИ ДЛЯ BOOKING_ATTENDEES
-- ==========================================
COMMENT ON COLUMN booking_attendees.first_name IS 'Имя участника тура';
COMMENT ON COLUMN booking_attendees.last_name IS 'Фамилия участника тура';
COMMENT ON COLUMN booking_attendees.middle_name IS 'Отчество участника тура (опционально)';
COMMENT ON COLUMN booking_attendees.passport_data IS 'Паспортные данные (если требуется)';


