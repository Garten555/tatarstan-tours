# 🔧 НАСТРОЙКА SUPABASE (ПРИМЕНЕНИЕ МИГРАЦИЙ)

## ⚠️ ВАЖНО: Нужно применить SQL миграции в Supabase!

### 📋 ЧТО ДЕЛАТЬ:

1. **Открой Supabase Dashboard:**
   - Перейди на https://supabase.com
   - Открой проект `gvgdwqlklryktqaevmnz`

2. **Перейди в SQL Editor:**
   - Слева в меню нажми "SQL Editor"
   - Нажми кнопку "+ New query"

3. **Примени миграцию 001:**
   - Открой файл `supabase/migrations/001_initial_schema.sql`
   - Скопируй ВЕСЬ код (все 379 строк)
   - Вставь в SQL Editor
   - Нажми "Run" (или F5)
   - Подожди выполнения

4. **Примени миграцию 002:**
   - Открой файл `supabase/migrations/002_update_profiles.sql`
   - Скопируй код
   - Вставь в новый запрос SQL Editor
   - Нажми "Run"

5. **Проверь результат:**
   - Перейди в "Table Editor"
   - Должна быть таблица `profiles` с полями:
     - `id`
     - `email`
     - `first_name`
     - `last_name`
     - `middle_name`
     - `avatar_url`
     - `avatar_path`
     - `role`
     - `created_at`
     - `updated_at`

---

## ✅ ПОСЛЕ ПРИМЕНЕНИЯ МИГРАЦИЙ:

1. Перезапусти dev сервер (`Ctrl+C` → `npm run dev`)
2. Зарегистрируйся заново (или обнови существующий профиль)
3. Имя и фамилия должны отображаться!

---

## 🚨 ЕСЛИ ОШИБКА:

**"relation profiles already exists"** - значит таблица уже есть.

Тогда просто выполни:
```sql
-- Добавляем отсутствующие колонки
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_path TEXT;

-- Обновляем функцию
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Имя'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Фамилия'),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

