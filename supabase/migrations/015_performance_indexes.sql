-- Migration 015: Индексы для оптимизации производительности
-- Добавляем индексы на часто используемые поля для ускорения запросов

-- ==========================================
-- ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ TOURS
-- ==========================================

-- Индекс для фильтрации по статусу и дате окончания (часто используется в /tours)
CREATE INDEX IF NOT EXISTS idx_tours_status_end_date 
ON tours(status, end_date) 
WHERE status = 'active';

-- Индекс для поиска по типу тура
CREATE INDEX IF NOT EXISTS idx_tours_tour_type 
ON tours(tour_type) 
WHERE status = 'active';

-- Индекс для поиска по категории
CREATE INDEX IF NOT EXISTS idx_tours_category 
ON tours(category) 
WHERE status = 'active';

-- Индекс для поиска по городу
CREATE INDEX IF NOT EXISTS idx_tours_city_id 
ON tours(city_id) 
WHERE status = 'active';

-- Индекс для сортировки по дате создания
CREATE INDEX IF NOT EXISTS idx_tours_created_at 
ON tours(created_at DESC) 
WHERE status = 'active';

-- Индекс для сортировки по дате начала
CREATE INDEX IF NOT EXISTS idx_tours_start_date 
ON tours(start_date) 
WHERE status = 'active';

-- Индекс для поиска по тексту (GIN индекс для полнотекстового поиска)
-- Используем триграммы для быстрого поиска по тексту
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_tours_title_trgm 
ON tours USING gin(title gin_trgm_ops) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_tours_short_desc_trgm 
ON tours USING gin(short_desc gin_trgm_ops) 
WHERE status = 'active';

-- ==========================================
-- ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ BOOKINGS
-- ==========================================

-- Индекс для поиска бронирований пользователя
CREATE INDEX IF NOT EXISTS idx_bookings_user_id 
ON bookings(user_id, created_at DESC);

-- Индекс для поиска бронирований по туру
CREATE INDEX IF NOT EXISTS idx_bookings_tour_id 
ON bookings(tour_id, status);

-- Индекс для фильтрации по статусу
CREATE INDEX IF NOT EXISTS idx_bookings_status 
ON bookings(status);

-- ==========================================
-- ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ TOUR_ROOMS
-- ==========================================

-- Индекс для поиска комнаты по туру
CREATE INDEX IF NOT EXISTS idx_tour_rooms_tour_id 
ON tour_rooms(tour_id);

-- Индекс для поиска комнат гида
CREATE INDEX IF NOT EXISTS idx_tour_rooms_guide_id 
ON tour_rooms(guide_id) 
WHERE guide_id IS NOT NULL;

-- Индекс для сортировки по дате создания
CREATE INDEX IF NOT EXISTS idx_tour_rooms_created_at 
ON tour_rooms(created_at DESC);

-- ==========================================
-- ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ TOUR_ROOM_PARTICIPANTS
-- ==========================================

-- Индекс для поиска участников комнаты
CREATE INDEX IF NOT EXISTS idx_tour_room_participants_room_id 
ON tour_room_participants(room_id);

-- Индекс для поиска комнат пользователя
CREATE INDEX IF NOT EXISTS idx_tour_room_participants_user_id 
ON tour_room_participants(user_id);

-- Составной индекс для быстрого поиска участника в комнате
CREATE INDEX IF NOT EXISTS idx_tour_room_participants_room_user 
ON tour_room_participants(room_id, user_id);

-- ==========================================
-- ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ CITIES
-- ==========================================

-- Индекс для поиска городов по названию (для фильтрации туров)
CREATE INDEX IF NOT EXISTS idx_cities_name_trgm 
ON cities USING gin(name gin_trgm_ops);

-- ==========================================
-- ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ PROFILES
-- ==========================================

-- Индекс для поиска по роли (для проверки прав админа)
CREATE INDEX IF NOT EXISTS idx_profiles_role 
ON profiles(role) 
WHERE role IN ('tour_admin', 'super_admin', 'support_admin');

-- ==========================================
-- КОММЕНТАРИИ
-- ==========================================

COMMENT ON INDEX idx_tours_status_end_date IS 
'Индекс для быстрой фильтрации активных туров по дате окончания (используется на странице /tours)';

COMMENT ON INDEX idx_tours_title_trgm IS 
'GIN индекс для быстрого полнотекстового поиска по названию тура';

COMMENT ON INDEX idx_tour_room_participants_room_id IS 
'Индекс для быстрого подсчета участников комнаты (исправляет N+1 проблему)';





















