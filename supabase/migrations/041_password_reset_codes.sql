-- Migration 041: Password reset codes system
-- Система кодов восстановления пароля

CREATE TABLE IF NOT EXISTS password_reset_codes (
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
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email ON password_reset_codes(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_code ON password_reset_codes(code);
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_expires_at ON password_reset_codes(expires_at);

-- Функция для автоматической очистки истекших и использованных кодов
CREATE OR REPLACE FUNCTION cleanup_expired_reset_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_codes 
  WHERE expires_at < NOW() OR used = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического удаления кода после использования
CREATE OR REPLACE FUNCTION delete_used_reset_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Удаляем код сразу после того, как он помечен как использованный
  IF NEW.used = TRUE AND OLD.used = FALSE THEN
    DELETE FROM password_reset_codes WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер
DROP TRIGGER IF EXISTS trigger_delete_used_reset_code ON password_reset_codes;
CREATE TRIGGER trigger_delete_used_reset_code
  AFTER UPDATE ON password_reset_codes
  FOR EACH ROW
  EXECUTE FUNCTION delete_used_reset_code();

-- Функция для автоматической очистки истекших кодов при создании нового
CREATE OR REPLACE FUNCTION cleanup_old_codes_for_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Удаляем все старые коды для этого email (истекшие и использованные)
  DELETE FROM password_reset_codes 
  WHERE email = NEW.email 
    AND (expires_at < NOW() OR used = TRUE OR id != NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматической очистки старых кодов при создании нового
DROP TRIGGER IF EXISTS trigger_cleanup_old_codes ON password_reset_codes;
CREATE TRIGGER trigger_cleanup_old_codes
  BEFORE INSERT ON password_reset_codes
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_codes_for_email();

-- Функция для автоматической очистки истекших кодов (вызывается из API)
CREATE OR REPLACE FUNCTION auto_cleanup_expired_codes()
RETURNS void AS $$
BEGIN
  -- Удаляем все истекшие и использованные коды
  DELETE FROM password_reset_codes 
  WHERE expires_at < NOW() OR used = TRUE;
END;
$$ LANGUAGE plpgsql;

