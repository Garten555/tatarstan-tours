-- Migration 011: Add payment system for bookings
-- Добавляем систему оплаты для бронирований

-- Создаем enum для способов оплаты
CREATE TYPE payment_method AS ENUM ('card', 'cash', 'qr_code');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- Добавляем поля оплаты в таблицу bookings
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS payment_method payment_method DEFAULT 'card',
  ADD COLUMN IF NOT EXISTS payment_status payment_status DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_data JSONB; -- Дополнительные данные об оплате (номер транзакции, QR-код и т.д.)

-- Создаем таблицу для сохраненных карт пользователей
-- ВАЖНО: Храним только последние 4 цифры и тип карты, НЕ полные данные!
CREATE TABLE IF NOT EXISTS user_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_four_digits TEXT NOT NULL CHECK (LENGTH(last_four_digits) = 4), -- Последние 4 цифры карты
  card_type TEXT NOT NULL, -- visa, mastercard, mir, etc.
  cardholder_name TEXT, -- Имя держателя карты
  is_default BOOLEAN DEFAULT FALSE, -- Карта по умолчанию
  expires_at TIMESTAMP WITH TIME ZONE, -- Дата истечения (опционально, для напоминаний)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Один пользователь может иметь только одну карту по умолчанию
-- Используем частичный уникальный индекс вместо constraint (см. ниже)

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_cards_user_id ON user_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_default ON user_cards(user_id, is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_bookings_payment_method ON bookings(payment_method);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);

-- Уникальный индекс для карты по умолчанию (один пользователь - одна карта по умолчанию)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_cards_unique_default 
  ON user_cards(user_id) 
  WHERE is_default = TRUE;

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_user_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления updated_at в user_cards
DROP TRIGGER IF EXISTS trigger_update_user_cards_updated_at ON user_cards;
CREATE TRIGGER trigger_update_user_cards_updated_at
  BEFORE UPDATE ON user_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_user_cards_updated_at();

-- Функция для установки карты по умолчанию
-- Если устанавливаем карту как default, снимаем default с других карт пользователя
CREATE OR REPLACE FUNCTION set_default_card()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE user_cards
    SET is_default = FALSE
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматической установки карты по умолчанию
DROP TRIGGER IF EXISTS trigger_set_default_card ON user_cards;
CREATE TRIGGER trigger_set_default_card
  BEFORE INSERT OR UPDATE ON user_cards
  FOR EACH ROW
  EXECUTE FUNCTION set_default_card();

-- RLS для user_cards
ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои карты
CREATE POLICY "Users can view own cards"
  ON user_cards FOR SELECT
  USING (auth.uid() = user_id);

-- Пользователи могут создавать свои карты
CREATE POLICY "Users can insert own cards"
  ON user_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Пользователи могут обновлять свои карты
CREATE POLICY "Users can update own cards"
  ON user_cards FOR UPDATE
  USING (auth.uid() = user_id);

-- Пользователи могут удалять свои карты
CREATE POLICY "Users can delete own cards"
  ON user_cards FOR DELETE
  USING (auth.uid() = user_id);

-- Комментарии
COMMENT ON TABLE user_cards IS 'Сохраненные карты пользователей (только последние 4 цифры и тип)';
COMMENT ON COLUMN user_cards.last_four_digits IS 'Последние 4 цифры карты (безопасное хранение)';
COMMENT ON COLUMN user_cards.card_type IS 'Тип карты: visa, mastercard, mir';
COMMENT ON COLUMN user_cards.cardholder_name IS 'Имя держателя карты';
COMMENT ON COLUMN bookings.payment_method IS 'Способ оплаты: карта, наличные, QR-код';
COMMENT ON COLUMN bookings.payment_status IS 'Статус оплаты';
COMMENT ON COLUMN bookings.payment_data IS 'Дополнительные данные об оплате (JSON)';

