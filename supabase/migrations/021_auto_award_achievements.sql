-- Migration 021: Автоматическая выдача достижений за завершенные туры
-- Auto-award achievements for completed tours

-- ==========================================
-- ФУНКЦИЯ ДЛЯ АВТОМАТИЧЕСКОЙ ВЫДАЧИ ДОСТИЖЕНИЙ
-- ==========================================

-- Функция для выдачи достижений за завершенные туры
CREATE OR REPLACE FUNCTION award_tour_achievements(p_user_id UUID, p_tour_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tour RECORD;
  v_achievements_count INTEGER := 0;
  v_tours_count INTEGER;
  v_category_badge_type TEXT;
  v_badge_name TEXT;
  v_badge_description TEXT;
BEGIN
  -- Получаем информацию о туре
  SELECT category, title INTO v_tour
  FROM tours
  WHERE id = p_tour_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Определяем бейдж по категории тура
  CASE v_tour.category
    WHEN 'history' THEN
      v_category_badge_type := 'history';
      v_badge_name := 'Историк';
      v_badge_description := 'Посетил исторический тур';
    WHEN 'nature' THEN
      v_category_badge_type := 'nature';
      v_badge_name := 'Натуралист';
      v_badge_description := 'Посетил тур по природе';
    WHEN 'culture' THEN
      v_category_badge_type := 'culture';
      v_badge_name := 'Культуролог';
      v_badge_description := 'Посетил культурный тур';
    WHEN 'architecture' THEN
      v_category_badge_type := 'architecture';
      v_badge_name := 'Архитектор';
      v_badge_description := 'Посетил архитектурный тур';
    WHEN 'food' THEN
      v_category_badge_type := 'gastronomy';
      v_badge_name := 'Гастроном';
      v_badge_description := 'Посетил гастрономический тур';
    WHEN 'adventure' THEN
      v_category_badge_type := 'adventure';
      v_badge_name := 'Авантюрист';
      v_badge_description := 'Посетил приключенческий тур';
    ELSE
      v_category_badge_type := NULL;
  END CASE;
  
  -- Выдаем бейдж по категории (если еще не выдан)
  IF v_category_badge_type IS NOT NULL THEN
    INSERT INTO achievements (user_id, badge_type, badge_name, badge_description, tour_id)
    VALUES (p_user_id, v_category_badge_type, v_badge_name, v_badge_description, p_tour_id)
    ON CONFLICT (user_id, badge_type) DO NOTHING;
    
    GET DIAGNOSTICS v_achievements_count = ROW_COUNT;
    IF v_achievements_count > 0 THEN
      v_achievements_count := 1;
    ELSE
      v_achievements_count := 0;
    END IF;
  END IF;
  
  -- Подсчитываем количество завершенных туров пользователя
  SELECT COUNT(*) INTO v_tours_count
  FROM bookings
  WHERE user_id = p_user_id
    AND status = 'completed';
  
  -- Выдаем бейдж "Первый тур"
  IF v_tours_count = 1 THEN
    INSERT INTO achievements (user_id, badge_type, badge_name, badge_description, tour_id)
    VALUES (p_user_id, 'first_tour', 'Первый шаг', 'Завершил свой первый тур', p_tour_id)
    ON CONFLICT DO NOTHING;
    
    IF ROW_COUNT > 0 THEN
      v_achievements_count := v_achievements_count + 1;
    END IF;
  END IF;
  
  -- Выдаем бейджи за количество туров (10, 25, 50, 100)
  IF v_tours_count = 10 THEN
    INSERT INTO achievements (user_id, badge_type, badge_name, badge_description, tour_id, verification_data)
    VALUES (p_user_id, '10_tours', 'Исследователь', 'Завершил 10 туров', p_tour_id, jsonb_build_object('tours_count', 10))
    ON CONFLICT DO NOTHING;
    
    IF ROW_COUNT > 0 THEN
      v_achievements_count := v_achievements_count + 1;
    END IF;
  ELSIF v_tours_count = 25 THEN
    INSERT INTO achievements (user_id, badge_type, badge_name, badge_description, tour_id, verification_data)
    VALUES (p_user_id, '25_tours', 'Путешественник', 'Завершил 25 туров', p_tour_id, jsonb_build_object('tours_count', 25))
    ON CONFLICT DO NOTHING;
    
    IF ROW_COUNT > 0 THEN
      v_achievements_count := v_achievements_count + 1;
    END IF;
  ELSIF v_tours_count = 50 THEN
    INSERT INTO achievements (user_id, badge_type, badge_name, badge_description, tour_id, verification_data)
    VALUES (p_user_id, '50_tours', 'Мастер путешествий', 'Завершил 50 туров', p_tour_id, jsonb_build_object('tours_count', 50))
    ON CONFLICT DO NOTHING;
    
    IF ROW_COUNT > 0 THEN
      v_achievements_count := v_achievements_count + 1;
    END IF;
  ELSIF v_tours_count = 100 THEN
    INSERT INTO achievements (user_id, badge_type, badge_name, badge_description, tour_id, verification_data)
    VALUES (p_user_id, '100_tours', 'Легенда путешествий', 'Завершил 100 туров', p_tour_id, jsonb_build_object('tours_count', 100))
    ON CONFLICT DO NOTHING;
    
    IF ROW_COUNT > 0 THEN
      v_achievements_count := v_achievements_count + 1;
    END IF;
  END IF;
  
  RETURN v_achievements_count;
END;
$$;

COMMENT ON FUNCTION award_tour_achievements(UUID, UUID) IS 'Автоматически выдает достижения за завершенный тур';

-- ==========================================
-- ТРИГГЕР ДЛЯ АВТОМАТИЧЕСКОЙ ВЫДАЧИ ДОСТИЖЕНИЙ
-- ==========================================

-- Функция-триггер для автоматической выдачи достижений при завершении тура
CREATE OR REPLACE FUNCTION trigger_award_tour_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Если статус бронирования изменился на 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Выдаем достижения
    PERFORM award_tour_achievements(NEW.user_id, NEW.tour_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Создаем триггер
DROP TRIGGER IF EXISTS trigger_award_achievements_on_completion ON bookings;
CREATE TRIGGER trigger_award_achievements_on_completion
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION trigger_award_tour_achievements();

-- ==========================================
-- ФУНКЦИЯ ДЛЯ РЕТРОАКТИВНОЙ ВЫДАЧИ ДОСТИЖЕНИЙ
-- ==========================================

-- Функция для выдачи достижений всем пользователям, которые завершили туры, но не получили достижения
CREATE OR REPLACE FUNCTION retroactively_award_achievements()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_awarded_count INTEGER := 0;
BEGIN
  -- Находим все завершенные бронирования без достижений
  FOR v_booking IN
    SELECT DISTINCT b.user_id, b.tour_id
    FROM bookings b
    WHERE b.status = 'completed'
      AND NOT EXISTS (
        SELECT 1 FROM achievements a
        WHERE a.user_id = b.user_id
          AND a.tour_id = b.tour_id
          AND a.badge_type IN ('first_tour', 'history', 'nature', 'culture', 'architecture', 'gastronomy', 'adventure')
      )
  LOOP
    PERFORM award_tour_achievements(v_booking.user_id, v_booking.tour_id);
    v_awarded_count := v_awarded_count + 1;
  END LOOP;
  
  RETURN v_awarded_count;
END;
$$;

COMMENT ON FUNCTION retroactively_award_achievements() IS 'Ретроактивно выдает достижения пользователям, которые завершили туры, но не получили достижения';

