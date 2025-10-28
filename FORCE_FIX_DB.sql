-- ПОЛНОЕ ИСПРАВЛЕНИЕ БД
-- Выполни этот скрипт в Supabase SQL Editor

-- 1. УДАЛЯЕМ СТАРУЮ ТАБЛИЦУ (ОСТОРОЖНО!)
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. СОЗДАЁМ ТАБЛИЦУ ЗАНОВО С ПРАВИЛЬНЫМИ КОЛОНКАМИ
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL DEFAULT 'Имя',
  last_name TEXT NOT NULL DEFAULT 'Фамилия',
  middle_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'tour_admin', 'support_admin', 'super_admin')),
  avatar_url TEXT,
  avatar_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ВКЛЮЧАЕМ RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. СОЗДАЁМ RLS ПОЛИТИКИ
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 5. СОЗДАЁМ ТРИГГЕР ДЛЯ АВТООБНОВЛЕНИЯ updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 6. СОЗДАЁМ ТРИГГЕР ДЛЯ АВТОСОЗДАНИЯ ПРОФИЛЯ
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, middle_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Имя'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Фамилия'),
    NEW.raw_user_meta_data->>'middle_name',
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    middle_name = EXCLUDED.middle_name;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- 7. СОЗДАЁМ ИНДЕКСЫ
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_first_name ON profiles(first_name);
CREATE INDEX IF NOT EXISTS idx_profiles_last_name ON profiles(last_name);

-- 8. КОММЕНТАРИИ
COMMENT ON TABLE profiles IS 'Профили пользователей с ФИО и аватарками';
COMMENT ON COLUMN profiles.first_name IS 'Имя пользователя';
COMMENT ON COLUMN profiles.last_name IS 'Фамилия пользователя';
COMMENT ON COLUMN profiles.middle_name IS 'Отчество пользователя (опционально)';
COMMENT ON COLUMN profiles.avatar_url IS 'Публичный URL аватарки (S3)';
COMMENT ON COLUMN profiles.avatar_path IS 'Путь к аватарке в S3';


