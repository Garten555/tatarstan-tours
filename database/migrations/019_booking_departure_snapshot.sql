-- Сохранение старых броней при смене дат тура/слота:
-- фиксируем дату выезда на брони, новые места считаются только для актуального расписания слота.

BEGIN;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS departure_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS departure_end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS schedule_superseded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.bookings.departure_start_at IS
  'Дата/время выезда на момент брони (не меняется при переносе слота в админке)';
COMMENT ON COLUMN public.bookings.departure_end_at IS
  'Конец выезда на момент брони';
COMMENT ON COLUMN public.bookings.schedule_superseded_at IS
  'Когда админ перенёс даты — бронь остаётся в истории, но не занимает места в новом выезде';

CREATE INDEX IF NOT EXISTS idx_bookings_departure_start
  ON public.bookings (departure_start_at)
  WHERE departure_start_at IS NOT NULL;

-- Бэкфилл: уже существующие брони → даты из слота или тура
UPDATE public.bookings b
SET
  departure_start_at = COALESCE(b.departure_start_at, ts.start_at),
  departure_end_at = COALESCE(b.departure_end_at, ts.end_at)
FROM public.tour_sessions ts
WHERE b.session_id = ts.id
  AND b.departure_start_at IS NULL;

UPDATE public.bookings b
SET
  departure_start_at = COALESCE(b.departure_start_at, t.start_date),
  departure_end_at = COALESCE(b.departure_end_at, t.end_date)
FROM public.tours t
WHERE b.tour_id = t.id
  AND b.session_id IS NULL
  AND b.departure_start_at IS NULL
  AND t.start_date IS NOT NULL;

-- Перед сменой дат слота — зафиксировать старое расписание на бронях
CREATE OR REPLACE FUNCTION public.snapshot_bookings_on_session_schedule_change()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.start_at IS DISTINCT FROM OLD.start_at
       OR NEW.end_at IS DISTINCT FROM OLD.end_at
    THEN
      UPDATE public.bookings
      SET
        departure_start_at = COALESCE(departure_start_at, OLD.start_at),
        departure_end_at = COALESCE(departure_end_at, OLD.end_at),
        schedule_superseded_at = COALESCE(schedule_superseded_at, NOW())
      WHERE session_id = OLD.id
        AND status IN ('pending', 'confirmed');
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_snapshot_bookings_on_session_schedule ON public.tour_sessions;

CREATE TRIGGER trg_snapshot_bookings_on_session_schedule
  BEFORE UPDATE OF start_at, end_at ON public.tour_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_bookings_on_session_schedule_change();

-- Туры без слотов (session_id IS NULL)
CREATE OR REPLACE FUNCTION public.snapshot_bookings_on_tour_dates_change()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.start_date IS DISTINCT FROM OLD.start_date
       OR NEW.end_date IS DISTINCT FROM OLD.end_date
    THEN
      UPDATE public.bookings
      SET
        departure_start_at = COALESCE(departure_start_at, OLD.start_date),
        departure_end_at = COALESCE(departure_end_at, OLD.end_date),
        schedule_superseded_at = COALESCE(schedule_superseded_at, NOW())
      WHERE tour_id = OLD.id
        AND session_id IS NULL
        AND status IN ('pending', 'confirmed');
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_snapshot_bookings_on_tour_dates ON public.tours;

CREATE TRIGGER trg_snapshot_bookings_on_tour_dates
  BEFORE UPDATE OF start_date, end_date ON public.tours
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_bookings_on_tour_dates_change();

-- Пересчёт занятых мест в слоте (только брони на текущее расписание)
CREATE OR REPLACE FUNCTION public.recalc_tour_session_participants(p_session_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_start TIMESTAMPTZ;
  v_total INTEGER;
BEGIN
  SELECT start_at INTO v_start
  FROM public.tour_sessions
  WHERE id = p_session_id;

  IF v_start IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(b.num_people), 0)::INTEGER INTO v_total
  FROM public.bookings b
  WHERE b.session_id = p_session_id
    AND b.status IN ('pending', 'confirmed')
    AND (
      b.departure_start_at IS NULL
      OR b.departure_start_at = v_start
    );

  UPDATE public.tour_sessions
  SET current_participants = v_total
  WHERE id = p_session_id;

  RETURN v_total;
END;
$fn$;

-- После смены дат слота — обновить счётчик мест
CREATE OR REPLACE FUNCTION public.recalc_session_participants_after_schedule_change()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.start_at IS DISTINCT FROM OLD.start_at
       OR NEW.end_at IS DISTINCT FROM OLD.end_at
    THEN
      PERFORM public.recalc_tour_session_participants(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_recalc_session_participants_after_schedule ON public.tour_sessions;

CREATE TRIGGER trg_recalc_session_participants_after_schedule
  AFTER UPDATE OF start_at, end_at ON public.tour_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.recalc_session_participants_after_schedule_change();

-- Одноразово: пересчитать все слоты
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.tour_sessions LOOP
    PERFORM public.recalc_tour_session_participants(r.id);
  END LOOP;
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- Опционально: вернуть брони, ошибочно отменённые кодом (не SQL-триггером).
-- Выполните вручную в Supabase, если нужно восстановить историю:
--
-- UPDATE public.bookings
-- SET status = 'confirmed'
-- WHERE status = 'cancelled'
--   AND tour_id = '<UUID тура>'
--   AND updated_at > NOW() - INTERVAL '30 days';
-- ---------------------------------------------------------------------------
