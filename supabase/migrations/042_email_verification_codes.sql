-- Migration 042: Email verification codes system
-- Система кодов подтверждения email при регистрации

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Уникальность: один активный код на email
  UNIQUE(email, code)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_email_verification_codes_email ON email_verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_codes_code ON email_verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_email_verification_codes_expires_at ON email_verification_codes(expires_at);

-- Функция для автоматической очистки истекших и использованных кодов
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM email_verification_codes 
  WHERE expires_at < NOW() OR used = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического удаления кода после использования
CREATE OR REPLACE FUNCTION delete_used_verification_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Удаляем код сразу после того, как он помечен как использованный
  IF NEW.used = TRUE AND OLD.used = FALSE THEN
    DELETE FROM email_verification_codes WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер
DROP TRIGGER IF EXISTS trigger_delete_used_verification_code ON email_verification_codes;
CREATE TRIGGER trigger_delete_used_verification_code
  AFTER UPDATE ON email_verification_codes
  FOR EACH ROW
  EXECUTE FUNCTION delete_used_verification_code();

-- Функция для автоматической очистки истекших кодов при создании нового
CREATE OR REPLACE FUNCTION cleanup_old_verification_codes_for_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Удаляем все старые коды для этого email (истекшие и использованные)
  DELETE FROM email_verification_codes 
  WHERE email = NEW.email 
    AND (expires_at < NOW() OR used = TRUE OR id != NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматической очистки старых кодов при создании нового
DROP TRIGGER IF EXISTS trigger_cleanup_old_verification_codes ON email_verification_codes;
CREATE TRIGGER trigger_cleanup_old_verification_codes
  BEFORE INSERT ON email_verification_codes
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_verification_codes_for_email();

-- Функция для автоматической очистки истекших кодов (вызывается из API)
CREATE OR REPLACE FUNCTION auto_cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  -- Удаляем все истекшие и использованные коды
  DELETE FROM email_verification_codes 
  WHERE expires_at < NOW() OR used = TRUE;
END;
$$ LANGUAGE plpgsql;



