# PowerShell скрипт деплоя на VPS сервер
# Использование: .\deploy-vps.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Начало деплоя..." -ForegroundColor Cyan

# Проверка, что мы в правильной директории
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Ошибка: package.json не найден. Убедитесь, что вы в корне проекта." -ForegroundColor Red
    exit 1
}

# Сохраняем текущую ветку
$currentBranch = git branch --show-current
Write-Host "📦 Текущая ветка: $currentBranch" -ForegroundColor Yellow

# Получаем последние изменения из GitHub
Write-Host "📥 Получение изменений из GitHub..." -ForegroundColor Yellow
git fetch origin
git reset --hard "origin/$currentBranch"
git clean -fd
Write-Host "✅ Код обновлен до последней версии" -ForegroundColor Green

# Сохраняем .env файлы (если они есть)
Write-Host "🔒 Сохранение .env файлов..." -ForegroundColor Yellow
$envBackup = "$env:TEMP\env-backup"
New-Item -ItemType Directory -Force -Path $envBackup | Out-Null
if (Test-Path ".env.production") {
    Copy-Item ".env.production" "$envBackup\.env.production"
    Write-Host "✅ .env.production сохранен" -ForegroundColor Green
}
if (Test-Path ".env.local") {
    Copy-Item ".env.local" "$envBackup\.env.local"
    Write-Host "✅ .env.local сохранен" -ForegroundColor Green
}
if (Test-Path ".env") {
    Copy-Item ".env" "$envBackup\.env"
    Write-Host "✅ .env сохранен" -ForegroundColor Green
}

# Удаляем старые файлы (кроме .git, node_modules, .env)
Write-Host "🗑️  Удаление старых файлов..." -ForegroundColor Yellow
Get-ChildItem -Path . -Exclude ".git", "node_modules", ".env*" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "✅ Старые файлы удалены" -ForegroundColor Green

# Обновляем зависимости
Write-Host "📦 Обновление зависимостей..." -ForegroundColor Yellow
npm ci

# Восстанавливаем .env файлы
if (Test-Path "$envBackup\.env.production") {
    Copy-Item "$envBackup\.env.production" ".env.production"
    Write-Host "✅ .env.production восстановлен" -ForegroundColor Green
}
if (Test-Path "$envBackup\.env.local") {
    Copy-Item "$envBackup\.env.local" ".env.local"
    Write-Host "✅ .env.local восстановлен" -ForegroundColor Green
}
if (Test-Path "$envBackup\.env") {
    Copy-Item "$envBackup\.env" ".env"
    Write-Host "✅ .env восстановлен" -ForegroundColor Green
}
Remove-Item -Recurse -Force $envBackup -ErrorAction SilentlyContinue

# Собираем проект
Write-Host "🔨 Сборка проекта..." -ForegroundColor Yellow
npm run build

# Проверяем PM2
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    Write-Host "🔄 Перезапуск через PM2..." -ForegroundColor Yellow
    $pm2List = pm2 list
    if ($pm2List -match "next") {
        pm2 restart next
        Write-Host "✅ Приложение перезапущено через PM2" -ForegroundColor Green
    } else {
        Write-Host "⚠️  PM2 процесс не найден. Запускаю новый..." -ForegroundColor Yellow
        pm2 start npm --name "next" -- start
    }
} else {
    Write-Host "⚠️  PM2 не установлен. Проверьте, как запущено приложение." -ForegroundColor Yellow
}

# Очистка старых сборок
Write-Host "🧹 Очистка старых файлов..." -ForegroundColor Yellow
if (Test-Path ".next\cache") {
    Remove-Item -Recurse -Force ".next\cache"
    Write-Host "✅ Кэш очищен" -ForegroundColor Green
}

Write-Host "✅ Деплой завершен успешно!" -ForegroundColor Green
Write-Host "🌐 Приложение должно быть доступно на вашем сервере" -ForegroundColor Green

