-- Migration 014: Автоматический сброс участников после окончания тура
-- Сброс current_participants для завершенных туров и функция для периодического обновления

-- ==========================================
-- ФУНКЦИИ
-- ==========================================

-- Функция: Сброс участников для завершенных туров
-- Вызывается автоматически при обновлении тура или вручную через cron
CREATE OR REPLACE FUNCTION reset_completed_tour_participants()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  -- Сбрасываем current_participants для туров, которые уже закончились
  -- (end_date < NOW() и current_participants > 0)
  UPDATE tours
  SET current_participants = 0
  WHERE end_date IS NOT NULL
    AND end_date < NOW()
    AND current_participants > 0
    AND status = 'active';
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  
  -- Логируем результат (можно убрать в продакшене)
  IF reset_count > 0 THEN
    RAISE NOTICE 'Сброшено участников для % завершенных туров', reset_count;
  END IF;
  
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

-- Функция: Проверка и сброс участников при обновлении дат тура
-- Если админ изменил даты тура (создал новый экземпляр), сбрасываем участников
CREATE OR REPLACE FUNCTION check_and_reset_tour_on_date_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Если end_date изменилась и новая дата в будущем, сбрасываем участников
  -- Это означает, что админ создал новый экземпляр тура
  IF (NEW.end_date IS NOT NULL AND OLD.end_date IS NOT NULL) THEN
    -- Если новая end_date больше старой (перенесли в будущее) - сбрасываем
    IF NEW.end_date > OLD.end_date AND NEW.end_date > NOW() THEN
      NEW.current_participants = 0;
      RAISE NOTICE 'Тур перенесен в будущее, сброшены участники';
    END IF;
  END IF;
  
  -- Если end_date была NULL, а стала установлена в будущем - сбрасываем
  IF (OLD.end_date IS NULL AND NEW.end_date IS NOT NULL AND NEW.end_date > NOW()) THEN
    NEW.current_participants = 0;
    RAISE NOTICE 'Установлена end_date в будущем, сброшены участники';
  END IF;
  
  -- Если тур уже закончился (end_date < NOW()), сбрасываем участников
  IF (NEW.end_date IS NOT NULL AND NEW.end_date < NOW() AND NEW.current_participants > 0) THEN
    NEW.current_participants = 0;
    RAISE NOTICE 'Тур завершен, сброшены участники';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер: Автоматический сброс при обновлении тура
DROP TRIGGER IF EXISTS trigger_reset_participants_on_date_change ON tours;
CREATE TRIGGER trigger_reset_participants_on_date_change
  BEFORE UPDATE ON tours
  FOR EACH ROW
  WHEN (
    -- Триггер срабатывает только если изменились даты или тур завершен
    (OLD.end_date IS DISTINCT FROM NEW.end_date) OR
    (NEW.end_date IS NOT NULL AND NEW.end_date < NOW() AND NEW.current_participants > 0)
  )
  EXECUTE FUNCTION check_and_reset_tour_on_date_change();

-- ==========================================
-- КОММЕНТАРИИ
-- ==========================================

COMMENT ON FUNCTION reset_completed_tour_participants() IS 
'Сбрасывает current_participants для всех завершенных туров. Можно вызывать через cron для периодической очистки.';

COMMENT ON FUNCTION check_and_reset_tour_on_date_change() IS 
'Автоматически сбрасывает участников при изменении дат тура админом (создание нового экземпляра) или при завершении тура.';

-- ==========================================
-- РУЧНОЙ ВЫЗОВ (для тестирования)
-- ==========================================

-- Вызвать функцию для сброса всех завершенных туров:
-- SELECT reset_completed_tour_participants();

-- ==========================================
-- НАСТРОЙКА CRON (опционально, через pg_cron расширение)
-- ==========================================

-- Если установлено расширение pg_cron, можно настроить автоматический вызов:
-- SELECT cron.schedule(
--   'reset-completed-tours',           -- имя задачи
--   '0 2 * * *',                       -- каждый день в 2:00 ночи
--   $$SELECT reset_completed_tour_participants();$$
-- );





















