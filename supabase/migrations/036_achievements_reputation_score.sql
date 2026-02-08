-- Migration 036: Автоматическое начисление опыта за достижения
-- Date: 2025-01-XX
-- Description: Триггер для автоматического начисления reputation_score при получении достижений

-- ==========================================
-- 1. ФУНКЦИЯ НАЧИСЛЕНИЯ ОПЫТА ЗА ДОСТИЖЕНИЯ
-- ==========================================

-- Функция для определения количества опыта за достижение
CREATE OR REPLACE FUNCTION get_achievement_experience(badge_type TEXT)
RETURNS INTEGER AS $$
BEGIN
  -- Разные типы достижений дают разное количество опыта
  CASE badge_type
    -- Первый тур - 50 опыта
    WHEN 'first_tour' THEN RETURN 50;
    
    -- Категорийные достижения (history, nature, culture, etc.) - 30 опыта
    WHEN 'history' THEN RETURN 30;
    WHEN 'nature' THEN RETURN 30;
    WHEN 'culture' THEN RETURN 30;
    WHEN 'architecture' THEN RETURN 30;
    WHEN 'gastronomy' THEN RETURN 30;
    WHEN 'adventure' THEN RETURN 30;
    
    -- Мильные камни по количеству туров
    WHEN '10_tours' THEN RETURN 100;
    WHEN '25_tours' THEN RETURN 250;
    WHEN '50_tours' THEN RETURN 500;
    WHEN '100_tours' THEN RETURN 1000;
    
    -- Офлайн достижения от гидов - 20 опыта
    WHEN 'offline_participation' THEN RETURN 20;
    WHEN 'helpful' THEN RETURN 20;
    WHEN 'photographer' THEN RETURN 20;
    WHEN 'social' THEN RETURN 20;
    WHEN 'punctual' THEN RETURN 20;
    WHEN 'enthusiast' THEN RETURN 20;
    WHEN 'explorer' THEN RETURN 20;
    WHEN 'team_player' THEN RETURN 20;
    WHEN 'curious' THEN RETURN 20;
    WHEN 'respectful' THEN RETURN 20;
    WHEN 'energetic' THEN RETURN 20;
    WHEN 'memory_keeper' THEN RETURN 20;
    
    -- По умолчанию - 10 опыта
    ELSE RETURN 10;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 2. ТРИГГЕР ДЛЯ НАЧИСЛЕНИЯ ОПЫТА
-- ==========================================

-- Функция триггера для начисления опыта при создании достижения
CREATE OR REPLACE FUNCTION award_achievement_experience()
RETURNS TRIGGER AS $$
DECLARE
  v_experience INTEGER;
BEGIN
  -- Получаем количество опыта за это достижение
  v_experience := get_achievement_experience(NEW.badge_type);
  
  -- Начисляем опыт пользователю
  UPDATE profiles
  SET reputation_score = reputation_score + v_experience
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер
DROP TRIGGER IF EXISTS trigger_award_achievement_experience ON achievements;
CREATE TRIGGER trigger_award_achievement_experience
  AFTER INSERT ON achievements
  FOR EACH ROW
  EXECUTE FUNCTION award_achievement_experience();

-- ==========================================
-- 3. ОБНОВЛЕНИЕ СУЩЕСТВУЮЩИХ ДОСТИЖЕНИЙ
-- ==========================================

-- Функция для пересчета опыта для всех существующих достижений
CREATE OR REPLACE FUNCTION recalculate_all_achievements_experience()
RETURNS INTEGER AS $$
DECLARE
  v_total_experience INTEGER := 0;
  v_achievement RECORD;
  v_experience INTEGER;
BEGIN
  -- Для каждого пользователя пересчитываем опыт на основе всех его достижений
  FOR v_achievement IN 
    SELECT DISTINCT user_id FROM achievements
  LOOP
    -- Сбрасываем счетчик опыта для пользователя
    UPDATE profiles
    SET reputation_score = 0
    WHERE id = v_achievement.user_id;
    
    -- Пересчитываем опыт на основе всех достижений пользователя
    SELECT COALESCE(SUM(get_achievement_experience(badge_type)), 0)
    INTO v_experience
    FROM achievements
    WHERE user_id = v_achievement.user_id;
    
    -- Обновляем счетчик опыта
    UPDATE profiles
    SET reputation_score = v_experience
    WHERE id = v_achievement.user_id;
    
    v_total_experience := v_total_experience + v_experience;
  END LOOP;
  
  RETURN v_total_experience;
END;
$$ LANGUAGE plpgsql;

-- Комментарии
COMMENT ON FUNCTION get_achievement_experience IS 'Возвращает количество опыта за достижение в зависимости от его типа';
COMMENT ON FUNCTION award_achievement_experience IS 'Триггерная функция для автоматического начисления опыта при получении достижения';
COMMENT ON FUNCTION recalculate_all_achievements_experience IS 'Пересчитывает опыт для всех пользователей на основе их достижений';










