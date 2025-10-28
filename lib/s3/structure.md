# 🗂️ СТРУКТУРА S3 ХРАНИЛИЩА

## 📁 Организация файлов в бакете

```
bucket: 26bf6ecb-2b26c15a-8629-4e9f-9eaf-009a5b88dd96/
│
├── users/
│   └── avatars/
│       ├── {userId}/
│       │   └── avatar-{timestamp}.jpg     # Текущая аватарка пользователя
│       │                                  # При замене - старая удаляется
│       └── ...
│
├── tours/
│   ├── covers/
│   │   └── {tourId}-cover-{timestamp}.jpg  # Обложки туров
│   │
│   ├── gallery/
│   │   └── {tourId}-{index}-{timestamp}.jpg  # Фото галереи
│   │
│   └── videos/
│       └── {tourId}-video-{timestamp}.mp4  # Видео туров
│
└── temp/
    └── ...  # Временные файлы (автоудаление через 24ч)
```

## 🎯 Правила именования файлов

### 1. Аватарки пользователей
**Формат:** `users/avatars/{userId}/avatar-{timestamp}.{ext}`

**Пример:**
```
users/avatars/123e4567-e89b-12d3-a456-426614174000/avatar-1698765432000.jpg
```

**Логика:**
- Один пользователь = одна папка
- При загрузке новой аватарки:
  1. Загружаем новый файл
  2. Удаляем старый файл (по `avatar_path` из БД)
  3. Обновляем `avatar_url` и `avatar_path` в БД

### 2. Обложки туров
**Формат:** `tours/covers/{tourSlug}-cover-{timestamp}.{ext}`

**Пример:**
```
tours/covers/kazan-city-tour-cover-1698765432000.jpg
```

### 3. Галерея туров
**Формат:** `tours/gallery/{tourSlug}-{index}-{timestamp}.{ext}`

**Пример:**
```
tours/gallery/kazan-city-tour-1-1698765432000.jpg
tours/gallery/kazan-city-tour-2-1698765432000.jpg
```

### 4. Видео туров
**Формат:** `tours/videos/{tourSlug}-video-{timestamp}.{ext}`

**Пример:**
```
tours/videos/kazan-city-tour-video-1698765432000.mp4
```

## 🔄 Логика замены файлов

### Замена аватарки:

```typescript
async function updateAvatar(userId: string, newFile: File) {
  // 1. Получаем старый путь из БД
  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_path')
    .eq('id', userId)
    .single();

  // 2. Загружаем новый файл
  const newPath = `users/avatars/${userId}/avatar-${Date.now()}.jpg`;
  const newUrl = await uploadFileToS3(newFile, newPath);

  // 3. Удаляем старый файл (если был)
  if (profile?.avatar_path) {
    await deleteFileFromS3(profile.avatar_path);
  }

  // 4. Обновляем БД
  await supabase
    .from('profiles')
    .update({
      avatar_url: newUrl,
      avatar_path: newPath
    })
    .eq('id', userId);
}
```

### Замена обложки тура:

```typescript
async function updateTourCover(tourId: string, newFile: File) {
  // 1. Получаем старую обложку
  const { data: tour } = await supabase
    .from('tours')
    .select('cover_image, cover_path')
    .eq('id', tourId)
    .single();

  // 2. Загружаем новую
  const slug = tour.slug;
  const newPath = `tours/covers/${slug}-cover-${Date.now()}.jpg`;
  const newUrl = await uploadFileToS3(newFile, newPath);

  // 3. Удаляем старую
  if (tour?.cover_path) {
    await deleteFileFromS3(tour.cover_path);
  }

  // 4. Обновляем БД
  await supabase
    .from('tours')
    .update({
      cover_image: newUrl,
      cover_path: newPath
    })
    .eq('id', tourId);
}
```

## 🗑️ Автоудаление старых файлов

### При удалении пользователя:
```sql
-- Trigger в БД
CREATE OR REPLACE FUNCTION delete_user_files()
RETURNS TRIGGER AS $$
BEGIN
  -- Вызываем Edge Function для удаления файлов
  PERFORM net.http_post(
    url := 'https://your-api.com/api/cleanup/user',
    body := json_build_object('userId', OLD.id)::text
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_deleted
  BEFORE DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION delete_user_files();
```

### При удалении тура:
```sql
CREATE OR REPLACE FUNCTION delete_tour_files()
RETURNS TRIGGER AS $$
BEGIN
  -- Удаляем все медиа тура
  PERFORM net.http_post(
    url := 'https://your-api.com/api/cleanup/tour',
    body := json_build_object('tourId', OLD.id)::text
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_tour_deleted
  BEFORE DELETE ON tours
  FOR EACH ROW EXECUTE FUNCTION delete_tour_files();
```

## 📊 Мониторинг хранилища

### Размер по папкам:
```
users/avatars/     ~500MB  (средний размер 200KB * 2500 пользователей)
tours/covers/      ~100MB  (1MB * 100 туров)
tours/gallery/     ~2GB    (5MB * 400 фото)
tours/videos/      ~5GB    (100MB * 50 видео)
-------------------
ИТОГО:            ~7.6GB
```

## 🔐 Безопасность

1. **Все файлы публичные** (`ACL: public-read`)
2. **Загрузка только через API** с проверкой прав
3. **Валидация типов файлов** на сервере
4. **Ограничение размера**:
   - Аватарки: 2MB
   - Обложки: 5MB
   - Галерея: 5MB
   - Видео: 100MB

## 🎯 Оптимизация

1. **Компрессия изображений** перед загрузкой (Next.js Image)
2. **WebP формат** для лучшего сжатия
3. **Lazy loading** для галерей
4. **CDN кэширование** через Timeweb

