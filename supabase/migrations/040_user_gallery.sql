-- Создание таблицы для галереи пользователя
CREATE TABLE IF NOT EXISTS user_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  media_type media_type NOT NULL, -- 'image' или 'video'
  media_url TEXT NOT NULL, -- URL в S3
  media_path TEXT NOT NULL, -- Путь в S3
  thumbnail_url TEXT, -- Превью для видео
  file_name TEXT, -- Оригинальное имя файла
  file_size BIGINT, -- Размер в байтах
  mime_type TEXT, -- MIME тип
  description TEXT, -- Описание фото/видео (опционально)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_user_gallery_user_id ON user_gallery(user_id);
CREATE INDEX IF NOT EXISTS idx_user_gallery_media_type ON user_gallery(media_type);
CREATE INDEX IF NOT EXISTS idx_user_gallery_created_at ON user_gallery(created_at DESC);

-- RLS
ALTER TABLE user_gallery ENABLE ROW LEVEL SECURITY;

-- Политики
DROP POLICY IF EXISTS "Users can view own gallery" ON user_gallery;
CREATE POLICY "Users can view own gallery"
  ON user_gallery FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Public can view gallery of public profiles" ON user_gallery;
CREATE POLICY "Public can view gallery of public profiles"
  ON user_gallery FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_gallery.user_id
      AND profiles.public_profile_enabled = true
    )
  );

DROP POLICY IF EXISTS "Users can manage own gallery" ON user_gallery;
CREATE POLICY "Users can manage own gallery"
  ON user_gallery FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "service_role can manage user gallery" ON user_gallery;
CREATE POLICY "service_role can manage user gallery"
  ON user_gallery FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Триггер для updated_at
CREATE OR REPLACE FUNCTION update_user_gallery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_gallery_updated_at ON user_gallery;
CREATE TRIGGER trigger_update_user_gallery_updated_at
  BEFORE UPDATE ON user_gallery
  FOR EACH ROW
  EXECUTE FUNCTION update_user_gallery_updated_at();










