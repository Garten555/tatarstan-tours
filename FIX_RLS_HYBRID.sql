-- ГИБРИДНЫЕ RLS ПОЛИТИКИ (Безопасные + Работающие)
-- Выполни в Supabase SQL Editor

-- ШАГ 1: Удаляем все политики
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_super_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_super_admin" ON profiles;

-- ШАГ 2: Создаём ПРАВИЛЬНЫЕ политики

-- SELECT: Authenticated пользователи могут видеть свой профиль
-- + Service role может видеть всё (для серверных компонентов)
CREATE POLICY "Enable read access for own profile"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id 
    OR 
    auth.role() = 'service_role'
  );

-- INSERT: Authenticated пользователи могут создавать только свой профиль
-- + Service role может создавать любые
CREATE POLICY "Enable insert for authenticated users"
  ON profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id 
    OR 
    auth.role() = 'service_role'
  );

-- UPDATE: Authenticated пользователи могут обновлять только свой профиль
-- + Обычные пользователи НЕ могут менять role
-- + Service role может обновлять всё
CREATE POLICY "Enable update for own profile"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id 
    OR 
    auth.role() = 'service_role'
  )
  WITH CHECK (
    (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()))
    OR 
    auth.role() = 'service_role'
  );

-- ШАГ 3: Проверяем политики
SELECT 
  policyname, 
  cmd as operation
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd;

-- ГОТОВО! Теперь:
-- ✅ Серверные компоненты (service_role) могут читать профили
-- ✅ Пользователи видят только свой профиль
-- ✅ Пользователи НЕ могут менять свою роль
-- ✅ Всё безопасно!

