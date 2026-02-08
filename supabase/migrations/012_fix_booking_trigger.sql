-- Migration 012: Fix booking trigger to use current_participants instead of current_bookings
-- Исправление триггера бронирований для использования current_participants

-- Удаляем старые триггеры если существуют (может быть конфликт между старым и новым)
DROP TRIGGER IF EXISTS booking_status_change ON bookings;
DROP TRIGGER IF EXISTS bookings_participants_trigger ON bookings;

-- Обновляем функцию update_tour_bookings для использования current_participants
CREATE OR REPLACE FUNCTION update_tour_bookings()
RETURNS TRIGGER AS $$
BEGIN
  -- При создании или изменении статуса на confirmed
  IF (TG_OP = 'INSERT' AND NEW.status = 'confirmed') THEN
    UPDATE tours
    SET current_participants = current_participants + NEW.num_people
    WHERE id = NEW.tour_id;
  
  -- При изменении статуса с pending на confirmed
  ELSIF (TG_OP = 'UPDATE' AND OLD.status != 'confirmed' AND NEW.status = 'confirmed') THEN
    UPDATE tours
    SET current_participants = current_participants + NEW.num_people
    WHERE id = NEW.tour_id;
  
  -- При отмене бронирования
  ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status = 'cancelled') THEN
    UPDATE tours
    SET current_participants = GREATEST(0, current_participants - OLD.num_people)
    WHERE id = OLD.tour_id;
  
  -- При удалении подтвержденного бронирования
  ELSIF (TG_OP = 'DELETE' AND OLD.status = 'confirmed') THEN
    UPDATE tours
    SET current_participants = GREATEST(0, current_participants - OLD.num_people)
    WHERE id = OLD.tour_id;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Обновляем функцию update_tour_participants для использования num_people вместо COUNT
CREATE OR REPLACE FUNCTION update_tour_participants()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'confirmed') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'confirmed' AND OLD.status != 'confirmed') THEN
    UPDATE tours 
    SET current_participants = current_participants + NEW.num_people
    WHERE id = NEW.tour_id;
  ELSIF (TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status = 'confirmed') THEN
    UPDATE tours 
    SET current_participants = GREATEST(0, current_participants - OLD.num_people)
    WHERE id = OLD.tour_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
    UPDATE tours 
    SET current_participants = GREATEST(0, current_participants - OLD.num_people)
    WHERE id = OLD.tour_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Создаем один триггер (используем bookings_participants_trigger как основной)
CREATE TRIGGER bookings_participants_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_tour_participants();

-- Комментарии
COMMENT ON FUNCTION update_tour_bookings() IS 'Обновляет количество участников тура при изменении статуса бронирования (legacy)';
COMMENT ON FUNCTION update_tour_participants() IS 'Обновляет количество участников тура при изменении статуса бронирования';

