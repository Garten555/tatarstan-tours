-- Миграция 004: Расширение таблицы tours и создание таблицы reviews
-- Дата: 28.10.2025
-- Автор: Daniel (Garten555)

-- ============================================================================
-- 1. ОБНОВЛЕНИЕ ТАБЛИЦЫ TOURS
-- ============================================================================

-- Добавляем новые колонки к таблице tours
ALTER TABLE tours
  ADD COLUMN tour_type VARCHAR(50) DEFAULT 'excursion' CHECK (tour_type IN ('excursion', 'hiking', 'cruise', 'bus_tour', 'walking_tour')),
  ADD COLUMN category VARCHAR(50) DEFAULT 'history' CHECK (category IN ('history', 'nature', 'culture', 'architecture', 'food', 'adventure')),
  ADD COLUMN start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ADD COLUMN end_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  ADD COLUMN max_participants INTEGER DEFAULT 20 CHECK (max_participants > 0),
  ADD COLUMN current_participants INTEGER DEFAULT 0 CHECK (current_participants >= 0),
  ADD COLUMN is_available BOOLEAN GENERATED ALWAYS AS (
    status = 'active' AND 
    start_date > NOW() AND 
    current_participants < max_participants
  ) STORED;

-- Комментарии для новых полей tours
COMMENT ON COLUMN tours.tour_type IS 'Тип тура: excursion, hiking, cruise, bus_tour, walking_tour';
COMMENT ON COLUMN tours.category IS 'Категория тура: history, nature, culture, architecture, food, adventure';
COMMENT ON COLUMN tours.start_date IS 'Дата и время начала тура';
COMMENT ON COLUMN tours.end_date IS 'Дата и время окончания тура (опционально)';
COMMENT ON COLUMN tours.status IS 'Статус тура: draft (черновик), active (активен), completed (завершён), cancelled (отменён)';
COMMENT ON COLUMN tours.max_participants IS 'Максимальное количество участников';
COMMENT ON COLUMN tours.current_participants IS 'Текущее количество участников';
COMMENT ON COLUMN tours.is_available IS 'Автоматически вычисляемое поле: доступен ли тур для бронирования';

-- Индексы для фильтрации
CREATE INDEX idx_tours_type ON tours(tour_type);
CREATE INDEX idx_tours_category ON tours(category);
CREATE INDEX idx_tours_start_date ON tours(start_date);
CREATE INDEX idx_tours_status ON tours(status);
CREATE INDEX idx_tours_available ON tours(is_available) WHERE is_available = true;

-- ============================================================================
-- 2. СОЗДАНИЕ ТАБЛИЦЫ REVIEWS (ОТЗЫВЫ)
-- ============================================================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Оценка и контент
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  
  -- Видео отзыв (хранится на S3)
  video_url TEXT,
  video_path TEXT,
  
  -- Модерация
  is_approved BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  
  -- Метаданные
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ограничение: один отзыв на одно бронирование
  UNIQUE(booking_id)
);

-- Комментарии для таблицы reviews
COMMENT ON TABLE reviews IS 'Отзывы пользователей о турах';
COMMENT ON COLUMN reviews.user_id IS 'ID пользователя, оставившего отзыв';
COMMENT ON COLUMN reviews.tour_id IS 'ID тура, к которому относится отзыв';
COMMENT ON COLUMN reviews.booking_id IS 'ID бронирования (только завершённые или отменённые)';
COMMENT ON COLUMN reviews.rating IS 'Оценка тура от 1 до 5 звёзд';
COMMENT ON COLUMN reviews.text IS 'Текст отзыва';
COMMENT ON COLUMN reviews.video_url IS 'Публичная ссылка на видео отзыв (S3)';
COMMENT ON COLUMN reviews.video_path IS 'Путь к видео на S3 для удаления';
COMMENT ON COLUMN reviews.is_approved IS 'Одобрен ли отзыв модератором';
COMMENT ON COLUMN reviews.is_published IS 'Опубликован ли отзыв';

-- Индексы для reviews
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_tour ON reviews(tour_id);
CREATE INDEX idx_reviews_booking ON reviews(booking_id);
CREATE INDEX idx_reviews_published ON reviews(is_published) WHERE is_published = true;
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- ============================================================================
-- 3. ТРИГГЕРЫ ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ
-- ============================================================================

-- Триггер для обновления updated_at в reviews
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- Триггер для обновления current_participants в tours при бронировании
CREATE OR REPLACE FUNCTION update_tour_participants()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'confirmed') OR (TG_OP = 'UPDATE' AND NEW.status = 'confirmed' AND OLD.status != 'confirmed') THEN
    -- Увеличиваем счётчик при подтверждении бронирования
    UPDATE tours 
    SET current_participants = current_participants + (
      SELECT COUNT(*) FROM booking_attendees WHERE booking_id = NEW.id
    )
    WHERE id = NEW.tour_id;
  ELSIF (TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status = 'confirmed') THEN
    -- Уменьшаем счётчик при отмене подтверждённого бронирования
    UPDATE tours 
    SET current_participants = current_participants - (
      SELECT COUNT(*) FROM booking_attendees WHERE booking_id = NEW.id
    )
    WHERE id = NEW.tour_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
    -- Уменьшаем счётчик при удалении подтверждённого бронирования
    UPDATE tours 
    SET current_participants = current_participants - (
      SELECT COUNT(*) FROM booking_attendees WHERE booking_id = OLD.id
    )
    WHERE id = OLD.tour_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_participants_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_tour_participants();

-- ============================================================================
-- 4. RLS ПОЛИТИКИ ДЛЯ REVIEWS
-- ============================================================================

-- Включаем RLS для reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Политика: Все могут читать опубликованные отзывы
CREATE POLICY "Опубликованные отзывы доступны всем"
  ON reviews FOR SELECT
  USING (is_published = true);

-- Политика: Пользователь может создать отзыв только для своего завершённого/отменённого бронирования
CREATE POLICY "Пользователь может создать отзыв для своего бронирования"
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

-- Политика: Пользователь может обновлять свои неопубликованные отзывы
CREATE POLICY "Пользователь может редактировать свои отзывы"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id AND is_published = false)
  WITH CHECK (auth.uid() = user_id);

-- Политика: Пользователь может удалять свои неопубликованные отзывы
CREATE POLICY "Пользователь может удалять свои отзывы"
  ON reviews FOR DELETE
  USING (auth.uid() = user_id AND is_published = false);

-- Политика: Админы могут управлять всеми отзывами
CREATE POLICY "Админы могут управлять всеми отзывами"
  ON reviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'support_admin')
    )
  );

-- Политика: service_role может всё (для серверных операций)
CREATE POLICY "service_role может всё с отзывами"
  ON reviews FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 5. ФУНКЦИЯ ДЛЯ ПРОВЕРКИ ВОЗМОЖНОСТИ ОСТАВИТЬ ОТЗЫВ
-- ============================================================================

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
      WHEN b.id IS NULL THEN 'Вы не бронировали этот тур'
      WHEN r.id IS NOT NULL THEN 'Вы уже оставили отзыв'
      WHEN b.status NOT IN ('completed', 'cancelled') THEN 'Отзыв можно оставить только после завершения или отмены тура'
      ELSE 'Вы можете оставить отзыв'
    END AS reason
  FROM bookings b
  LEFT JOIN reviews r ON r.booking_id = b.id
  WHERE b.user_id = p_user_id
    AND b.tour_id = p_tour_id
  ORDER BY b.created_at DESC
  LIMIT 1;
  
  -- Если нет бронирований
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Вы не бронировали этот тур'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_user_review_tour IS 'Проверяет, может ли пользователь оставить отзыв на тур';

-- ============================================================================
-- 6. ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ СРЕДНЕЙ ОЦЕНКИ ТУРА
-- ============================================================================

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
  WHERE tour_id = p_tour_id
    AND is_published = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_tour_average_rating IS 'Возвращает среднюю оценку и количество отзывов для тура';

