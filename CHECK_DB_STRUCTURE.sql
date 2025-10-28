-- ПРОВЕРКА СТРУКТУРЫ БД
-- Скопируй и выполни в Supabase SQL Editor

-- 1. Проверяем какие колонки есть в profiles
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Проверяем триггеры
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND event_object_schema = 'auth';

-- 3. Проверяем функцию handle_new_user
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';

-- 4. Проверяем RLS политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';


