-- Migration 038: Автоматическое изменение статуса завершенных туров
-- Date: 2025-01-XX
-- Description: Автоматически меняет статус туров с 'active' на 'completed' когда тур заканчивается

-- ==========================================
-- 1. ФУНКЦИЯ ДЛЯ АВТОМАТИЧЕСКОГО ЗАВЕРШЕНИЯ ТУРОВ
-- ==========================================

-- Функция: Автоматически меняет статус завершенных туров
CREATE OR REPLACE FUNCTION auto_complete_finished_tours()
RETURNS INTEGER AS $$
DECLARE
  completed_count INTEGER;
BEGIN
  -- Меняем статус туров, которые уже закончились (end_date < NOW())
  -- и имеют статус 'active'
  -- Используем явное приведение типа для ENUM
  UPDATE tours
  SET status = 'completed'::tour_status
  WHERE status::text = 'active'
    AND end_date IS NOT NULL
    AND end_date < NOW();
  
  GET DIAGNOSTICS completed_count = ROW_COUNT;
  
  -- Логируем результат
  IF completed_count > 0 THEN
    RAISE NOTICE 'Завершено % туров', completed_count;
  END IF;
  
  RETURN completed_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 2. ТРИГГЕР ДЛЯ АВТОМАТИЧЕСКОГО ЗАВЕРШЕНИЯ ПРИ ОБНОВЛЕНИИ
-- ==========================================

-- Функция триггера: Автоматически меняет статус при обновлении тура
CREATE OR REPLACE FUNCTION trigger_auto_complete_tour()
RETURNS TRIGGER AS $$
BEGIN
  -- Если тур активен и дата окончания прошла, меняем статус на 'completed'
  IF NEW.status::text = 'active' 
     AND NEW.end_date IS NOT NULL 
     AND NEW.end_date < NOW() THEN
    NEW.status := 'completed'::tour_status;
    RAISE NOTICE 'Тур % автоматически завершен (end_date < NOW())', NEW.id;
  END IF;
  
  -- Если тур был завершен, но дата окончания перенесена в будущее, возвращаем статус 'active'
  IF NEW.status::text = 'completed' 
     AND NEW.end_date IS NOT NULL 
     AND NEW.end_date >= NOW() 
     AND OLD.end_date IS NOT NULL 
     AND OLD.end_date < NOW() THEN
    NEW.status := 'active'::tour_status;
    RAISE NOTICE 'Тур % возвращен в активные (end_date перенесена в будущее)', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер: Автоматическое завершение при обновлении тура
DROP TRIGGER IF EXISTS trigger_auto_complete_tour ON tours;
CREATE TRIGGER trigger_auto_complete_tour
  BEFORE UPDATE ON tours
  FOR EACH ROW
  WHEN (
    -- Триггер срабатывает если:
    -- 1. Статус активен и дата окончания прошла
    -- 2. Или дата окончания изменилась
    (NEW.status = 'active' AND NEW.end_date IS NOT NULL AND NEW.end_date < NOW()) OR
    (OLD.end_date IS DISTINCT FROM NEW.end_date)
  )
  EXECUTE FUNCTION trigger_auto_complete_tour();

-- ==========================================
-- 3. ТРИГГЕР ДЛЯ АВТОМАТИЧЕСКОГО ЗАВЕРШЕНИЯ ПРИ ВСТАВКЕ
-- ==========================================

-- Функция триггера: Проверяет статус при создании тура
CREATE OR REPLACE FUNCTION trigger_check_tour_status_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Если создается тур с датой окончания в прошлом, сразу ставим статус 'completed'
  IF NEW.status::text = 'active' 
     AND NEW.end_date IS NOT NULL 
     AND NEW.end_date < NOW() THEN
    NEW.status := 'completed'::tour_status;
    RAISE NOTICE 'Новый тур % создан как завершенный (end_date < NOW())', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер: Проверка статуса при создании тура
DROP TRIGGER IF EXISTS trigger_check_tour_status_on_insert ON tours;
CREATE TRIGGER trigger_check_tour_status_on_insert
  BEFORE INSERT ON tours
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_tour_status_on_insert();

-- ==========================================
-- 4. ОБНОВЛЕНИЕ СУЩЕСТВУЮЩИХ ЗАВЕРШЕННЫХ ТУРОВ
-- ==========================================

-- Обновляем все существующие туры, которые уже закончились
-- Прямое обновление статуса для всех завершенных туров
-- Используем простое сравнение без приведения типов
DO $$
DECLARE
  updated_count INTEGER;
  tour_record RECORD;
BEGIN
  -- Сначала проверяем, какие туры нужно обновить
  FOR tour_record IN 
    SELECT id, title, end_date, status
    FROM tours
    WHERE status::text = 'active'
      AND end_date IS NOT NULL
  LOOP
    -- Проверяем, закончился ли тур (сравниваем с текущим временем)
    IF tour_record.end_date < NOW() THEN
      -- Обновляем статус (используем явное приведение типа для ENUM)
      UPDATE tours
      SET status = 'completed'::tour_status,
          updated_at = COALESCE(updated_at, NOW())
      WHERE id = tour_record.id
        AND status::text = 'active';
      
      updated_count := COALESCE(updated_count, 0) + 1;
      RAISE NOTICE 'Тур % (%) завершен. end_date: %, NOW: %', 
        tour_record.id, 
        tour_record.title, 
        tour_record.end_date, 
        NOW();
    END IF;
  END LOOP;
  
  IF updated_count IS NULL THEN
    updated_count := 0;
  END IF;
  
  RAISE NOTICE 'Всего обновлено туров: %', updated_count;
END $$;

-- Также вызываем функцию для проверки (на случай если что-то пропустили)
DO $$
DECLARE
  result_count INTEGER;
BEGIN
  SELECT auto_complete_finished_tours() INTO result_count;
  RAISE NOTICE 'Функция завершила туров: %', result_count;
END $$;

-- ==========================================
-- 5. КОММЕНТАРИИ
-- ==========================================

COMMENT ON FUNCTION auto_complete_finished_tours() IS 
'Автоматически меняет статус туров с active на completed для всех туров, которые уже закончились. Можно вызывать через cron для периодической проверки.';

COMMENT ON FUNCTION trigger_auto_complete_tour() IS 
'Автоматически меняет статус тура на completed при обновлении, если end_date < NOW(). Также возвращает статус в active, если дата перенесена в будущее.';

COMMENT ON FUNCTION trigger_check_tour_status_on_insert() IS 
'Проверяет статус тура при создании и автоматически ставит completed, если end_date уже в прошлом.';

-- ==========================================
-- 6. НАСТРОЙКА CRON (опционально)
-- ==========================================

-- Если установлено расширение pg_cron, можно настроить автоматический вызов:
-- SELECT cron.schedule(
--   'auto-complete-tours',           -- имя задачи
--   '0 * * * *',                      -- каждый час
--   $$SELECT auto_complete_finished_tours();$$
-- );

