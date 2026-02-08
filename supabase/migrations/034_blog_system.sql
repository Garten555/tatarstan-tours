-- Migration 034: Blog System
-- Date: 2025-01-XX
-- Description: Создание системы блога для путешествий

-- ==========================================
-- 1. ENUMS
-- ==========================================

-- Статус поста блога
DO $$ BEGIN
  CREATE TYPE blog_post_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Видимость поста
DO $$ BEGIN
  CREATE TYPE blog_post_visibility AS ENUM ('public', 'friends', 'private');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- 2. CATEGORIES (Категории блога)
-- ==========================================

CREATE TABLE IF NOT EXISTS blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- Название иконки (например, 'city', 'mountain')
  color TEXT DEFAULT '#10b981', -- Цвет категории (hex)
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для категорий
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);
CREATE INDEX IF NOT EXISTS idx_blog_categories_order ON blog_categories(order_index);

-- ==========================================
-- 3. TAGS (Теги блога)
-- ==========================================

CREATE TABLE IF NOT EXISTS blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для тегов
CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON blog_tags(slug);
CREATE INDEX IF NOT EXISTS idx_blog_tags_usage ON blog_tags(usage_count DESC);

-- ==========================================
-- 4. BLOG POSTS (Посты блога)
-- ==========================================

CREATE TABLE IF NOT EXISTS travel_blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Основной контент
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT, -- Краткое описание (200-300 символов)
  content TEXT, -- Основной текст (HTML/Markdown)
  cover_image_url TEXT,
  cover_image_path TEXT,
  
  -- Метаданные
  status blog_post_status DEFAULT 'draft',
  visibility blog_post_visibility DEFAULT 'public',
  featured BOOLEAN DEFAULT false, -- Избранные посты
  pinned BOOLEAN DEFAULT false, -- Закрепленные посты автора
  
  -- Связи
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL, -- Опционально, если связан с туром
  category_id UUID REFERENCES blog_categories(id) ON DELETE SET NULL,
  
  -- Теги (JSON массив ID тегов)
  tag_ids UUID[] DEFAULT '{}',
  
  -- Локации (JSON массив локаций)
  location_tags TEXT[] DEFAULT '{}',
  
  -- Статистика
  reading_time INTEGER DEFAULT 0, -- Время чтения в минутах
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  
  -- Даты
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Уникальность slug для каждого пользователя
  UNIQUE(user_id, slug)
);

-- Индексы для постов
CREATE INDEX IF NOT EXISTS idx_blog_posts_user ON travel_blog_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON travel_blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON travel_blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_visibility ON travel_blog_posts(visibility);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON travel_blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tour ON travel_blog_posts(tour_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON travel_blog_posts(published_at DESC) WHERE status = 'published' AND visibility = 'public';
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON travel_blog_posts(featured DESC) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_blog_posts_created ON travel_blog_posts(created_at DESC);

-- GIN индекс для тегов (для поиска по массиву)
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON travel_blog_posts USING GIN(tag_ids);
CREATE INDEX IF NOT EXISTS idx_blog_posts_locations ON travel_blog_posts USING GIN(location_tags);

-- ==========================================
-- 5. BLOG POST TAGS (Связь многие-ко-многим)
-- ==========================================

CREATE TABLE IF NOT EXISTS blog_post_tags (
  post_id UUID NOT NULL REFERENCES travel_blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post ON blog_post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag ON blog_post_tags(tag_id);

-- ==========================================
-- 6. BLOG COMMENTS (Комментарии)
-- ==========================================

CREATE TABLE IF NOT EXISTS blog_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES travel_blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES blog_comments(id) ON DELETE CASCADE, -- Для ответов
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для комментариев
CREATE INDEX IF NOT EXISTS idx_blog_comments_post ON blog_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_user ON blog_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_parent ON blog_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_created ON blog_comments(created_at DESC);

-- ==========================================
-- 7. BLOG LIKES (Лайки постов)
-- ==========================================

CREATE TABLE IF NOT EXISTS blog_likes (
  post_id UUID NOT NULL REFERENCES travel_blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_likes_post ON blog_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_likes_user ON blog_likes(user_id);

-- ==========================================
-- 8. BLOG SUBSCRIPTIONS (Подписки на авторов)
-- ==========================================

CREATE TABLE IF NOT EXISTS blog_subscriptions (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Подписчик
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Автор
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, author_id),
  CONSTRAINT no_self_subscription CHECK (user_id != author_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_subscriptions_user ON blog_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_subscriptions_author ON blog_subscriptions(author_id);

-- ==========================================
-- 9. BLOG BOOKMARKS (Закладки)
-- ==========================================

CREATE TABLE IF NOT EXISTS blog_bookmarks (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES travel_blog_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_bookmarks_user ON blog_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_bookmarks_post ON blog_bookmarks(post_id);

-- ==========================================
-- 10. TRIGGERS (Триггеры)
-- ==========================================

-- Обновление updated_at
CREATE OR REPLACE FUNCTION update_blog_post_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_blog_post_updated_at
  BEFORE UPDATE ON travel_blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_post_updated_at();

-- Обновление счетчика комментариев
CREATE OR REPLACE FUNCTION update_blog_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE travel_blog_posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE travel_blog_posts
    SET comments_count = GREATEST(comments_count - 1, 0)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_blog_comments_count_insert
  AFTER INSERT ON blog_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_post_comments_count();

CREATE TRIGGER trigger_update_blog_comments_count_delete
  AFTER DELETE ON blog_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_post_comments_count();

-- Обновление счетчика лайков
CREATE OR REPLACE FUNCTION update_blog_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE travel_blog_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE travel_blog_posts
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_blog_likes_count_insert
  AFTER INSERT ON blog_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_post_likes_count();

CREATE TRIGGER trigger_update_blog_likes_count_delete
  AFTER DELETE ON blog_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_post_likes_count();

-- Обновление usage_count для тегов
CREATE OR REPLACE FUNCTION update_blog_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE blog_tags
    SET usage_count = usage_count + 1
    WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE blog_tags
    SET usage_count = GREATEST(usage_count - 1, 0)
    WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_blog_tag_usage_insert
  AFTER INSERT ON blog_post_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_tag_usage_count();

CREATE TRIGGER trigger_update_blog_tag_usage_delete
  AFTER DELETE ON blog_post_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_tag_usage_count();

-- ==========================================
-- 11. INITIAL DATA (Начальные данные)
-- ==========================================

-- Добавляем категории блога
INSERT INTO blog_categories (name, slug, description, icon, color, order_index) VALUES
  ('Города', 'cities', 'Путешествия по городам Татарстана', 'city', '#10b981', 1),
  ('Достопримечательности', 'attractions', 'Исторические и культурные достопримечательности', 'landmark', '#3b82f6', 2),
  ('Культура', 'culture', 'Культурные события и традиции', 'culture', '#8b5cf6', 3),
  ('Еда', 'food', 'Кулинарные путешествия', 'food', '#f59e0b', 4),
  ('Природа', 'nature', 'Природные красоты и заповедники', 'nature', '#10b981', 5),
  ('Приключения', 'adventure', 'Активный отдых и приключения', 'adventure', '#ef4444', 6)
ON CONFLICT (slug) DO NOTHING;

-- ==========================================
-- 12. RLS POLICIES (Политики безопасности)
-- ==========================================

-- Включаем RLS для всех таблиц
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_bookmarks ENABLE ROW LEVEL SECURITY;

-- Категории: все могут читать
CREATE POLICY "Anyone can view blog categories"
  ON blog_categories FOR SELECT
  USING (true);

-- Теги: все могут читать
CREATE POLICY "Anyone can view blog tags"
  ON blog_tags FOR SELECT
  USING (true);

-- Посты: публичные посты видны всем, приватные - только автору
CREATE POLICY "Public posts are visible to everyone"
  ON travel_blog_posts FOR SELECT
  USING (
    (status = 'published' AND visibility = 'public') OR
    (user_id = auth.uid())
  );

CREATE POLICY "Users can create their own posts"
  ON travel_blog_posts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own posts"
  ON travel_blog_posts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own posts"
  ON travel_blog_posts FOR DELETE
  USING (user_id = auth.uid());

-- Комментарии: все могут читать комментарии к публичным постам
CREATE POLICY "Comments are visible for public posts"
  ON blog_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM travel_blog_posts
      WHERE travel_blog_posts.id = blog_comments.post_id
      AND travel_blog_posts.status = 'published'
      AND travel_blog_posts.visibility = 'public'
    ) OR
    user_id = auth.uid()
  );

CREATE POLICY "Users can create comments"
  ON blog_comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own comments"
  ON blog_comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON blog_comments FOR DELETE
  USING (user_id = auth.uid());

-- Лайки: все могут видеть лайки публичных постов
CREATE POLICY "Likes are visible for public posts"
  ON blog_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM travel_blog_posts
      WHERE travel_blog_posts.id = blog_likes.post_id
      AND travel_blog_posts.status = 'published'
      AND travel_blog_posts.visibility = 'public'
    ) OR
    user_id = auth.uid()
  );

CREATE POLICY "Users can like posts"
  ON blog_likes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike posts"
  ON blog_likes FOR DELETE
  USING (user_id = auth.uid());

-- Подписки: пользователи видят свои подписки
CREATE POLICY "Users can view their subscriptions"
  ON blog_subscriptions FOR SELECT
  USING (user_id = auth.uid() OR author_id = auth.uid());

CREATE POLICY "Users can subscribe to authors"
  ON blog_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unsubscribe"
  ON blog_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- Закладки: пользователи видят только свои закладки
CREATE POLICY "Users can view their bookmarks"
  ON blog_bookmarks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can bookmark posts"
  ON blog_bookmarks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unbookmark posts"
  ON blog_bookmarks FOR DELETE
  USING (user_id = auth.uid());










