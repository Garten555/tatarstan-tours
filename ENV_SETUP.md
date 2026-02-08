# ⚙️ Настройка Environment переменных

## 📝 Инструкция

Создайте файл `.env.local` в корне проекта и заполните следующие переменные:

## 🔑 Обязательные переменные

### 1. Supabase Configuration
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Где получить:**
1. Зайдите на [supabase.com](https://supabase.com)
2. Создайте новый проект или откройте существующий
3. Settings → API
4. Скопируйте:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ держите в секрете!)

### 2. OpenRouter AI Configuration
```env
OPENROUTER_API_KEY=your-openrouter-api-key
```

**Где получить:**
1. Зайдите на [openrouter.ai](https://openrouter.ai)
2. Зарегистрируйтесь или войдите
3. Keys → Create Key
4. Скопируйте ключ

**Стоимость:** ~$0.02 за 1000 токенов (зависит от модели)

### 3. Yandex Maps API
```env
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=your-yandex-maps-key
```

**Где получить:**
1. Зайдите на [yandex.ru/dev/maps](https://yandex.ru/dev/maps/)
2. Войдите с Яндекс ID
3. JavaScript API → Get key
4. Скопируйте ключ

**Бесплатно:** До 25,000 запросов/день

### 4. Email Configuration (Nodemailer)
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@tatarstan-tours.ru
```

**Настройка для Gmail:**
1. Включите "2-Step Verification" в настройках Google аккаунта
2. Перейдите в Security → App passwords
3. Создайте пароль для приложения "Mail"
4. Используйте этот пароль в `EMAIL_PASSWORD`

**Альтернативы Gmail:**
- **Yandex:** smtp.yandex.ru:465
- **Mail.ru:** smtp.mail.ru:465
- **SendGrid:** smtp.sendgrid.net:587
- **Mailgun:** smtp.mailgun.org:587

### 5. Pusher Configuration (Real-time чат)
```env
PUSHER_APP_ID=your-pusher-app-id
NEXT_PUBLIC_PUSHER_KEY=your-pusher-key
PUSHER_SECRET=your-pusher-secret
NEXT_PUBLIC_PUSHER_CLUSTER=eu
```

**Где получить:**
1. Зайдите на [pusher.com](https://pusher.com)
2. Создайте бесплатный аккаунт
3. Создайте новый Channels app
4. Скопируйте:
   - App ID → `PUSHER_APP_ID`
   - Key → `NEXT_PUBLIC_PUSHER_KEY`
   - Secret → `PUSHER_SECRET` (⚠️ держите в секрете!)
   - Cluster → `NEXT_PUBLIC_PUSHER_CLUSTER` (обычно `eu`, `us`, `ap`)

**Бесплатно:** До 200,000 сообщений/день, 100 одновременных подключений

### 6. App Configuration
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

**Для продакшена:**
```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

## 🚀 Продакшен переменные (дополнительно)

### Для деплоя на сервер
```env
SERVER_HOST=your-server-ip
SERVER_USER=your-server-user
SERVER_PATH=/var/www/tatarstan-tours
```

## 📋 Полный пример .env.local

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmno.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenRouter AI
OPENROUTER_API_KEY=sk-or-v1-...

# Yandex Maps
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=12345678-90ab-cdef-1234-567890abcdef

# Email (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=myemail@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
EMAIL_FROM=noreply@tatarstan-tours.ru

# Pusher (Real-time чат)
PUSHER_APP_ID=1234567
NEXT_PUBLIC_PUSHER_KEY=abcdefghijklmnop
PUSHER_SECRET=abcdefghijklmnop1234567890
NEXT_PUBLIC_PUSHER_CLUSTER=eu

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## ⚠️ Важные замечания

1. **Никогда не коммитьте `.env.local` в Git!**
   - Файл уже добавлен в `.gitignore`

2. **SUPABASE_SERVICE_ROLE_KEY** имеет полный доступ к БД
   - Используйте только на сервере
   - Никогда не используйте в клиентском коде

3. **Разные окружения = разные переменные**
   - Для локалки: `.env.local`
   - Для продакшена: переменные в окружении сервера

## 🔧 Проверка настройки

После создания `.env.local` запустите:

```bash
npm run dev
```

Проверьте консоль на ошибки подключения к Supabase или другим сервисам.

## 🆘 Troubleshooting

### Ошибка подключения к Supabase
- Проверьте правильность URL и ключей
- Убедитесь, что проект Supabase активен
- Примените SQL миграции из `supabase/migrations/`

### Email не отправляется
- Проверьте правильность SMTP настроек
- Для Gmail: убедитесь что используете App Password
- Проверьте что 2FA включен для Gmail

### Яндекс.Карты не загружаются
- Проверьте валидность API ключа
- Убедитесь что домен добавлен в белый список на dev.yandex.ru

### OpenRouter ошибка 401
- Проверьте правильность API ключа
- Убедитесь что баланс > $0 на openrouter.ai

## 📚 Дополнительные ресурсы

- [Supabase Docs](https://supabase.com/docs)
- [OpenRouter Docs](https://openrouter.ai/docs)
- [Yandex Maps Docs](https://yandex.ru/dev/maps/jsapi/doc/2.1/)
- [Nodemailer Docs](https://nodemailer.com/about/)

