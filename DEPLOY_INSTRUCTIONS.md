# 🚀 ИНСТРУКЦИЯ ПО ДЕПЛОЮ НА СЕРВЕР

## ✅ ЧТО СДЕЛАНО НА ЛОКАЛКЕ:

1. ✅ Интегрировано S3 хранилище (Timeweb)
2. ✅ Создана страница туров `/tours`
3. ✅ Создана динамическая страница `/tours/[slug]`
4. ✅ Добавлены API для загрузки файлов
5. ✅ Проект собран успешно
6. ✅ Изменения закоммичены и запушены в GitHub

---

## 📋 КОМАНДЫ ДЛЯ ДЕПЛОЯ (ВЫПОЛНЯЙ ПО ПОРЯДКУ)

### 1️⃣ Подключись к серверу:
```bash
ssh root@92.53.99.60
```

---

### 2️⃣ Перейди в папку проекта и стяни изменения:
```bash
cd /var/www
git clone https://github.com/Garten555/tatarstan-tours.git
cd tatarstan-tours
```

---

### 3️⃣ Установи зависимости:
```bash
npm install
```

---

### 4️⃣ Создай файл `.env.production`:
```bash
cat > .env.production << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://gvgdwqlklryktqaevmnz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Z2R3cWxrbHJ5a3RxYWV2bW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODA3OTMsImV4cCI6MjA3NzE1Njc5M30.lLY3p4R0N-OwKRhxzdvEysknvCwHzowKgL2UX8bhwV0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Z2R3cWxrbHJ5a3RxYWV2bW56Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU4MDc5MywiZXhwIjoyMDc3MTU2NzkzfQ._dvWEqkww7nGfg2CWuR5Ue3Neq6JJBrck0NLm2COlM4

# OpenRouter AI
OPENROUTER_API_KEY=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

# Email (Rambler SMTP)
SMTP_HOST=smtp.rambler.ru
SMTP_PORT=465
SMTP_USER=Daniel-Mini@rambler.ru
SMTP_PASSWORD=19812005mM

# Timeweb S3 Storage Configuration
S3_ENDPOINT=https://s3.twcstorage.ru
S3_REGION=ru-1
S3_BUCKET=26bf6ecb-2b26c15a-8629-4e9f-9eaf-009a5b88dd96
S3_ACCESS_KEY=ZJXB62FMFSTMG1CZE4QH
S3_SECRET_KEY=wkzwaMlMWucNnLxEAcf2YxX69B6UvdgdVcPnH5c2
NEXT_PUBLIC_S3_PUBLIC_URL=https://s3.twcstorage.ru

# App Configuration
NEXT_PUBLIC_SITE_URL=http://92.53.99.60:3000
NODE_ENV=production
EOF
```

---

### 5️⃣ Собери проект:
```bash
npm run build
```

---

### 6️⃣ Запусти через PM2:
```bash
pm2 start npm --name "tatarstan-tours" -- start
```

---

### 7️⃣ Сохрани конфигурацию PM2:
```bash
pm2 save
```

---

### 8️⃣ Проверь статус:
```bash
pm2 status
pm2 logs tatarstan-tours --lines 50
```

---

## ✅ ПРОВЕРКА

Открой в браузере:
- `http://92.53.99.60:3000` - Главная страница
- `http://92.53.99.60:3000/tours` - Страница туров
- `http://92.53.99.60:3000/tours/kazan-city-tour` - Страница тура

---

## 🔧 ЕСЛИ НУЖНО ОБНОВИТЬ ПРОЕКТ В БУДУЩЕМ:

```bash
ssh root@92.53.99.60
cd /var/www/tatarstan-tours
git pull origin main
npm install
npm run build
pm2 restart tatarstan-tours
pm2 logs tatarstan-tours
```

---

## ⚠️ TROUBLESHOOTING

### Если порт 3000 занят:
```bash
pm2 stop tatarstan-tours
pm2 delete tatarstan-tours
pm2 start npm --name "tatarstan-tours" -- start
```

### Если не хватает памяти при сборке:
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### Проверить что Next.js слушает:
```bash
netstat -tlnp | grep 3000
```

### Проверить логи:
```bash
pm2 logs tatarstan-tours
```

---

## 🎯 ЧТО ДАЛЬШЕ?

После успешного деплоя:
1. ✅ Проверь все страницы
2. ✅ Проверь адаптивность (мобильная версия)
3. ✅ Проверь консоль браузера на ошибки
4. ✅ Скажи мне "работает" или скинь ошибки если есть

Удачи! 🚀

