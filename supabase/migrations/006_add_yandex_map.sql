-- Добавление поля для URL Яндекс карты
ALTER TABLE tours
ADD COLUMN IF NOT EXISTS yandex_map_url TEXT;

-- Добавляем комментарий для документации
COMMENT ON COLUMN tours.yandex_map_url IS 'URL карты из Яндекс Конструктора карт для отображения маршрута тура';

