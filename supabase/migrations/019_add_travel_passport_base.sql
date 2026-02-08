-- Миграция 019: Базовая структура системы "Туристический паспорт"
-- Migration 019: Travel Passport System - Base Structure
-- Дата: Декабрь 2024

-- ==========================================
-- 1. ОБНОВЛЕНИЕ ТАБЛИЦЫ PROFILES
-- ==========================================

-- Добавляем поля для публичного профиля
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS display_name TEXT, -- Никнейм для публичного профиля
  ADD COLUMN IF NOT EXISTS bio TEXT, -- Описание профиля
  ADD COLUMN IF NOT EXISTS public_profile_enabled BOOLEAN DEFAULT false, -- Включен ли публичный профиль
  ADD COLUMN IF NOT EXISTS status_level INTEGER DEFAULT 1 CHECK (status_level >= 1 AND status_level <= 4), -- 1=Новичок, 2=Исследователь, 3=Знаток, 4=Эксперт
  ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0 CHECK (reputation_score >= 0);

-- Индексы для поиска по username
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_public_enabled ON profiles(public_profile_enabled) WHERE public_profile_enabled = true;

-- Комментарии
COMMENT ON COLUMN profiles.username IS 'Уникальный никнейм для публичного профиля (URL: /users/@username)';
COMMENT ON COLUMN profiles.display_name IS 'Отображаемое имя в публичном профиле (никнейм)';
COMMENT ON COLUMN profiles.bio IS 'Описание профиля пользователя';
COMMENT ON COLUMN profiles.public_profile_enabled IS 'Включен ли публичный профиль (opt-in)';
COMMENT ON COLUMN profiles.status_level IS 'Уровень статуса: 1=Новичок, 2=Исследователь, 3=Знаток региона, 4=Эксперт';
COMMENT ON COLUMN profiles.reputation_score IS 'Репутационный балл (на основе качества контента и активности)';

-- ==========================================
-- 2. ТАБЛИЦА TRAVEL_DIARIES (Дневники путешествий)
-- ==========================================

CREATE TABLE IF NOT EXISTS travel_diaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Опциональная привязка к туру (может быть NULL для ручных дневников)
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  
  -- Контент дневника
  title TEXT NOT NULL,
  content TEXT, -- Текст дневника (HTML или Markdown)
  cover_image_url TEXT, -- Обложка дневника (URL в S3)
  cover_image_path TEXT, -- Путь к обложке в S3
  
  -- Медиа дневника (JSON массив с фото/видео и описаниями)
  -- Формат: [{"type": "image|video", "url": "...", "path": "...", "description": "...", "order": 0}]
  media_items JSONB DEFAULT '[]'::jsonb,
  
  -- Геоданные (координаты, маршрут, локации)
  -- Формат: {"locations": [...], "route": [...], "center": [lat, lng], "zoom": 10}
  location_data JSONB,
  
  -- Метаданные
  travel_date DATE, -- Дата путешествия (может отличаться от даты тура)
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'private')), -- Статус дневника
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'friends', 'public')), -- Видимость
  
  -- Согласие и автогенерация
  user_consent BOOLEAN DEFAULT false, -- Согласие на автогенерацию (если привязан к туру)
  auto_generated BOOLEAN DEFAULT false, -- Автоматически создан или вручную
  
  -- Статистика
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE -- Дата публикации
);

-- Индексы для travel_diaries
CREATE INDEX IF NOT EXISTS idx_travel_diaries_user_id ON travel_diaries(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_diaries_tour_id ON travel_diaries(tour_id) WHERE tour_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_travel_diaries_booking_id ON travel_diaries(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_travel_diaries_status ON travel_diaries(status);
CREATE INDEX IF NOT EXISTS idx_travel_diaries_visibility ON travel_diaries(visibility);
CREATE INDEX IF NOT EXISTS idx_travel_diaries_published_at ON travel_diaries(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_travel_diaries_travel_date ON travel_diaries(travel_date DESC);

-- Комментарии
COMMENT ON TABLE travel_diaries IS 'Дневники путешествий пользователей (могут быть привязаны к туру или созданы вручную)';
COMMENT ON COLUMN travel_diaries.tour_id IS 'Привязка к туру (опционально, может быть NULL для ручных дневников)';
COMMENT ON COLUMN travel_diaries.media_items IS 'JSON массив медиа (фото/видео) с описаниями и порядком';
COMMENT ON COLUMN travel_diaries.location_data IS 'JSON с геоданными (координаты, маршрут, локации)';
COMMENT ON COLUMN travel_diaries.auto_generated IS 'true если создан автоматически на основе тура, false если создан вручную';

-- ==========================================
-- 3. ТАБЛИЦА ACHIEVEMENTS (Достижения и бейджи)
-- ==========================================

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Тип достижения
  badge_type TEXT NOT NULL, -- 'gastronomy', 'history', 'adventure', 'nature', 'culture', 'first_tour', '10_tours', etc.
  badge_name TEXT NOT NULL, -- Название бейджа
  badge_description TEXT, -- Описание достижения
  badge_icon_url TEXT, -- URL иконки бейджа
  
  -- Привязка к туру (опционально)
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  diary_id UUID REFERENCES travel_diaries(id) ON DELETE SET NULL,
  
  -- Метаданные
  unlock_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verification_data JSONB, -- Данные для верификации достижения
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для achievements
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_badge_type ON achievements(badge_type);
CREATE INDEX IF NOT EXISTS idx_achievements_tour_id ON achievements(tour_id) WHERE tour_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_achievements_unlock_date ON achievements(unlock_date DESC);

-- Уникальность: один пользователь не может получить один и тот же бейдж дважды
CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_user_badge_unique 
ON achievements(user_id, badge_type) 
WHERE badge_type NOT LIKE '%_count'; -- Исключаем счетные бейджи (10_tours, 50_tours и т.д.)

-- Комментарии
COMMENT ON TABLE achievements IS 'Достижения и бейджи пользователей';
COMMENT ON COLUMN achievements.badge_type IS 'Тип бейджа: gastronomy, history, adventure, nature, culture, first_tour, 10_tours, etc.';
COMMENT ON COLUMN achievements.verification_data IS 'JSON данные для верификации достижения (например, количество туров, категории)';

-- ==========================================
-- 4. ТАБЛИЦА USER_FOLLOWS (Социальный граф)
-- ==========================================

CREATE TABLE IF NOT EXISTS user_follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followed_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  PRIMARY KEY (follower_id, followed_id),
  CONSTRAINT no_self_follow CHECK (follower_id != followed_id)
);

-- Индексы для user_follows
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_followed ON user_follows(followed_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created_at ON user_follows(created_at DESC);

-- Комментарии
COMMENT ON TABLE user_follows IS 'Социальный граф: кто на кого подписан (асимметричные подписки)';

-- ==========================================
-- 5. ТАБЛИЦА DIARY_LIKES (Лайки дневников)
-- ==========================================

CREATE TABLE IF NOT EXISTS diary_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID NOT NULL REFERENCES travel_diaries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(diary_id, user_id) -- Один пользователь может лайкнуть дневник только один раз
);

-- Индексы для diary_likes
CREATE INDEX IF NOT EXISTS idx_diary_likes_diary_id ON diary_likes(diary_id);
CREATE INDEX IF NOT EXISTS idx_diary_likes_user_id ON diary_likes(user_id);

-- ==========================================
-- 6. ТАБЛИЦА ACTIVITY_FEED (Лента активности)
-- ==========================================

CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Тип активности
  activity_type TEXT NOT NULL, -- 'diary_created', 'diary_published', 'review_posted', 'achievement_unlocked', 'tour_completed'
  
  -- Целевой объект
  target_type TEXT, -- 'diary', 'review', 'achievement', 'tour'
  target_id UUID, -- ID целевого объекта
  
  -- Метаданные активности
  metadata JSONB, -- Дополнительные данные (название дневника, тип бейджа и т.д.)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для activity_feed
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_activity_type ON activity_feed(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_target ON activity_feed(target_type, target_id) WHERE target_type IS NOT NULL;

-- Комментарии
COMMENT ON TABLE activity_feed IS 'Лента активности пользователей для социальных функций';

-- ==========================================
-- 7. ТРИГГЕРЫ
-- ==========================================

-- Автоматическое обновление updated_at для travel_diaries
CREATE OR REPLACE FUNCTION update_travel_diaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_travel_diaries_updated_at
  BEFORE UPDATE ON travel_diaries
  FOR EACH ROW
  EXECUTE FUNCTION update_travel_diaries_updated_at();

-- Автоматическое обновление счетчика лайков
CREATE OR REPLACE FUNCTION update_diary_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE travel_diaries 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.diary_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE travel_diaries 
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.diary_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_diary_likes_count
  AFTER INSERT OR DELETE ON diary_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_diary_likes_count();

-- ==========================================
-- 8. RLS ПОЛИТИКИ
-- ==========================================

-- Включаем RLS
ALTER TABLE travel_diaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- Travel Diaries: пользователи могут видеть свои дневники и публичные дневники других
CREATE POLICY "Users can view own diaries"
  ON travel_diaries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view public diaries"
  ON travel_diaries FOR SELECT
  USING (status = 'published' AND visibility = 'public');

CREATE POLICY "Users can create own diaries"
  ON travel_diaries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own diaries"
  ON travel_diaries FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own diaries"
  ON travel_diaries FOR DELETE
  USING (user_id = auth.uid());

-- Achievements: пользователи могут видеть свои достижения и публичные достижения других
CREATE POLICY "Users can view own achievements"
  ON achievements FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view public achievements"
  ON achievements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = achievements.user_id
      AND public_profile_enabled = true
    )
  );

-- User Follows: пользователи могут видеть свои подписки
CREATE POLICY "Users can view own follows"
  ON user_follows FOR SELECT
  USING (follower_id = auth.uid() OR followed_id = auth.uid());

CREATE POLICY "Users can create own follows"
  ON user_follows FOR INSERT
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can delete own follows"
  ON user_follows FOR DELETE
  USING (follower_id = auth.uid());

-- Diary Likes: пользователи могут видеть лайки и ставить свои
CREATE POLICY "Users can view all likes"
  ON diary_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can create own likes"
  ON diary_likes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own likes"
  ON diary_likes FOR DELETE
  USING (user_id = auth.uid());

-- Activity Feed: пользователи могут видеть активность тех, на кого подписаны
CREATE POLICY "Users can view followed activity"
  ON activity_feed FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_follows
      WHERE follower_id = auth.uid()
      AND followed_id = activity_feed.user_id
    )
  );

-- ==========================================
-- 9. ФУНКЦИИ-ХЕЛПЕРЫ
-- ==========================================

-- Функция для проверки уникальности username
CREATE OR REPLACE FUNCTION is_username_available(p_username TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE LOWER(username) = LOWER(p_username)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для генерации username из имени (если не указан)
CREATE OR REPLACE FUNCTION generate_username_from_name(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_first_name TEXT;
  v_last_name TEXT;
  v_base_username TEXT;
  v_username TEXT;
  v_counter INTEGER := 0;
BEGIN
  SELECT first_name, last_name INTO v_first_name, v_last_name
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_first_name IS NULL OR v_last_name IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Транслитерация и создание базового username
  v_base_username := LOWER(
    TRANSLATE(
      SUBSTRING(v_first_name, 1, 1) || v_last_name,
      'абвгдеёжзийклмнопрстуфхцчшщъыьэюя',
      'abvgdeezziyklmnoprstufhccss_y_eua'
    )
  );
  
  -- Удаляем недопустимые символы, оставляем только латиницу, цифры, дефисы, подчеркивания
  v_base_username := REGEXP_REPLACE(v_base_username, '[^a-z0-9_-]', '', 'g');
  
  -- Проверяем уникальность и добавляем число если нужно
  v_username := v_base_username;
  WHILE EXISTS (SELECT 1 FROM profiles WHERE LOWER(username) = LOWER(v_username)) LOOP
    v_counter := v_counter + 1;
    v_username := v_base_username || '_' || v_counter;
  END LOOP;
  
  RETURN v_username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для обновления статуса пользователя на основе количества туров
CREATE OR REPLACE FUNCTION update_user_status_level(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_completed_tours INTEGER;
  v_published_diaries INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Подсчитываем завершенные туры
  SELECT COUNT(*) INTO v_completed_tours
  FROM bookings
  WHERE user_id = p_user_id
  AND status = 'completed';
  
  -- Подсчитываем опубликованные дневники
  SELECT COUNT(*) INTO v_published_diaries
  FROM travel_diaries
  WHERE user_id = p_user_id
  AND status = 'published';
  
  -- Определяем уровень
  IF v_completed_tours >= 20 OR v_published_diaries >= 15 THEN
    v_new_level := 4; -- Эксперт
  ELSIF v_completed_tours >= 10 OR v_published_diaries >= 8 THEN
    v_new_level := 3; -- Знаток региона
  ELSIF v_completed_tours >= 3 OR v_published_diaries >= 2 THEN
    v_new_level := 2; -- Исследователь
  ELSE
    v_new_level := 1; -- Новичок
  END IF;
  
  -- Обновляем уровень
  UPDATE profiles
  SET status_level = v_new_level
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



















