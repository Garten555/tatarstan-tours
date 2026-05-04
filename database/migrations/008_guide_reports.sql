-- Жалобы на гида в контексте комнаты тура (модерация: support_admin, tour_admin, super_admin).
-- Выполните в Supabase SQL Editor, если таблицы ещё нет.

CREATE TABLE IF NOT EXISTS public.guide_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.tour_rooms (id) ON DELETE SET NULL,
  reason text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_guide_reports_created ON public.guide_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guide_reports_status ON public.guide_reports (status);
CREATE INDEX IF NOT EXISTS idx_guide_reports_guide ON public.guide_reports (guide_id);

COMMENT ON TABLE public.guide_reports IS 'Жалобы участников на гида комнаты тура';
