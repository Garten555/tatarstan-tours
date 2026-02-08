#!/bin/bash

# Скрипт автоматического деплоя на сервер
SERVER="root@92.53.99.60"
PROJECT_DIR="/var/www/tatarstan-tours"

echo "🚀 Начинаю деплой на сервер..."

# Подключение к серверу и выполнение команд
ssh $SERVER << 'ENDSSH'
cd /var/www/tatarstan-tours

echo "🔒 Сохраняю .env файлы..."
# Сохраняем .env файлы во временную директорию
mkdir -p /tmp/env-backup
cp .env.production /tmp/env-backup/.env.production 2>/dev/null || true
cp .env.local /tmp/env-backup/.env.local 2>/dev/null || true
cp .env /tmp/env-backup/.env 2>/dev/null || true

echo "🗑️  Удаляю старые файлы (кроме .git и node_modules)..."
# Удаляем все кроме .git, node_modules и .env файлов
find . -maxdepth 1 ! -name '.' ! -name '..' ! -name '.git' ! -name 'node_modules' ! -name '.env*' -exec rm -rf {} +

echo "📥 Клонирую/обновляю проект из GitHub..."
# Если .git существует, делаем pull, иначе клонируем
if [ -d ".git" ]; then
    git fetch origin
    git reset --hard origin/main
    git clean -fd
else
    echo "❌ Ошибка: .git директория не найдена!"
    exit 1
fi

echo "🔒 Восстанавливаю .env файлы..."
# Восстанавливаем .env файлы
cp /tmp/env-backup/.env.production .env.production 2>/dev/null || true
cp /tmp/env-backup/.env.local .env.local 2>/dev/null || true
cp /tmp/env-backup/.env .env 2>/dev/null || true
rm -rf /tmp/env-backup

echo "📦 Устанавливаю зависимости..."
npm ci --production=false

echo "🔨 Собираю проект..."
npm run build

echo "🔄 Перезапускаю приложение через PM2..."
pm2 restart tatarstan-tours || pm2 start npm --name "tatarstan-tours" -- start
pm2 save

echo "✅ Деплой завершён!"
echo "📊 Статус PM2:"
pm2 status
ENDSSH

echo "✨ Готово! Проверь http://92.53.99.60:3000"
