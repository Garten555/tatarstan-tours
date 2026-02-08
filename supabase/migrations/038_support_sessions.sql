-- Создание таблицы для управления сессиями поддержки
CREATE TABLE IF NOT EXISTS support_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  closed_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_support_sessions_session_id ON support_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_support_sessions_user_id ON support_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_support_sessions_status ON support_sessions(status);
CREATE INDEX IF NOT EXISTS idx_support_sessions_closed_at ON support_sessions(closed_at);

-- RLS
ALTER TABLE support_sessions ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть свои сессии
CREATE POLICY "Users can view own support sessions"
  ON support_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Модераторы и супер-админы могут видеть все сессии
CREATE POLICY "Moderators can view all support sessions"
  ON support_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('support_admin', 'super_admin')
    )
  );

-- Модераторы и супер-админы могут обновлять сессии
CREATE POLICY "Moderators can update support sessions"
  ON support_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('support_admin', 'super_admin')
    )
  );

-- Автоматическое создание сессии при первом сообщении (через триггер)
CREATE OR REPLACE FUNCTION create_support_session_if_not_exists()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO support_sessions (session_id, user_id, status)
  VALUES (NEW.session_id, NEW.user_id, 'active')
  ON CONFLICT (session_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_support_session
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  WHEN (NEW.is_ai = false)
  EXECUTE FUNCTION create_support_session_if_not_exists();

-- Функция для автоматического архивирования старых закрытых сессий
CREATE OR REPLACE FUNCTION archive_old_closed_sessions()
RETURNS void AS $$
BEGIN
  UPDATE support_sessions
  SET status = 'archived', updated_at = NOW()
  WHERE status = 'closed'
    AND closed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Функция для автоматического удаления старых архивных сессий
CREATE OR REPLACE FUNCTION delete_old_archived_sessions()
RETURNS void AS $$
BEGIN
  -- Удаляем сообщения старых архивных сессий (старше 30 дней)
  DELETE FROM chat_messages
  WHERE session_id IN (
    SELECT session_id FROM support_sessions
    WHERE status = 'archived'
      AND closed_at < NOW() - INTERVAL '30 days'
  );
  
  -- Удаляем сами сессии
  DELETE FROM support_sessions
  WHERE status = 'archived'
    AND closed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

