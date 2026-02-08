-- Создание таблицы для апелляций на бан
CREATE TABLE IF NOT EXISTS ban_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ban_reason TEXT,
  appeal_text TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'reviewing')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  review_comment TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_ban_appeals_user_id ON ban_appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_ban_appeals_status ON ban_appeals(status);
CREATE INDEX IF NOT EXISTS idx_ban_appeals_created_at ON ban_appeals(created_at DESC);

-- RLS политики
ALTER TABLE ban_appeals ENABLE ROW LEVEL SECURITY;

-- Пользователь может создавать апелляции только для себя
CREATE POLICY "Users can create appeals for themselves"
  ON ban_appeals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Пользователь может читать только свои апелляции
CREATE POLICY "Users can read their own appeals"
  ON ban_appeals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Админы могут читать все апелляции
CREATE POLICY "Admins can read all appeals"
  ON ban_appeals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'support_admin')
    )
  );

-- Админы могут обновлять апелляции
CREATE POLICY "Admins can update appeals"
  ON ban_appeals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'support_admin')
    )
  );

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_ban_appeals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_ban_appeals_updated_at
  BEFORE UPDATE ON ban_appeals
  FOR EACH ROW
  EXECUTE FUNCTION update_ban_appeals_updated_at();

