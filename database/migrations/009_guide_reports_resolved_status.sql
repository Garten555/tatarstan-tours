-- Добавляет статус resolved для уже созданной таблицы guide_reports (миграция 008 без resolved).
-- Выполните в Supabase SQL Editor один раз.

ALTER TABLE public.guide_reports
  DROP CONSTRAINT IF EXISTS guide_reports_status_check;

ALTER TABLE public.guide_reports
  ADD CONSTRAINT guide_reports_status_check
  CHECK (status IN ('open', 'reviewed', 'resolved', 'dismissed'));
