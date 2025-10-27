# ⚡ Быстрый старт

## 🚀 Запуск за 5 минут

### 1. Установите зависимости
```bash
npm install
```

### 2. Настройте переменные окружения
```bash
# Создайте .env.local на основе ENV_SETUP.md
cp ENV_SETUP.md .env.local
# Отредактируйте .env.local и заполните ключи
```

**Минимально необходимые переменные:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENROUTER_API_KEY` (для AI чата)
- `NEXT_PUBLIC_YANDEX_MAPS_API_KEY`

### 3. Настройте Supabase
1. Создайте проект на [supabase.com](https://supabase.com)
2. Скопируйте SQL из `supabase/migrations/001_initial_schema.sql`
3. Вставьте в SQL Editor в Supabase Dashboard
4. Выполните миграцию

### 4. Запустите dev сервер
```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

---

## 📚 Что дальше?

### Создайте первого админа
```sql
-- В Supabase SQL Editor после регистрации пользователя
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'your-email@example.com';
```

### Изучите документацию
- [README.md](./README.md) - Полное руководство
- [DIPLOMA.md](./DIPLOMA.md) - Документация для диплома
- [CHAT_ARCHITECTURE.md](./CHAT_ARCHITECTURE.md) - Архитектура чата
- [ENV_SETUP.md](./ENV_SETUP.md) - Настройка переменных

### Структура проекта
```
app/          → Next.js страницы и API
components/   → React компоненты
lib/          → Утилиты (Supabase, AI)
types/        → TypeScript типы
supabase/     → SQL миграции
```

---

## 🎯 Основные фичи

1. **Туры** - `/tours`
   - Каталог туров с картами
   - Детальная информация
   
2. **Бронирование** - `/booking/[tourId]`
   - Выбор количества человек
   - Ввод данных участников
   - Генерация билета

3. **Чат** - Виджет справа внизу
   - AI-агент отвечает автоматически
   - Передача живому оператору

4. **Админки**
   - `/admin/super` - Супер-админ
   - `/admin/tours` - Управление турами
   - `/admin/support` - Чаты поддержки

---

## 🆘 Проблемы?

### Supabase не подключается
- Проверьте URL и ключи в `.env.local`
- Убедитесь что миграции применены

### AI чат не работает
- Проверьте `OPENROUTER_API_KEY`
- Убедитесь что баланс > $0 на openrouter.ai

### Карты не загружаются
- Проверьте `NEXT_PUBLIC_YANDEX_MAPS_API_KEY`

---

**Удачи с проектом! 🚀**

