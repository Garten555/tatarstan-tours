-- ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ RLS ПОЛИТИК
-- Выполни этот скрипт ПОЛНОСТЬЮ в Supabase SQL Editor

-- ШАГ 1: Проверяем какие политики сейчас есть
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'profiles';

-- ШАГ 2: ОТКЛЮЧАЕМ RLS ВРЕМЕННО
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ШАГ 3: УДАЛЯЕМ ВСЕ СУЩЕСТВУЮЩИЕ ПОЛИТИКИ
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON profiles';
    END LOOP;
END $$;

-- ШАГ 4: ПРОВЕРЯЕМ ЧТО ПОЛИТИК НЕТ
SELECT COUNT(*) as policies_count FROM pg_policies WHERE tablename = 'profiles';

-- ШАГ 5: УДАЛЯЕМ БИТЫЕ ПРОФИЛИ
DELETE FROM profiles WHERE id IN (
  '72c32c10-a5d8-4826-9fe1-14dd6cf2c9dc',
  '8416ce4f-d9d1-4bdf-b340-4abde9988013'
);

-- ШАГ 6: ВКЛЮЧАЕМ RLS ОБРАТНО
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ШАГ 7: СОЗДАЁМ ПРОСТЫЕ ПОЛИТИКИ (БЕЗ РЕКУРСИИ!)
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- ШАГ 8: ПРОВЕРЯЕМ НОВЫЕ ПОЛИТИКИ
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';

-- ГОТОВО! Теперь профили должны работать!

