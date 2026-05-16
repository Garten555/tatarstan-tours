-- Восстановление броней, ошибочно отменённых при переносе дат (до миграции 019).
-- 1) Сначала выполните database/migrations/019_booking_departure_snapshot.sql
-- 2) Подставьте UUID тура вместо <TOUR_ID>
-- 3) Проверьте SELECT, затем раскомментируйте UPDATE

-- SELECT id, status, created_at, num_people
-- FROM public.bookings
-- WHERE tour_id = '<TOUR_ID>' AND status = 'cancelled';

-- UPDATE public.bookings
-- SET status = 'confirmed'
-- WHERE tour_id = '<TOUR_ID>'
--   AND status = 'cancelled';
