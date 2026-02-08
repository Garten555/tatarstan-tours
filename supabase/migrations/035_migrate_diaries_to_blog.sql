-- Migration 035: Migrate travel_diaries to travel_blog_posts
-- Date: 2025-01-XX
-- Description: Миграция данных из старых дневников в новую систему блога

-- ==========================================
-- 1. МИГРАЦИЯ ДАННЫХ ИЗ TRAVEL_DIARIES В TRAVEL_BLOG_POSTS
-- ==========================================

-- Функция для генерации slug из title
CREATE OR REPLACE FUNCTION generate_slug_from_title(p_title TEXT, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_base_slug TEXT;
  v_slug TEXT;
  v_counter INTEGER := 0;
BEGIN
  -- Транслитерация и создание базового slug
  v_base_slug := LOWER(
    REGEXP_REPLACE(
      TRANSLATE(
        p_title,
        'абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',
        'abvgdeezziyklmnoprstufhccss_y_euaabvgdeezziyklmnoprstufhccss_y_eua'
      ),
      '[^a-z0-9]+',
      '-',
      'g'
    )
  );
  
  -- Удаляем дефисы в начале и конце
  v_base_slug := TRIM(BOTH '-' FROM v_base_slug);
  
  -- Ограничиваем длину
  IF LENGTH(v_base_slug) > 100 THEN
    v_base_slug := SUBSTRING(v_base_slug, 1, 100);
  END IF;
  
  -- Проверяем уникальность для пользователя и добавляем число если нужно
  v_slug := v_base_slug;
  WHILE EXISTS (
    SELECT 1 FROM travel_blog_posts 
    WHERE user_id = p_user_id AND slug = v_slug
  ) LOOP
    v_counter := v_counter + 1;
    v_slug := v_base_slug || '-' || v_counter;
  END LOOP;
  
  RETURN v_slug;
END;
$$ LANGUAGE plpgsql;

-- Миграция дневников в посты блога
INSERT INTO travel_blog_posts (
  id,
  user_id,
  title,
  slug,
  excerpt,
  content,
  cover_image_url,
  cover_image_path,
  status,
  visibility,
  featured,
  pinned,
  tour_id,
  category_id,
  location_tags,
  reading_time,
  views_count,
  likes_count,
  created_at,
  updated_at,
  published_at
)
SELECT 
  td.id, -- Сохраняем тот же ID для связи с achievements
  td.user_id,
  td.title,
  generate_slug_from_title(td.title, td.user_id) as slug,
  -- Создаем excerpt из первых 200 символов content
  CASE 
    WHEN td.content IS NOT NULL THEN 
      SUBSTRING(td.content FROM 1 FOR 200) || 
      CASE WHEN LENGTH(td.content) > 200 THEN '...' ELSE '' END
    ELSE NULL
  END as excerpt,
  td.content,
  td.cover_image_url,
  td.cover_image_path,
  -- Маппинг статусов: draft -> draft, published -> published, private -> draft
  CASE 
    WHEN td.status = 'published' THEN 'published'::blog_post_status
    WHEN td.status = 'private' THEN 'draft'::blog_post_status
    ELSE 'draft'::blog_post_status
  END as status,
  -- Маппинг видимости: private -> private, friends -> friends, public -> public
  CASE 
    WHEN td.visibility = 'private' THEN 'private'::blog_post_visibility
    WHEN td.visibility = 'friends' THEN 'friends'::blog_post_visibility
    WHEN td.visibility = 'public' THEN 'public'::blog_post_visibility
    ELSE 'public'::blog_post_visibility
  END as visibility,
  false as featured, -- По умолчанию не избранные
  false as pinned, -- По умолчанию не закрепленные
  td.tour_id,
  -- Определяем категорию на основе категории тура или по умолчанию
  (
    SELECT bc.id 
    FROM blog_categories bc
    WHERE bc.slug = CASE 
      WHEN t.category = 'history' THEN 'attractions'
      WHEN t.category = 'nature' THEN 'nature'
      WHEN t.category = 'culture' THEN 'culture'
      WHEN t.category = 'food' THEN 'food'
      WHEN t.category = 'adventure' THEN 'adventure'
      WHEN t.category = 'architecture' THEN 'attractions'
      ELSE 'cities'
    END
    LIMIT 1
  ) as category_id,
  -- Извлекаем локации из location_data или используем пустой массив
  COALESCE(
    (
      SELECT ARRAY_AGG(loc->>'name')
      FROM jsonb_array_elements(td.location_data->'locations') loc
      WHERE loc->>'name' IS NOT NULL
    ),
    ARRAY[]::TEXT[]
  ) as location_tags,
  -- Расчет времени чтения (примерно 200 слов в минуту)
  GREATEST(1, CEIL(
    CASE 
      WHEN td.content IS NOT NULL THEN 
        array_length(string_to_array(td.content, ' '), 1) / 200.0
      ELSE 1
    END
  ))::INTEGER as reading_time,
  COALESCE(td.views_count, 0) as views_count,
  COALESCE(td.likes_count, 0) as likes_count,
  td.created_at,
  td.updated_at,
  td.published_at
FROM travel_diaries td
LEFT JOIN tours t ON td.tour_id = t.id
WHERE NOT EXISTS (
  -- Пропускаем дневники, которые уже мигрированы
  SELECT 1 FROM travel_blog_posts tbp WHERE tbp.id = td.id
)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 2. МИГРАЦИЯ ЛАЙКОВ ИЗ DIARY_LIKES В BLOG_LIKES
-- ==========================================

INSERT INTO blog_likes (post_id, user_id, created_at)
SELECT 
  dl.diary_id as post_id, -- Используем тот же ID
  dl.user_id,
  dl.created_at
FROM diary_likes dl
WHERE EXISTS (
  -- Только лайки для дневников, которые были мигрированы в посты
  SELECT 1 FROM travel_blog_posts tbp WHERE tbp.id = dl.diary_id
)
AND NOT EXISTS (
  -- Пропускаем лайки, которые уже мигрированы
  SELECT 1 FROM blog_likes bl 
  WHERE bl.post_id = dl.diary_id AND bl.user_id = dl.user_id
)
ON CONFLICT (post_id, user_id) DO NOTHING;

-- ==========================================
-- 3. ОБНОВЛЕНИЕ СВЯЗЕЙ В ACHIEVEMENTS
-- ==========================================

-- Обновляем diary_id в achievements на post_id (они используют один и тот же ID)
-- Это не требуется, так как мы сохранили тот же ID при миграции
-- Но можно добавить комментарий для ясности
COMMENT ON COLUMN achievements.diary_id IS 'DEPRECATED: Используется для обратной совместимости. Новые достижения должны ссылаться на travel_blog_posts через tour_id или verification_data';

-- ==========================================
-- 4. ОБНОВЛЕНИЕ ФУНКЦИИ UPDATE_USER_STATUS_LEVEL
-- ==========================================

-- Обновляем функцию для использования travel_blog_posts вместо travel_diaries
CREATE OR REPLACE FUNCTION update_user_status_level(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_completed_tours INTEGER;
  v_published_posts INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Подсчитываем завершенные туры
  SELECT COUNT(*) INTO v_completed_tours
  FROM bookings
  WHERE user_id = p_user_id
  AND status = 'completed';
  
  -- Подсчитываем опубликованные посты блога (вместо дневников)
  SELECT COUNT(*) INTO v_published_posts
  FROM travel_blog_posts
  WHERE user_id = p_user_id
  AND status = 'published';
  
  -- Также учитываем старые дневники для обратной совместимости
  SELECT COUNT(*) + v_published_posts INTO v_published_posts
  FROM travel_diaries
  WHERE user_id = p_user_id
  AND status = 'published'
  AND NOT EXISTS (
    SELECT 1 FROM travel_blog_posts WHERE id = travel_diaries.id
  );
  
  -- Определяем уровень
  IF v_completed_tours >= 20 OR v_published_posts >= 15 THEN
    v_new_level := 4; -- Эксперт
  ELSIF v_completed_tours >= 10 OR v_published_posts >= 8 THEN
    v_new_level := 3; -- Знаток региона
  ELSIF v_completed_tours >= 3 OR v_published_posts >= 2 THEN
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

-- ==========================================
-- 5. СОЗДАНИЕ VIEW ДЛЯ ОБРАТНОЙ СОВМЕСТИМОСТИ
-- ==========================================

-- Создаем view, который объединяет старые дневники и новые посты
-- Это позволит старому коду продолжать работать
CREATE OR REPLACE VIEW travel_diaries_compat AS
SELECT 
  id,
  user_id,
  tour_id,
  NULL::UUID as booking_id, -- В блоге нет booking_id
  title,
  content,
  cover_image_url,
  cover_image_path,
  '[]'::jsonb as media_items, -- Медиа хранятся по-другому в блоге
  COALESCE(
    jsonb_build_object('locations', location_tags),
    '{}'::jsonb
  ) as location_data,
  NULL::DATE as travel_date, -- В блоге нет travel_date
  CASE 
    WHEN status = 'published' THEN 'published'
    ELSE 'draft'
  END as status,
  CASE 
    WHEN visibility = 'public' THEN 'public'
    WHEN visibility = 'friends' THEN 'friends'
    ELSE 'private'
  END as visibility,
  false as user_consent,
  false as auto_generated,
  views_count,
  likes_count,
  created_at,
  updated_at,
  published_at
FROM travel_blog_posts
UNION ALL
SELECT 
  id,
  user_id,
  tour_id,
  booking_id,
  title,
  content,
  cover_image_url,
  cover_image_path,
  media_items,
  location_data,
  travel_date,
  status,
  visibility,
  user_consent,
  auto_generated,
  views_count,
  likes_count,
  created_at,
  updated_at,
  published_at
FROM travel_diaries
WHERE NOT EXISTS (
  -- Только дневники, которые НЕ были мигрированы
  SELECT 1 FROM travel_blog_posts WHERE travel_blog_posts.id = travel_diaries.id
);

-- Комментарий для view
COMMENT ON VIEW travel_diaries_compat IS 'DEPRECATED: View для обратной совместимости. Объединяет travel_blog_posts и travel_diaries. Используйте travel_blog_posts напрямую.';

-- ==========================================
-- 6. ОБНОВЛЕНИЕ RLS ПОЛИТИК ДЛЯ VIEW
-- ==========================================

-- Включаем RLS для view (наследуется от базовых таблиц)
-- Политики применяются автоматически через UNION

-- ==========================================
-- 7. СОЗДАНИЕ ТРИГГЕРОВ ДЛЯ СИНХРОНИЗАЦИИ (ОПЦИОНАЛЬНО)
-- ==========================================

-- Если нужно синхронизировать изменения между старыми и новыми таблицами
-- (но это не рекомендуется, лучше полностью перейти на блог)

-- ==========================================
-- 8. СТАТИСТИКА МИГРАЦИИ
-- ==========================================

-- Функция для получения статистики миграции
CREATE OR REPLACE FUNCTION get_migration_stats()
RETURNS TABLE (
  total_diaries INTEGER,
  migrated_posts INTEGER,
  remaining_diaries INTEGER,
  migrated_likes INTEGER,
  remaining_likes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM travel_diaries)::INTEGER as total_diaries,
    (SELECT COUNT(*) FROM travel_blog_posts WHERE id IN (SELECT id FROM travel_diaries))::INTEGER as migrated_posts,
    (SELECT COUNT(*) FROM travel_diaries WHERE NOT EXISTS (
      SELECT 1 FROM travel_blog_posts WHERE travel_blog_posts.id = travel_diaries.id
    ))::INTEGER as remaining_diaries,
    (SELECT COUNT(*) FROM blog_likes WHERE post_id IN (SELECT id FROM travel_diaries))::INTEGER as migrated_likes,
    (SELECT COUNT(*) FROM diary_likes WHERE NOT EXISTS (
      SELECT 1 FROM blog_likes WHERE blog_likes.post_id = diary_likes.diary_id 
      AND blog_likes.user_id = diary_likes.user_id
    ))::INTEGER as remaining_likes;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 9. ИНСТРУКЦИИ ПО ИСПОЛЬЗОВАНИЮ
-- ==========================================

-- После применения миграции:
-- 1. Проверьте статистику: SELECT * FROM get_migration_stats();
-- 2. Убедитесь, что все данные мигрированы корректно
-- 3. Постепенно переводите код на использование travel_blog_posts
-- 4. Через некоторое время (когда весь код переведен) можно удалить travel_diaries

-- ==========================================
-- 10. ОЧИСТКА (ВЫПОЛНЯТЬ ТОЛЬКО ПОСЛЕ ПОЛНОГО ПЕРЕХОДА)
-- ==========================================

-- ВНИМАНИЕ: Не выполняйте эти команды сразу!
-- Выполняйте только после того, как весь код переведен на travel_blog_posts

/*
-- Удаление view (после перехода на блог)
DROP VIEW IF EXISTS travel_diaries_compat;

-- Удаление старых таблиц (после полного перехода)
-- Сначала нужно обновить внешние ключи в achievements
ALTER TABLE achievements DROP CONSTRAINT IF EXISTS achievements_diary_id_fkey;
ALTER TABLE achievements ALTER COLUMN diary_id DROP NOT NULL;

-- Удаление триггеров
DROP TRIGGER IF EXISTS trigger_update_travel_diaries_updated_at ON travel_diaries;
DROP TRIGGER IF EXISTS trigger_update_diary_likes_count ON diary_likes;
DROP FUNCTION IF EXISTS update_travel_diaries_updated_at();
DROP FUNCTION IF EXISTS update_diary_likes_count();

-- Удаление таблиц
DROP TABLE IF EXISTS diary_likes CASCADE;
DROP TABLE IF EXISTS travel_diaries CASCADE;
*/










