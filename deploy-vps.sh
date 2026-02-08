#!/bin/bash

# Скрипт деплоя на VPS сервер
# Использование: ./deploy-vps.sh

set -e  # Остановка при ошибке

echo "🚀 Начало деплоя..."

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Проверка, что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Ошибка: package.json не найден. Убедитесь, что вы в корне проекта.${NC}"
    exit 1
fi

# Сохраняем текущую ветку
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}📦 Текущая ветка: ${CURRENT_BRANCH}${NC}"

# Получаем последние изменения из GitHub
echo -e "${YELLOW}📥 Получение изменений из GitHub...${NC}"
git fetch origin
git reset --hard origin/$CURRENT_BRANCH
git clean -fd
echo -e "${GREEN}✅ Код обновлен до последней версии${NC}"

# Сохраняем .env файлы (если они есть)
echo -e "${YELLOW}🔒 Сохранение .env файлов...${NC}"
mkdir -p /tmp/env-backup
if [ -f ".env.production" ]; then
    cp .env.production /tmp/env-backup/.env.production
    echo -e "${GREEN}✅ .env.production сохранен${NC}"
fi
if [ -f ".env.local" ]; then
    cp .env.local /tmp/env-backup/.env.local
    echo -e "${GREEN}✅ .env.local сохранен${NC}"
fi
if [ -f ".env" ]; then
    cp .env /tmp/env-backup/.env
    echo -e "${GREEN}✅ .env сохранен${NC}"
fi

# Удаляем старые файлы (кроме .git, node_modules, .env)
echo -e "${YELLOW}🗑️  Удаление старых файлов...${NC}"
find . -maxdepth 1 ! -name '.' ! -name '..' ! -name '.git' ! -name 'node_modules' ! -name '.env*' -exec rm -rf {} + 2>/dev/null || true
echo -e "${GREEN}✅ Старые файлы удалены${NC}"

# Обновляем зависимости
echo -e "${YELLOW}📦 Обновление зависимостей...${NC}"
npm ci --production=false

# Восстанавливаем .env файлы
if [ -f "/tmp/env-backup/.env.production" ]; then
    cp /tmp/env-backup/.env.production .env.production
    echo -e "${GREEN}✅ .env.production восстановлен${NC}"
fi
if [ -f "/tmp/env-backup/.env.local" ]; then
    cp /tmp/env-backup/.env.local .env.local
    echo -e "${GREEN}✅ .env.local восстановлен${NC}"
fi
if [ -f "/tmp/env-backup/.env" ]; then
    cp /tmp/env-backup/.env .env
    echo -e "${GREEN}✅ .env восстановлен${NC}"
fi
rm -rf /tmp/env-backup

# Собираем проект
echo -e "${YELLOW}🔨 Сборка проекта...${NC}"
npm run build

# Проверяем, есть ли PM2 или другой процесс-менеджер
if command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}🔄 Перезапуск через PM2...${NC}"
    # Ищем процесс Next.js
    if pm2 list | grep -q "next"; then
        pm2 restart next
        echo -e "${GREEN}✅ Приложение перезапущено через PM2${NC}"
    else
        echo -e "${YELLOW}⚠️  PM2 процесс не найден. Запускаю новый...${NC}"
        pm2 start npm --name "next" -- start
    fi
elif [ -f "ecosystem.config.js" ] || [ -f "ecosystem.config.cjs" ]; then
    echo -e "${YELLOW}🔄 Запуск через PM2 с конфигом...${NC}"
    pm2 restart ecosystem.config.js || pm2 restart ecosystem.config.cjs
else
    echo -e "${YELLOW}⚠️  PM2 не установлен. Проверьте, как запущено приложение.${NC}"
    echo -e "${YELLOW}Если используется systemd, выполните: sudo systemctl restart your-app${NC}"
fi

# Очистка старых сборок (опционально)
echo -e "${YELLOW}🧹 Очистка старых файлов...${NC}"
rm -rf .next/cache
echo -e "${GREEN}✅ Кэш очищен${NC}"

echo -e "${GREEN}✅ Деплой завершен успешно!${NC}"
echo -e "${GREEN}🌐 Приложение должно быть доступно на вашем сервере${NC}"

