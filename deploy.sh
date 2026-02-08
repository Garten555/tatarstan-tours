#!/bin/bash

# Скрипт автоматического деплоя на сервер
SERVER="root@92.53.99.60"
PROJECT_DIR="/var/www/tatarstan-tours"

echo "🚀 Начинаю деплой на сервер..."

# Подключение к серверу и выполнение команд
ssh $SERVER << 'ENDSSH'
cd /var/www/tatarstan-tours
echo "📥 Получаю обновления из GitHub..."
git pull origin main
echo "📦 Устанавливаю зависимости..."
npm install
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
