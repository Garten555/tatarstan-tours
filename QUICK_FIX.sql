-- БЫСТРОЕ ИСПРАВЛЕНИЕ: Добавляем недостающие колонки

-- Добавляем last_name
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT 'Фамилия';

-- Добавляем middle_name
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS middle_name TEXT;

-- Проверяем результат
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

