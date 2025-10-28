-- БЕЗОПАСНЫЕ RLS ПОЛИТИКИ ДЛЯ PROFILES
-- Выполни в Supabase SQL Editor

-- ШАГ 1: Удаляем небезопасные политики
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- ШАГ 2: Создаём БЕЗОПАСНЫЕ политики

-- SELECT: Пользователь может видеть только свой профиль
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- INSERT: Пользователь может создать только свой профиль
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: Пользователь может обновлять только свой профиль
-- И только определённые поля (не может менять role без прав)
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- DELETE: Запрещаем удаление профилей (только через CASCADE при удалении auth.user)
-- (Политику DELETE не создаём = нельзя удалять)

-- ШАГ 3: Создаём дополнительные политики для админов (опционально)

-- SELECT: Super Admin может видеть все профили
CREATE POLICY "profiles_select_super_admin"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- UPDATE: Super Admin может обновлять любые профили
CREATE POLICY "profiles_update_super_admin"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ШАГ 4: Проверяем созданные политики
SELECT 
  policyname, 
  cmd as operation,
  CASE WHEN roles = '{authenticated}' THEN 'authenticated' ELSE 'other' END as target
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- ГОТОВО! Теперь:
-- ✅ Пользователи видят только свой профиль
-- ✅ Пользователи могут редактировать только свой профиль
-- ✅ Пользователи не могут менять свою роль
-- ✅ Super Admin видит и редактирует всё
-- ✅ Нельзя удалять профили напрямую

