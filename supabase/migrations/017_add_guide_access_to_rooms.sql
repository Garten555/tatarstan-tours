-- Миграция: Добавление доступа гидов к комнатам туров
-- Migration 017: Add guide access to tour rooms

-- Обновляем RLS политику для tour_rooms: гиды могут видеть комнаты, где они назначены гидами
DROP POLICY IF EXISTS "Participants can view room" ON tour_rooms;

CREATE POLICY "Participants and guides can view room"
  ON tour_rooms FOR SELECT
  USING (
    -- Участники могут видеть свою комнату
    EXISTS (
      SELECT 1 FROM tour_room_participants
      WHERE room_id = tour_rooms.id
      AND user_id = auth.uid()
    )
    -- Гиды могут видеть комнаты, где они назначены гидами
    OR guide_id = auth.uid()
    -- Админы могут видеть все комнаты
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tour_admin', 'super_admin')
    )
  );

-- Обновляем RLS политику для tour_room_participants: гиды могут видеть участников
DROP POLICY IF EXISTS "Participants can view room participants" ON tour_room_participants;

CREATE POLICY "Participants and guides can view room participants"
  ON tour_room_participants FOR SELECT
  USING (
    -- Участники могут видеть список участников своей комнаты
    EXISTS (
      SELECT 1 FROM tour_room_participants trp2
      WHERE trp2.room_id = tour_room_participants.room_id
      AND trp2.user_id = auth.uid()
    )
    -- Гиды могут видеть участников комнат, где они назначены гидами
    OR EXISTS (
      SELECT 1 FROM tour_rooms
      WHERE id = tour_room_participants.room_id
      AND guide_id = auth.uid()
    )
    -- Админы могут видеть всех участников
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tour_admin', 'super_admin')
    )
  );

-- Обновляем RLS политику для tour_room_messages: гиды могут видеть сообщения
DROP POLICY IF EXISTS "Participants can view messages" ON tour_room_messages;

CREATE POLICY "Participants and guides can view messages"
  ON tour_room_messages FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      -- Участники могут видеть сообщения своей комнаты
      EXISTS (
        SELECT 1 FROM tour_room_participants
        WHERE room_id = tour_room_messages.room_id
        AND user_id = auth.uid()
      )
      -- Гиды могут видеть сообщения комнат, где они назначены гидами
      OR EXISTS (
        SELECT 1 FROM tour_rooms
        WHERE id = tour_room_messages.room_id
        AND guide_id = auth.uid()
      )
      -- Админы могут видеть все сообщения
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('tour_admin', 'super_admin')
      )
    )
  );

-- Обновляем RLS политику для отправки сообщений: гиды могут отправлять сообщения
DROP POLICY IF EXISTS "Participants can send messages" ON tour_room_messages;

CREATE POLICY "Participants and guides can send messages"
  ON tour_room_messages FOR INSERT
  WITH CHECK (
    -- Участники могут отправлять сообщения
    EXISTS (
      SELECT 1 FROM tour_room_participants
      WHERE room_id = tour_room_messages.room_id
      AND user_id = auth.uid()
    )
    -- Гиды могут отправлять сообщения в комнаты, где они назначены гидами
    OR EXISTS (
      SELECT 1 FROM tour_rooms
      WHERE id = tour_room_messages.room_id
      AND guide_id = auth.uid()
    )
    -- Админы могут отправлять сообщения в любые комнаты
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tour_admin', 'super_admin')
    )
  );

-- Обновляем RLS политику для tour_room_media: гиды могут видеть медиа
DROP POLICY IF EXISTS "Participants can view media" ON tour_room_media;

CREATE POLICY "Participants and guides can view media"
  ON tour_room_media FOR SELECT
  USING (
    -- Участники могут видеть медиа своей комнаты
    EXISTS (
      SELECT 1 FROM tour_room_participants
      WHERE room_id = tour_room_media.room_id
      AND user_id = auth.uid()
    )
    -- Гиды могут видеть медиа комнат, где они назначены гидами
    OR EXISTS (
      SELECT 1 FROM tour_rooms
      WHERE id = tour_room_media.room_id
      AND guide_id = auth.uid()
    )
    -- Админы могут видеть все медиа
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tour_admin', 'super_admin')
    )
  );

-- Обновляем RLS политику для загрузки медиа: гиды могут загружать медиа
DROP POLICY IF EXISTS "Participants can upload media" ON tour_room_media;

CREATE POLICY "Participants and guides can upload media"
  ON tour_room_media FOR INSERT
  WITH CHECK (
    -- Участники могут загружать медиа
    EXISTS (
      SELECT 1 FROM tour_room_participants
      WHERE room_id = tour_room_media.room_id
      AND user_id = auth.uid()
    )
    -- Гиды могут загружать медиа в комнаты, где они назначены гидами
    OR EXISTS (
      SELECT 1 FROM tour_rooms
      WHERE id = tour_room_media.room_id
      AND guide_id = auth.uid()
    )
    -- Админы могут загружать медиа в любые комнаты
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tour_admin', 'super_admin')
    )
  );





















