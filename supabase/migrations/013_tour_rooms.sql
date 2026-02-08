-- Migration 013: Tour Rooms - Комнаты для туров с мессенджером и галереей
-- Создание системы комнат для каждого тура с чатом, медиа и назначением гида

-- ==========================================
-- ТАБЛИЦЫ
-- ==========================================

-- 1. Tour Rooms (Комнаты для туров)
-- Одна комната на один тур, создается автоматически при первом confirmed бронировании
CREATE TABLE IF NOT EXISTS tour_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  guide_id UUID REFERENCES profiles(id), -- Назначенный гид (главный по группе)
  created_by UUID REFERENCES profiles(id), -- Кто создал комнату (обычно админ)
  is_active BOOLEAN DEFAULT TRUE, -- Активна ли комната
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Одна комната на один тур
  CONSTRAINT unique_tour_room UNIQUE(tour_id)
);

-- 2. Tour Room Participants (Участники комнаты)
-- Автоматически добавляются при подтверждении бронирования
CREATE TABLE IF NOT EXISTS tour_room_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES tour_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL, -- Связь с бронированием
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Один пользователь - одна запись на комнату
  CONSTRAINT unique_participant UNIQUE(room_id, user_id)
);

-- 3. Tour Room Messages (Сообщения в комнатах)
CREATE TABLE IF NOT EXISTS tour_room_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES tour_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Мягкое удаление
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 4. Tour Room Media (Медиа в комнатах)
-- Фото и видео, загруженные участниками во время тура
CREATE TABLE IF NOT EXISTS tour_room_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES tour_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  media_type media_type NOT NULL, -- 'image' или 'video' (используем существующий enum)
  media_url TEXT NOT NULL, -- URL в S3
  media_path TEXT NOT NULL, -- Путь в S3
  thumbnail_url TEXT, -- Превью для видео
  file_name TEXT, -- Оригинальное имя файла
  file_size BIGINT, -- Размер в байтах
  mime_type TEXT, -- MIME тип
  is_temporary BOOLEAN DEFAULT TRUE, -- Временное (до окончания тура)
  archived_at TIMESTAMP WITH TIME ZONE, -- Когда архивировано
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ИНДЕКСЫ
-- ==========================================

-- Tour Rooms
CREATE INDEX IF NOT EXISTS idx_tour_rooms_tour_id ON tour_rooms(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_rooms_guide_id ON tour_rooms(guide_id);
CREATE INDEX IF NOT EXISTS idx_tour_rooms_is_active ON tour_rooms(is_active);

-- Tour Room Participants
CREATE INDEX IF NOT EXISTS idx_tour_room_participants_room_id ON tour_room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_tour_room_participants_user_id ON tour_room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_tour_room_participants_booking_id ON tour_room_participants(booking_id);

-- Tour Room Messages
CREATE INDEX IF NOT EXISTS idx_tour_room_messages_room_id ON tour_room_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tour_room_messages_user_id ON tour_room_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_tour_room_messages_deleted_at ON tour_room_messages(deleted_at) WHERE deleted_at IS NULL;

-- Tour Room Media
CREATE INDEX IF NOT EXISTS idx_tour_room_media_room_id ON tour_room_media(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tour_room_media_user_id ON tour_room_media(user_id);
CREATE INDEX IF NOT EXISTS idx_tour_room_media_is_temporary ON tour_room_media(is_temporary);
CREATE INDEX IF NOT EXISTS idx_tour_room_media_archived_at ON tour_room_media(archived_at);

-- ==========================================
-- ФУНКЦИИ И ТРИГГЕРЫ
-- ==========================================

-- Функция: Обновление updated_at для tour_rooms
CREATE OR REPLACE FUNCTION update_tour_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления updated_at
DROP TRIGGER IF EXISTS trigger_update_tour_rooms_updated_at ON tour_rooms;
CREATE TRIGGER trigger_update_tour_rooms_updated_at
  BEFORE UPDATE ON tour_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_tour_rooms_updated_at();

-- Функция: Автоматическое создание комнаты при первом confirmed бронировании
CREATE OR REPLACE FUNCTION create_tour_room_on_booking()
RETURNS TRIGGER AS $$
DECLARE
  room_uuid UUID;
BEGIN
  -- Создаем комнату при первом confirmed бронировании
  IF NEW.status = 'confirmed' THEN
    -- Пытаемся создать комнату (если уже есть - игнорируем)
    INSERT INTO tour_rooms (tour_id, created_by)
    VALUES (NEW.tour_id, NEW.user_id)
    ON CONFLICT (tour_id) DO NOTHING
    RETURNING id INTO room_uuid;
    
    -- Если комната создана или уже существует, получаем её ID
    IF room_uuid IS NULL THEN
      SELECT id INTO room_uuid
      FROM tour_rooms
      WHERE tour_id = NEW.tour_id;
    END IF;
    
    -- Добавляем пользователя в участники
    IF room_uuid IS NOT NULL THEN
      INSERT INTO tour_room_participants (room_id, user_id, booking_id)
      VALUES (room_uuid, NEW.user_id, NEW.id)
      ON CONFLICT (room_id, user_id) DO UPDATE
      SET booking_id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического создания комнаты
DROP TRIGGER IF EXISTS trigger_create_tour_room ON bookings;
CREATE TRIGGER trigger_create_tour_room
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION create_tour_room_on_booking();

-- Функция: Архивация медиа после окончания тура
-- Проверяет end_date тура и архивирует временные медиа
CREATE OR REPLACE FUNCTION archive_tour_room_media()
RETURNS TRIGGER AS $$
DECLARE
  tour_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Получаем дату окончания тура
  SELECT end_date INTO tour_end_date
  FROM tours
  WHERE id = (SELECT tour_id FROM tour_rooms WHERE id = NEW.room_id);
  
  -- Если тур закончился, архивируем временные медиа
  IF tour_end_date IS NOT NULL AND tour_end_date < NOW() THEN
    UPDATE tour_room_media
    SET is_temporary = FALSE,
        archived_at = NOW()
    WHERE room_id = NEW.room_id
      AND is_temporary = TRUE
      AND archived_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер при загрузке медиа (проверяет нужно ли архивировать)
DROP TRIGGER IF EXISTS trigger_archive_media_on_upload ON tour_room_media;
CREATE TRIGGER trigger_archive_media_on_upload
  AFTER INSERT ON tour_room_media
  FOR EACH ROW
  EXECUTE FUNCTION archive_tour_room_media();

-- Функция: Периодическая архивация медиа (можно вызывать через cron)
-- Архивирует все временные медиа для туров, которые уже закончились
CREATE OR REPLACE FUNCTION archive_expired_tour_media()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  UPDATE tour_room_media
  SET is_temporary = FALSE,
      archived_at = NOW()
  FROM tour_rooms tr
  JOIN tours t ON t.id = tr.tour_id
  WHERE tour_room_media.room_id = tr.id
    AND t.end_date < NOW()
    AND tour_room_media.is_temporary = TRUE
    AND tour_room_media.archived_at IS NULL;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Tour Rooms
ALTER TABLE tour_rooms ENABLE ROW LEVEL SECURITY;

-- Участники могут видеть свою комнату
CREATE POLICY "Participants can view room"
  ON tour_rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tour_room_participants
      WHERE room_id = tour_rooms.id
      AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tour_admin', 'super_admin')
    )
  );

-- Админы могут управлять комнатами
CREATE POLICY "Admins can manage rooms"
  ON tour_rooms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tour_admin', 'super_admin')
    )
  );

-- Tour Room Participants
ALTER TABLE tour_room_participants ENABLE ROW LEVEL SECURITY;

-- Участники могут видеть список участников своей комнаты
CREATE POLICY "Participants can view room participants"
  ON tour_room_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tour_room_participants trp2
      WHERE trp2.room_id = tour_room_participants.room_id
      AND trp2.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tour_admin', 'super_admin')
    )
  );

-- Tour Room Messages
ALTER TABLE tour_room_messages ENABLE ROW LEVEL SECURITY;

-- Участники могут видеть сообщения своей комнаты
CREATE POLICY "Participants can view messages"
  ON tour_room_messages FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM tour_room_participants
      WHERE room_id = tour_room_messages.room_id
      AND user_id = auth.uid()
    )
  );

-- Участники могут отправлять сообщения
CREATE POLICY "Participants can send messages"
  ON tour_room_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tour_room_participants
      WHERE room_id = tour_room_messages.room_id
      AND user_id = auth.uid()
    )
  );

-- Пользователь может удалять свои сообщения, гид и админы - любые
CREATE POLICY "Users can delete messages"
  ON tour_room_messages FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tour_rooms
      WHERE id = tour_room_messages.room_id
      AND guide_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tour_admin', 'super_admin')
    )
  );

-- Tour Room Media
ALTER TABLE tour_room_media ENABLE ROW LEVEL SECURITY;

-- Участники могут видеть медиа своей комнаты
CREATE POLICY "Participants can view media"
  ON tour_room_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tour_room_participants
      WHERE room_id = tour_room_media.room_id
      AND user_id = auth.uid()
    )
  );

-- Участники могут загружать медиа
CREATE POLICY "Participants can upload media"
  ON tour_room_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tour_room_participants
      WHERE room_id = tour_room_media.room_id
      AND user_id = auth.uid()
    )
  );

-- Пользователь может удалять свое медиа, гид и админы - любое
CREATE POLICY "Users can delete media"
  ON tour_room_media FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tour_rooms
      WHERE id = tour_room_media.room_id
      AND guide_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tour_admin', 'super_admin')
    )
  );

-- ==========================================
-- КОММЕНТАРИИ
-- ==========================================

COMMENT ON TABLE tour_rooms IS 'Комнаты для туров - одна комната на один тур с чатом и галереей';
COMMENT ON COLUMN tour_rooms.guide_id IS 'Назначенный гид (главный по группе), может модерировать контент';
COMMENT ON COLUMN tour_rooms.is_active IS 'Активна ли комната (можно деактивировать после окончания тура)';

COMMENT ON TABLE tour_room_participants IS 'Участники комнаты - автоматически добавляются при confirmed бронировании';
COMMENT ON COLUMN tour_room_participants.booking_id IS 'Связь с бронированием для отслеживания';

COMMENT ON TABLE tour_room_messages IS 'Сообщения в чате комнаты тура';
COMMENT ON COLUMN tour_room_messages.deleted_at IS 'Мягкое удаление сообщений';

COMMENT ON TABLE tour_room_media IS 'Медиа (фото/видео) загруженные участниками во время тура';
COMMENT ON COLUMN tour_room_media.is_temporary IS 'Временное медиа (до окончания тура), затем архивируется';
COMMENT ON COLUMN tour_room_media.archived_at IS 'Дата архивации медиа после окончания тура';

COMMENT ON FUNCTION archive_expired_tour_media() IS 'Архивирует все временные медиа для закончившихся туров (можно вызывать через cron)';





















