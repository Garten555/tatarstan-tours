# Инструкция по деплою на VPS сервер

## Подключение к серверу

```bash
ssh root@92.53.99.60
```

## Вариант 1: Автоматический деплой (рекомендуется)

### На сервере:

1. Перейдите в директорию проекта:
```bash
cd /path/to/your/project
```

2. Сделайте скрипт исполняемым (для Linux):
```bash
chmod +x deploy-vps.sh
```

3. Запустите скрипт:
```bash
./deploy-vps.sh
```

Или для Windows (PowerShell):
```powershell
.\deploy-vps.ps1
```

## Вариант 2: Ручной деплой

### Шаг 1: Подключитесь к серверу
```bash
ssh root@92.53.99.60
```

### Шаг 2: Перейдите в директорию проекта
```bash
cd /path/to/your/project
```

### Шаг 3: Сохраните .env файлы
```bash
mkdir -p /tmp/env-backup
cp .env.production /tmp/env-backup/ 2>/dev/null || true
cp .env.local /tmp/env-backup/ 2>/dev/null || true
cp .env /tmp/env-backup/ 2>/dev/null || true
```

### Шаг 4: Удалите старые файлы (кроме .git, node_modules, .env)
```bash
find . -maxdepth 1 ! -name '.' ! -name '..' ! -name '.git' ! -name 'node_modules' ! -name '.env*' -exec rm -rf {} +
```

### Шаг 5: Получите последние изменения из GitHub
```bash
git fetch origin
git reset --hard origin/main
git clean -fd
```

### Шаг 6: Восстановите .env файлы
```bash
cp /tmp/env-backup/.env.production .env.production 2>/dev/null || true
cp /tmp/env-backup/.env.local .env.local 2>/dev/null || true
cp /tmp/env-backup/.env .env 2>/dev/null || true
rm -rf /tmp/env-backup
```

### Шаг 7: Обновите зависимости
```bash
npm ci
```

### Шаг 8: Соберите проект
```bash
npm run build
```

### Шаг 9: Перезапустите приложение

#### Если используется PM2:
```bash
pm2 restart next
# или
pm2 restart ecosystem.config.js
```

#### Если используется systemd:
```bash
sudo systemctl restart your-app-name
```

#### Если запущено вручную:
Остановите текущий процесс (Ctrl+C) и запустите заново:
```bash
npm start
```

## Проверка статуса

### PM2:
```bash
pm2 status
pm2 logs next
```

### systemd:
```bash
sudo systemctl status your-app-name
```

## Важные замечания

1. **Не удаляйте .env файлы** - они содержат секретные ключи
2. **Проверьте переменные окружения** перед деплоем
3. **Убедитесь, что порты открыты** в firewall
4. **Проверьте логи** после деплоя на наличие ошибок

## Откат к предыдущей версии

Если что-то пошло не так:

```bash
git log --oneline -10  # Посмотреть последние коммиты
git checkout <commit-hash>  # Вернуться к нужному коммиту
npm ci
npm run build
pm2 restart next
```

## Troubleshooting

### Ошибка "Port already in use":
```bash
# Найти процесс на порту
lsof -i :3000
# или
netstat -tulpn | grep :3000

# Убить процесс
kill -9 <PID>
```

### Ошибка "Out of memory":
```bash
# Увеличить лимит памяти для Node.js
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### Ошибка при git pull:
```bash
# Если есть конфликты
git stash
git pull origin main
git stash pop
```

