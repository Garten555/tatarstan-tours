# PowerShell скрипт для деплоя на Windows
$SERVER = "root@92.53.99.60"
$PROJECT_DIR = "/var/www/tatarstan-tours"

Write-Host "Starting deploy..." -ForegroundColor Green

$commands = @"
cd /var/www/tatarstan-tours
echo 'Pulling from GitHub...'
git pull origin main
echo 'Installing dependencies...'
npm install
echo 'Building project...'
npm run build
echo 'Restarting via PM2...'
pm2 restart tatarstan-tours || pm2 start npm --name 'tatarstan-tours' -- start
pm2 save
echo 'Deploy done.'
echo 'PM2 status:'
pm2 status
"@

# Выполняем команды через SSH
ssh $SERVER $commands

Write-Host "Done. Check http://92.53.99.60:3000" -ForegroundColor Green


