# 🔧 ОБНОВЛЕНИЕ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ ДЛЯ S3

## ⚠️ ВАЖНО: Добавь эти переменные вручную!

### 📝 В файл `.env.local` добавь:

```env
# Timeweb S3 Storage Configuration
S3_ENDPOINT=https://s3.twcstorage.ru
S3_REGION=ru-1
S3_BUCKET=26bf6ecb-2b26c15a-8629-4e9f-9eaf-009a5b88dd96
S3_ACCESS_KEY=ZJXB62FMFSTMG1CZE4QH
S3_SECRET_KEY=wkzwaMlMWucNnLxEAcf2YxX69B6UvdgdVcPnH5c2
NEXT_PUBLIC_S3_PUBLIC_URL=https://s3.twcstorage.ru
```

### 📝 В файл `.env.production` добавь то же самое:

```env
# Timeweb S3 Storage Configuration
S3_ENDPOINT=https://s3.twcstorage.ru
S3_REGION=ru-1
S3_BUCKET=26bf6ecb-2b26c15a-8629-4e9f-9eaf-009a5b88dd96
S3_ACCESS_KEY=ZJXB62FMFSTMG1CZE4QH
S3_SECRET_KEY=wkzwaMlMWucNnLxEAcf2YxX69B6UvdgdVcPnH5c2
NEXT_PUBLIC_S3_PUBLIC_URL=https://s3.twcstorage.ru
```

## ✅ После добавления:

1. Сохрани оба файла
2. Перезапусти dev сервер (если запущен)
3. Скажи мне "готово"

## 🔒 Безопасность:

- Эти файлы уже в `.gitignore`
- Ключи не попадут в GitHub
- На сервере создадим `.env.production` отдельно

