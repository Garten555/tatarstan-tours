-- Миграция 003: Исправление RLS политик для создания профилей
-- Дата: 2025-10-28
-- Описание: Разрешаем создавать профили через INSERT

-- Добавляем политику для INSERT профилей (только для себя)
CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Обновляем триггер для создания профиля
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Имя'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Фамилия'),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Комментарии
COMMENT ON POLICY "Users can create own profile" ON profiles IS 
  'Пользователи могут создавать свой собственный профиль';

