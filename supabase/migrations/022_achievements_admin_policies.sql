-- Migration 022: RLS политики для выдачи достижений админами и гидами
-- RLS policies for admin/guide achievement awarding

-- Добавляем политику для создания достижений админами и гидами
CREATE POLICY "Admins can create achievements"
  ON achievements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tour_admin', 'super_admin')
    )
  );

-- Добавляем политику для создания достижений гидами для участников их туров
CREATE POLICY "Guides can create achievements for tour participants"
  ON achievements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tour_rooms tr
      JOIN tour_room_participants trp ON tr.id = trp.room_id
      WHERE tr.guide_id = auth.uid()
      AND trp.user_id = achievements.user_id
      AND tr.tour_id = achievements.tour_id
    )
  );

COMMENT ON POLICY "Admins can create achievements" ON achievements IS 'Администраторы могут создавать достижения для любых пользователей';
COMMENT ON POLICY "Guides can create achievements for tour participants" ON achievements IS 'Гиды могут создавать достижения для участников своих туров';

















