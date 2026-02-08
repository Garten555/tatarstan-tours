-- Migration 010: Add cities table and city field to tours
-- Добавляем таблицу городов и поле города в туры

-- Создаем таблицу городов
CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  name_lower TEXT NOT NULL, -- Для поиска без учета регистра
  region TEXT, -- Район/регион
  population INTEGER, -- Население
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_cities_name_lower ON cities(name_lower);
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);

-- Добавляем поле city_id в таблицу tours
ALTER TABLE tours ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id) ON DELETE SET NULL;

-- Создаем индекс для быстрого поиска туров по городу
CREATE INDEX IF NOT EXISTS idx_tours_city_id ON tours(city_id);

-- Добавляем все города Татарстана
INSERT INTO cities (name, name_lower, region, population) VALUES
-- Крупные города
('Казань', 'казань', 'Республика Татарстан', 1308660),
('Набережные Челны', 'набережные челны', 'Республика Татарстан', 548434),
('Нижнекамск', 'нижнекамск', 'Республика Татарстан', 241479),
('Альметьевск', 'альметьевск', 'Республика Татарстан', 163512),
('Зеленодольск', 'зеленодольск', 'Республика Татарстан', 99137),
('Бугульма', 'бугульма', 'Республика Татарстан', 81677),
('Елабуга', 'елабуга', 'Республика Татарстан', 73623),
('Лениногорск', 'лениногорск', 'Республика Татарстан', 60993),
('Чистополь', 'чистополь', 'Республика Татарстан', 58815),
('Заинск', 'заинск', 'Республика Татарстан', 40637),
('Азнакаево', 'азнакаево', 'Республика Татарстан', 34660),
('Нурлат', 'нурлат', 'Республика Татарстан', 32600),
('Менделеевск', 'менделеевск', 'Республика Татарстан', 22875),
('Бавлы', 'бавлы', 'Республика Татарстан', 22109),
('Буинск', 'буинск', 'Республика Татарстан', 20342),
('Агрыз', 'агрыз', 'Республика Татарстан', 19983),
('Арск', 'арск', 'Республика Татарстан', 20421),
('Высокая Гора', 'высокая гора', 'Республика Татарстан', 10400),
('Кукмор', 'кукмор', 'Республика Татарстан', 17862),
('Мензелинск', 'мензелинск', 'Республика Татарстан', 16987),
('Мамадыш', 'мамадыш', 'Республика Татарстан', 15752),
('Тетюши', 'тетюши', 'Республика Татарстан', 11286),
('Болгар', 'болгар', 'Республика Татарстан', 8520),
('Иннополис', 'иннополис', 'Республика Татарстан', 4055),
('Свияжск', 'свияжск', 'Республика Татарстан', 243),
-- Исторические и туристические места
('Билярск', 'билярск', 'Республика Татарстан', 2300),
('Таймыр', 'таймыр', 'Республика Татарстан', NULL),
('Раифа', 'раифа', 'Республика Татарстан', NULL),
('Великий Болгар', 'великий болгар', 'Республика Татарстан', NULL)
ON CONFLICT (name) DO NOTHING;

-- Функция для автоматического обновления name_lower
CREATE OR REPLACE FUNCTION update_city_name_lower()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name_lower = LOWER(NEW.name);
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления name_lower
DROP TRIGGER IF EXISTS trigger_update_city_name_lower ON cities;
CREATE TRIGGER trigger_update_city_name_lower
  BEFORE INSERT OR UPDATE ON cities
  FOR EACH ROW
  EXECUTE FUNCTION update_city_name_lower();

-- Обновляем name_lower для существующих записей
UPDATE cities SET name_lower = LOWER(name) WHERE name_lower IS NULL OR name_lower != LOWER(name);

-- Комментарии
COMMENT ON TABLE cities IS 'Таблица городов Республики Татарстан';
COMMENT ON COLUMN cities.name IS 'Название города';
COMMENT ON COLUMN cities.name_lower IS 'Название в нижнем регистре для поиска';
COMMENT ON COLUMN cities.region IS 'Район или регион';
COMMENT ON COLUMN cities.population IS 'Численность населения';
COMMENT ON COLUMN tours.city_id IS 'ID города, в котором проходит тур';






















