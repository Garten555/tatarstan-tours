# 🎯 Платформа туров по Татарстану

> Современная web-платформа для организации и бронирования туристических туров по достопримечательностям Татарстана

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 📋 О проекте

Это дипломный проект, представляющий собой полнофункциональную платформу для бронирования туров по Татарстану. Система включает:

- ✅ Каталог туров с интерактивными картами (Яндекс.Карты)
- ✅ Систему бронирования с проверкой доступности
- ✅ Автоматическую генерацию билетов (PDF)
- ✅ Email-уведомления
- ✅ Чат поддержки с AI-агентом (OpenRouter)
- ✅ Административные панели для разных ролей
- ✅ Управление медиа-контентом
- ✅ Двухфакторная аутентификация (TOTP, **otplib**): настройка в профиле, вход «пароль → код»

## 🛠️ Технологический стек

### Frontend
- **Next.js 16** - React framework с Server Components
- **React 19** - UI библиотека
- **TypeScript** - Статическая типизация
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - State management
- **Socket.io Client** - WebSocket клиент

### Backend
- **Next.js API Routes** - RESTful API
- **Server Actions** - Server-side мутации
- **Socket.io** - WebSocket для чата
- **Nodemailer** - Email отправка

### База данных
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Реляционная БД
- **Row Level Security** - Защита данных

### Внешние API
- **Яндекс.Карты** - Интерактивные карты
- **OpenRouter** - AI-агент (GPT-4, Claude, Llama)

## 📦 Установка и запуск

### Требования
- Node.js 20+
- npm или yarn
- Аккаунт Supabase
- API ключи (Яндекс.Карты, OpenRouter)

### Локальная разработка

```bash
# 1. Клонирование репозитория
git clone https://github.com/your-username/tatarstan-tours.git
cd tatarstan-tours

# 2. Установка зависимостей
npm install

# 3. Настройка переменных окружения
# Создайте файл .env.local на основе .env.template
cp .env.template .env.local

# Заполните значения:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY (сервер: magic link после входа с 2FA)
# - NEXT_PUBLIC_SITE_URL (публичный URL сайта, редиректы и ссылки)
# - OPENROUTER_API_KEY
# - NEXT_PUBLIC_YANDEX_MAPS_API_KEY
# - EMAIL_* (для nodemailer)

# 4. Настройка Supabase
# Создайте проект на https://supabase.com
# Примените SQL миграции из supabase/migrations/

# 5. Запуск dev сервера
npm run dev

# Приложение доступно по адресу http://localhost:3000
```

### Команды

```bash
npm run dev          # Запуск dev сервера
npm run build        # Сборка для продакшена
npm start            # Запуск prod сервера
npm run lint         # Проверка кода (eslint)
```

## 🗄️ Структура проекта

```
tatarstan-tours/
├── app/                      # Next.js App Router
│   ├── (public)/            # Публичные страницы
│   │   ├── page.tsx        # Главная страница
│   │   ├── tours/          # Каталог туров
│   │   └── booking/        # Бронирование
│   ├── (protected)/        # Защищённые страницы
│   │   ├── profile/        # Профиль пользователя
│   │   └── my-bookings/    # Мои бронирования
│   ├── admin/              # Админ-панели
│   │   ├── super/          # Супер-админ
│   │   ├── tours/          # Админ туров
│   │   └── support/        # Админ поддержки
│   └── api/                # API Routes
│       ├── tours/          # CRUD туров
│       ├── bookings/       # Бронирования
│       ├── chat/           # WebSocket чат
│       └── admin/          # Админ API
├── components/             # React компоненты
│   ├── admin/             # Админ компоненты
│   ├── chat/              # Чат компоненты
│   ├── tours/             # Туры компоненты
│   └── ui/                # UI компоненты
├── lib/                   # Утилиты и хелперы
│   ├── supabase/         # Supabase клиенты
│   ├── auth/             # TOTP / 2FA (otplib)
│   └── ai/               # AI интеграция
├── types/                # TypeScript типы
├── public/               # Статические файлы
│   └── uploads/         # Загруженные медиа
├── supabase/            # Supabase конфигурация
│   └── migrations/      # SQL миграции
├── CHAT_ARCHITECTURE.md # Архитектура чата (если есть в репозитории)
└── deploy.sh            # Скрипт деплоя по SSH
```

## 🔐 Роли пользователей

| Роль | Доступ |
|------|--------|
| **User** | Просмотр туров, бронирование, профиль |
| **Tour Admin** | Управление турами, медиа, просмотр бронирований |
| **Support Admin** | Все чаты, ответы пользователям |
| **Super Admin** | Полный доступ ко всему |

## 🚀 Развертывание на сервере

### Подготовка сервера

```bash
# На сервере (Ubuntu/Debian)
# 1. Установка Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Установка PM2
sudo npm install -g pm2

# 3. Установка Nginx
sudo apt-get install nginx
```

### Первый деплой

```bash
# На сервере
cd /var/www/
git clone https://github.com/your-username/tatarstan-tours.git
cd tatarstan-tours

# Создание .env файла
nano .env
# Вставьте production переменные

# Установка и сборка (для next build нужны devDependencies — без флага --production)
npm ci
npm run build

# Запуск через PM2
pm2 start npm --name "tatarstan-tours" -- start
pm2 startup
pm2 save
```

### Последующие деплои

**Вариант A — скрипт с локальной машины** (см. `deploy.sh`: SSH, `git reset` на `origin/main`, `npm ci`, `build`, `pm2`):

```bash
./deploy.sh
```

**Вариант B — вручную на сервере** (замени путь к проекту и имя ветки при необходимости):

```bash
cd /var/www/tatarstan-tours

git fetch origin
git checkout main
git pull origin main

npm ci
npm run build

pm2 restart tatarstan-tours
# или: pm2 start npm --name "tatarstan-tours" -- start
```

**Docker** (если деплой через контейнер):

```bash
cd /path/to/tatarstan-tours
git pull
docker compose build --no-cache
docker compose up -d
```

**Переменные окружения на проде** (минимум для 2FA и сессий): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, **`SUPABASE_SERVICE_ROLE_KEY`**, **`NEXT_PUBLIC_SITE_URL`** (полный URL сайта). В Supabase должна существовать таблица **`user_mfa`** (секрет TOTP, `enabled`, резервные коды и т.д., как ожидают маршруты `app/api/auth/2fa/`).

### Двухфакторная аутентификация (2FA)

- Включение: страница **`/profile/settings`**, блок «Двухфакторная аутентификация» → настроить приложение (QR) → ввести код → включить.
- Вход: сначала **email и пароль**, затем **одноразовый код** (TOTP); после проверки выдаётся magic link (нужен **service role** в env).
- Реализация: **`lib/auth/totp.ts`** (otplib), API — `app/api/auth/2fa/*`, `app/api/auth/login-with-2fa`.

## 📚 Документация

- [CHAT_ARCHITECTURE.md](./CHAT_ARCHITECTURE.md) - Архитектура чата (если файл есть в клоне)
  - WebSocket соединение
  - AI-агент (OpenRouter)
  - Передача оператору
  - Реализация

## 🔧 Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com)
2. Скопируйте URL и anon key в `.env.local`
3. Примените SQL миграции:
   - Откройте SQL Editor в Supabase Dashboard
   - Скопируйте содержимое `supabase/migrations/001_initial_schema.sql`
   - Выполните миграцию

4. Создайте первого админа:
   ```sql
   -- После регистрации пользователя через Auth
   UPDATE profiles 
   SET role = 'super_admin' 
   WHERE email = 'your-admin-email@example.com';
   ```

## 🔑 API Ключи

### Яндекс.Карты
1. Получите ключ на [yandex.ru/dev/maps](https://yandex.ru/dev/maps/)
2. Добавьте в `.env.local`:
   ```
   NEXT_PUBLIC_YANDEX_MAPS_API_KEY=your-key-here
   ```

### OpenRouter
1. Получите ключ на [openrouter.ai](https://openrouter.ai/)
2. Добавьте в `.env.local`:
   ```
   OPENROUTER_API_KEY=your-key-here
   ```

### Email (Nodemailer)
Для Gmail:
1. Включите "2-Step Verification"
2. Создайте "App Password"
3. Добавьте в `.env.local`:
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   ```

## 🐛 Известные проблемы

- На локалке и продакшене используется одна БД - не рекомендуется для реальных проектов
- Решение: создайте отдельный Supabase проект для локальной разработки

## 📝 TODO / Roadmap

- [ ] Интеграция платежных систем (ЮKassa, CloudPayments)
- [ ] Система отзывов и рейтингов
- [ ] Мобильное приложение (React Native)
- [ ] Мультиязычность (RU/TT/EN)
- [ ] Расширенная аналитика
- [ ] Push-уведомления

## 👨‍💻 Автор

**Ваше Имя**
- GitHub: [@your-username](https://github.com/your-username)
- Email: your-email@example.com

## 📄 Лицензия

MIT License - см. файл [LICENSE](LICENSE)

## 🙏 Благодарности

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [OpenRouter](https://openrouter.ai/)
- [Яндекс.Карты](https://yandex.ru/dev/maps/)

---

⭐ Если проект понравился, поставьте звезду на GitHub!
