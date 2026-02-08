-- Migration 037: Система друзей, мессенджера и настроек приватности
-- Date: 2025-01-XX
-- Description: Полноценная система обмена сообщениями между пользователями с друзьями и настройками приватности

-- ==========================================
-- 1. ТАБЛИЦА ДРУЗЕЙ (двусторонние отношения)
-- ==========================================

CREATE TABLE IF NOT EXISTS user_friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  -- pending: запрос отправлен, ожидает подтверждения
  -- accepted: дружба подтверждена
  -- blocked: один из пользователей заблокировал другого
  
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Кто отправил запрос
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  -- Один пользователь может быть другом другого только один раз
  CONSTRAINT unique_friendship UNIQUE(user_id, friend_id),
  -- Пользователь не может быть другом самому себе
  CONSTRAINT no_self_friendship CHECK(user_id != friend_id)
);

-- Индексы для друзей
CREATE INDEX IF NOT EXISTS idx_user_friends_user_id ON user_friends(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_friends_friend_id ON user_friends(friend_id, status);
CREATE INDEX IF NOT EXISTS idx_user_friends_status ON user_friends(status);
CREATE INDEX IF NOT EXISTS idx_user_friends_created_at ON user_friends(created_at DESC);

COMMENT ON TABLE user_friends IS 'Двусторонние отношения дружбы между пользователями';
COMMENT ON COLUMN user_friends.status IS 'Статус дружбы: pending (ожидает), accepted (принято), blocked (заблокировано)';

-- ==========================================
-- 2. НАСТРОЙКИ ПРИВАТНОСТИ СООБЩЕНИЙ
-- ==========================================

CREATE TABLE IF NOT EXISTS user_message_privacy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Кто может писать пользователю
  who_can_message TEXT NOT NULL DEFAULT 'everyone' CHECK (who_can_message IN ('everyone', 'friends', 'nobody')),
  -- everyone: все могут писать
  -- friends: только друзья могут писать
  -- nobody: никто не может писать
  
  -- Автоматическое принятие запросов на дружбу
  auto_accept_friends BOOLEAN DEFAULT FALSE,
  
  -- Показывать статус "в сети"
  show_online_status BOOLEAN DEFAULT TRUE,
  
  -- Показывать время последнего посещения
  show_last_seen BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для настроек приватности
CREATE INDEX IF NOT EXISTS idx_user_message_privacy_user_id ON user_message_privacy(user_id);
CREATE INDEX IF NOT EXISTS idx_user_message_privacy_who_can_message ON user_message_privacy(who_can_message);

COMMENT ON TABLE user_message_privacy IS 'Настройки приватности для сообщений и друзей';
COMMENT ON COLUMN user_message_privacy.who_can_message IS 'Кто может отправлять сообщения: everyone (все), friends (только друзья), nobody (никто)';

-- ==========================================
-- 3. ПРИВАТНЫЕ СООБЩЕНИЯ МЕЖДУ ПОЛЬЗОВАТЕЛЯМИ
-- ==========================================

CREATE TABLE IF NOT EXISTS user_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Участники беседы
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Содержимое сообщения
  message TEXT NOT NULL,
  image_url TEXT,
  image_path TEXT,
  
  -- Статус сообщения
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Мягкое удаление
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Кто удалил (отправитель или получатель)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для сообщений
CREATE INDEX IF NOT EXISTS idx_user_messages_sender_id ON user_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_messages_recipient_id ON user_messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_messages_conversation ON user_messages(
  LEAST(sender_id, recipient_id), 
  GREATEST(sender_id, recipient_id), 
  created_at DESC
);
CREATE INDEX IF NOT EXISTS idx_user_messages_is_read ON user_messages(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_user_messages_deleted_at ON user_messages(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE user_messages IS 'Приватные сообщения между пользователями';
COMMENT ON COLUMN user_messages.deleted_by IS 'Кто удалил сообщение (отправитель или получатель)';

-- ==========================================
-- 4. БЕСЕДЫ (для группировки сообщений)
-- ==========================================

CREATE TABLE IF NOT EXISTS user_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Последнее сообщение в беседе
  last_message_id UUID REFERENCES user_messages(id) ON DELETE SET NULL,
  last_message_text TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  
  -- Непрочитанные сообщения для каждого пользователя
  unread_count_user1 INTEGER DEFAULT 0,
  unread_count_user2 INTEGER DEFAULT 0,
  
  -- Кто закрепил беседу
  pinned_by_user1 BOOLEAN DEFAULT FALSE,
  pinned_by_user2 BOOLEAN DEFAULT FALSE,
  
  -- Кто архивировал беседу
  archived_by_user1 BOOLEAN DEFAULT FALSE,
  archived_by_user2 BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Одна беседа на пару пользователей
  CONSTRAINT unique_conversation UNIQUE(user1_id, user2_id),
  CONSTRAINT no_self_conversation CHECK(user1_id != user2_id)
);

-- Индексы для бесед
CREATE INDEX IF NOT EXISTS idx_user_conversations_user1_id ON user_conversations(user1_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_conversations_user2_id ON user_conversations(user2_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_conversations_last_message_at ON user_conversations(last_message_at DESC);

COMMENT ON TABLE user_conversations IS 'Беседы между пользователями для группировки сообщений';

-- ==========================================
-- 5. ФУНКЦИИ И ТРИГГЕРЫ
-- ==========================================

-- Функция: Обновление updated_at для настроек приватности
CREATE OR REPLACE FUNCTION update_user_message_privacy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_message_privacy_updated_at ON user_message_privacy;
CREATE TRIGGER trigger_update_user_message_privacy_updated_at
  BEFORE UPDATE ON user_message_privacy
  FOR EACH ROW
  EXECUTE FUNCTION update_user_message_privacy_updated_at();

-- Функция: Обновление updated_at для бесед
CREATE OR REPLACE FUNCTION update_user_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_conversations_updated_at ON user_conversations;
CREATE TRIGGER trigger_update_user_conversations_updated_at
  BEFORE UPDATE ON user_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_conversations_updated_at();

-- Функция: Автоматическое создание/обновление беседы при отправке сообщения
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
  v_user1_id UUID;
  v_user2_id UUID;
  v_conversation_id UUID;
  v_message_text TEXT;
BEGIN
  -- Определяем порядок пользователей (меньший ID всегда user1_id)
  IF NEW.sender_id < NEW.recipient_id THEN
    v_user1_id := NEW.sender_id;
    v_user2_id := NEW.recipient_id;
  ELSE
    v_user1_id := NEW.recipient_id;
    v_user2_id := NEW.sender_id;
  END IF;
  
  -- Получаем текст сообщения (может быть NULL для изображений)
  v_message_text := COALESCE(NEW.message, '[Изображение]');
  
  -- Ищем существующую беседу
  SELECT id INTO v_conversation_id
  FROM user_conversations
  WHERE user1_id = v_user1_id AND user2_id = v_user2_id;
  
  -- Если беседа существует, обновляем её
  IF v_conversation_id IS NOT NULL THEN
    UPDATE user_conversations
    SET 
      last_message_id = NEW.id,
      last_message_text = LEFT(v_message_text, 100), -- Первые 100 символов
      last_message_at = NEW.created_at,
      updated_at = NOW(),
      -- Увеличиваем счетчик непрочитанных для получателя
      unread_count_user2 = CASE 
        WHEN NEW.sender_id = v_user1_id THEN unread_count_user2 + 1
        ELSE unread_count_user2
      END,
      unread_count_user1 = CASE 
        WHEN NEW.sender_id = v_user2_id THEN unread_count_user1 + 1
        ELSE unread_count_user1
      END
    WHERE id = v_conversation_id;
  ELSE
    -- Создаем новую беседу
    INSERT INTO user_conversations (
      user1_id, 
      user2_id, 
      last_message_id, 
      last_message_text, 
      last_message_at,
      unread_count_user1,
      unread_count_user2
    )
    VALUES (
      v_user1_id,
      v_user2_id,
      NEW.id,
      LEFT(v_message_text, 100),
      NEW.created_at,
      CASE WHEN NEW.sender_id = v_user2_id THEN 1 ELSE 0 END,
      CASE WHEN NEW.sender_id = v_user1_id THEN 1 ELSE 0 END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON user_messages;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON user_messages
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION update_conversation_on_message();

-- Функция: Обновление счетчика непрочитанных при прочтении сообщения
CREATE OR REPLACE FUNCTION update_unread_count_on_read()
RETURNS TRIGGER AS $$
DECLARE
  v_user1_id UUID;
  v_user2_id UUID;
BEGIN
  -- Определяем порядок пользователей
  IF NEW.sender_id < NEW.recipient_id THEN
    v_user1_id := NEW.sender_id;
    v_user2_id := NEW.recipient_id;
  ELSE
    v_user1_id := NEW.recipient_id;
    v_user2_id := NEW.sender_id;
  END IF;
  
  -- Если сообщение прочитано, уменьшаем счетчик непрочитанных
  IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
    UPDATE user_conversations
    SET 
      unread_count_user1 = CASE 
        WHEN NEW.recipient_id = v_user1_id THEN GREATEST(unread_count_user1 - 1, 0)
        ELSE unread_count_user1
      END,
      unread_count_user2 = CASE 
        WHEN NEW.recipient_id = v_user2_id THEN GREATEST(unread_count_user2 - 1, 0)
        ELSE unread_count_user2
      END
    WHERE user1_id = v_user1_id AND user2_id = v_user2_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_unread_count_on_read ON user_messages;
CREATE TRIGGER trigger_update_unread_count_on_read
  AFTER UPDATE OF is_read ON user_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_unread_count_on_read();

-- ==========================================
-- 6. RLS ПОЛИТИКИ
-- ==========================================

-- Включаем RLS
ALTER TABLE user_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_message_privacy ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_conversations ENABLE ROW LEVEL SECURITY;

-- user_friends: пользователи могут видеть свои дружеские отношения
DROP POLICY IF EXISTS "Users can view own friendships" ON user_friends;
CREATE POLICY "Users can view own friendships"
  ON user_friends FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- user_friends: пользователи могут создавать запросы на дружбу
DROP POLICY IF EXISTS "Users can create friend requests" ON user_friends;
CREATE POLICY "Users can create friend requests"
  ON user_friends FOR INSERT
  WITH CHECK (auth.uid() = requested_by);

-- user_friends: пользователи могут обновлять свои запросы (принимать/отклонять)
DROP POLICY IF EXISTS "Users can update own friend requests" ON user_friends;
CREATE POLICY "Users can update own friend requests"
  ON user_friends FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- user_message_privacy: пользователи могут видеть и управлять только своими настройками
DROP POLICY IF EXISTS "Users can manage own privacy settings" ON user_message_privacy;
CREATE POLICY "Users can manage own privacy settings"
  ON user_message_privacy FOR ALL
  USING (auth.uid() = user_id);

-- user_messages: пользователи могут видеть только свои сообщения
DROP POLICY IF EXISTS "Users can view own messages" ON user_messages;
CREATE POLICY "Users can view own messages"
  ON user_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- user_messages: пользователи могут отправлять сообщения
DROP POLICY IF EXISTS "Users can send messages" ON user_messages;
CREATE POLICY "Users can send messages"
  ON user_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- user_messages: пользователи могут обновлять свои сообщения (прочитать, удалить)
DROP POLICY IF EXISTS "Users can update own messages" ON user_messages;
CREATE POLICY "Users can update own messages"
  ON user_messages FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- user_conversations: пользователи могут видеть только свои беседы
DROP POLICY IF EXISTS "Users can view own conversations" ON user_conversations;
CREATE POLICY "Users can view own conversations"
  ON user_conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- user_conversations: пользователи могут обновлять свои беседы
DROP POLICY IF EXISTS "Users can update own conversations" ON user_conversations;
CREATE POLICY "Users can update own conversations"
  ON user_conversations FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ==========================================
-- 7. НАЧАЛЬНЫЕ ДАННЫЕ
-- ==========================================

-- Создаем настройки приватности для всех существующих пользователей
INSERT INTO user_message_privacy (user_id, who_can_message)
SELECT id, 'everyone'
FROM profiles
WHERE id NOT IN (SELECT user_id FROM user_message_privacy)
ON CONFLICT (user_id) DO NOTHING;

