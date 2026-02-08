# Проверка миграций базы данных

Если вы получаете ошибку "Таблица travel_blog_posts не найдена", выполните следующие шаги:

## 1. Проверка применения миграций

### Через Supabase Dashboard:
1. Откройте ваш проект в [Supabase Dashboard](https://app.supabase.com)
2. Перейдите в раздел **SQL Editor**
3. Выполните запрос:
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'travel_blog_posts';
```

Если таблица не найдена, нужно применить миграции.

### Через Supabase CLI:
```bash
# Проверьте статус миграций
supabase migration list

# Примените все миграции
supabase db push

# Или примените конкретную миграцию
supabase migration up
```

## 2. Применение миграции вручную

Если автоматическое применение не работает, выполните миграцию вручную:

1. Откройте файл `supabase/migrations/034_blog_system.sql`
2. Скопируйте весь SQL код
3. Откройте **SQL Editor** в Supabase Dashboard
4. Вставьте и выполните код

## 3. Проверка переменных окружения

Убедитесь, что в файле `.env.local` установлены:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Важно:** `SUPABASE_SERVICE_ROLE_KEY` необходим для создания постов через API.

## 4. Проверка RLS политик

После применения миграции убедитесь, что RLS политики созданы:

```sql
SELECT * FROM pg_policies 
WHERE tablename = 'travel_blog_posts';
```

Должны быть следующие политики:
- "Public posts are visible to everyone" (SELECT)
- "Users can create their own posts" (INSERT)
- "Users can update their own posts" (UPDATE)
- "Users can delete their own posts" (DELETE)

## 5. Тестирование

После применения миграций попробуйте создать пост снова. Если ошибка сохраняется, проверьте консоль браузера и серверные логи для детальной информации об ошибке.










