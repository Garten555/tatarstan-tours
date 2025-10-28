# 🗄️ АРХИТЕКТУРА S3 ХРАНИЛИЩА

## 📦 Общая информация

**Провайдер:** Timeweb Cloud Storage (S3-совместимый)  
**Endpoint:** `https://s3.twcstorage.ru`  
**Регион:** `ru-1`  
**Bucket:** `26bf6ecb-2b26c15a-8629-4e9f-9eaf-009a5b88dd96`

## 🗂️ Структура файлов в бакете

```
bucket/
├── tours/
│   ├── covers/          # Обложки туров (1200x800px)
│   │   └── {timestamp}-{random}.jpg
│   ├── gallery/         # Фото галереи туров (1920x1080px)
│   │   └── {timestamp}-{random}.jpg
│   └── videos/          # Видео туров (mp4, webm)
│       └── {timestamp}-{random}.mp4
└── users/
    └── avatars/         # Аватары пользователей (500x500px)
        └── {timestamp}-{random}.jpg
```

## 🔧 Технические детали

### Библиотеки

- `@aws-sdk/client-s3` - SDK для работы с S3
- `@aws-sdk/s3-request-presigner` - Генерация подписанных URL

### Файлы проекта

1. **`lib/s3/client.ts`** - Конфигурация S3 клиента
2. **`lib/s3/upload.ts`** - Утилиты для загрузки/удаления файлов
3. **`app/api/upload/route.ts`** - API endpoint для загрузки
4. **`app/api/upload/delete/route.ts`** - API endpoint для удаления
5. **`components/admin/FileUploader.tsx`** - Компонент загрузки файлов

## 🔐 Безопасность

### Права доступа к API

Только авторизованные пользователи с ролями:
- `super_admin` - полный доступ
- `tour_admin` - может загружать/удалять файлы туров

### Валидация файлов

**Изображения:**
- Форматы: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`
- Максимальный размер: 10MB

**Видео:**
- Форматы: `video/mp4`, `video/webm`
- Максимальный размер: 10MB (можно увеличить для видео)

### ACL (Access Control List)

Все загруженные файлы имеют `ACL: 'public-read'` - доступны по прямому URL

## 📡 API Endpoints

### POST `/api/upload`

Загружает файл в S3

**Body (FormData):**
```typescript
{
  file: File,           // Файл для загрузки
  type: string          // 'tour-cover' | 'tour-gallery' | 'tour-video' | 'avatar'
}
```

**Response:**
```typescript
{
  success: true,
  url: string,          // Публичный URL файла
  path: string,         // Путь в бакете
  fileName: string      // Уникальное имя файла
}
```

### POST `/api/upload/delete`

Удаляет файл из S3

**Body (JSON):**
```typescript
{
  path: string          // Путь к файлу в бакете
}
```

**Response:**
```typescript
{
  success: true,
  message: string
}
```

## 🎨 Использование в компонентах

### Пример загрузки файла

```typescript
import FileUploader from '@/components/admin/FileUploader';

function TourForm() {
  const handleUploadComplete = (url: string, path: string) => {
    console.log('Файл загружен:', url);
    // Сохраняем URL в базу данных
  };

  return (
    <FileUploader
      type="tour-cover"
      onUploadComplete={handleUploadComplete}
      accept="image/*"
      maxSizeMB={10}
    />
  );
}
```

### Отображение изображений из S3

```typescript
import Image from 'next/image';

function TourCover({ imageUrl }: { imageUrl: string }) {
  return (
    <Image
      src={imageUrl}  // URL из S3
      alt="Tour cover"
      width={1200}
      height={800}
      className="rounded-lg"
    />
  );
}
```

## 🚀 Преимущества S3

1. ✅ **Масштабируемость** - неограниченное хранилище
2. ✅ **CDN** - быстрая доставка контента
3. ✅ **Надёжность** - 99.99% uptime
4. ✅ **Безопасность** - контроль доступа, шифрование
5. ✅ **Экономия** - файлы не нагружают сервер Next.js
6. ✅ **Производительность** - параллельная загрузка множества файлов

## 📊 Мониторинг

- **Размер бакета:** доступен в панели Timeweb
- **Трафик:** отслеживается провайдером
- **Стоимость:** зависит от тарифа Timeweb

## 🔄 Миграция данных

При необходимости перехода на другой S3 провайдер:

1. Экспортировать файлы из текущего бакета
2. Изменить переменные окружения (endpoint, credentials)
3. Загрузить файлы в новый бакет
4. Обновить URL в базе данных (опционально)

## ⚙️ Настройка бакета (рекомендации)

1. **CORS** - разрешить запросы с домена сайта
2. **Lifecycle** - автоматическое удаление старых файлов (опционально)
3. **Versioning** - хранить версии файлов (опционально)
4. **Backup** - регулярное резервное копирование

