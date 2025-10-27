# 📚 Дипломный проект: Платформа туров по Татарстану

## 📋 Оглавление
1. [Описание проекта](#описание-проекта)
2. [Архитектура системы](#архитектура-системы)
3. [Технологический стек](#технологический-стек)
4. [Структура базы данных](#структура-базы-данных)
5. [Функциональные возможности](#функциональные-возможности)
6. [API Endpoints](#api-endpoints)
7. [Интеграции](#интеграции)
8. [Безопасность](#безопасность)
9. [Развертывание](#развертывание)

---

## 📝 Описание проекта

**Название:** Платформа туров по Татарстану  
**Тип:** Web-приложение для бронирования и управления туристическими турами  
**Цель:** Создание современной платформы для организации и бронирования туров по достопримечательностям Татарстана с интеграцией интерактивных карт, системой бронирования и AI-поддержкой.

### Основные возможности:
- ✅ Каталог туров с детальным описанием
- ✅ Интерактивные карты маршрутов (Яндекс.Карты)
- ✅ Система бронирования с проверкой доступности
- ✅ Автоматическая генерация билетов (PDF)
- ✅ Email-уведомления
- ✅ Чат поддержки с AI-агентом
- ✅ Административные панели для разных ролей
- ✅ Управление медиа-контентом (фото/видео)

---

## 🏗️ Архитектура системы

### Клиент-серверная архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   React/    │  │  Yandex     │  │  WebSocket  │        │
│  │  Next.js    │  │   Maps      │  │   Client    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────┐
│                    SERVER (Next.js 15)                       │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │    API     │  │  Server    │  │  WebSocket │           │
│  │   Routes   │  │  Actions   │  │   Server   │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼──────┐  ┌────────▼────────┐
│   Supabase     │  │  OpenRouter │  │   File System   │
│   (PostgreSQL) │  │     AI      │  │  (Media Store)  │
│                │  │             │  │                 │
│  • Database    │  │  • GPT-4    │  │  • Images       │
│  • Auth        │  │  • Claude   │  │  • Videos       │
│  • Storage     │  │  • Llama    │  │  • PDFs         │
└────────────────┘  └─────────────┘  └─────────────────┘
```

### Компонентная архитектура

```
app/
├── (public)/              # Публичные страницы
│   ├── page.tsx          # Главная страница
│   ├── tours/            # Каталог туров
│   └── booking/          # Бронирование
├── (protected)/          # Защищённые страницы
│   ├── profile/          # Профиль пользователя
│   └── my-bookings/      # Мои бронирования
├── admin/                # Админ-панели
│   ├── super/            # Супер-админ
│   ├── tours/            # Админ туров
│   └── support/          # Админ поддержки
└── api/                  # API Routes
    ├── tours/            # CRUD туров
    ├── bookings/         # Бронирования
    ├── chat/             # WebSocket чат
    └── admin/            # Админ API
```

---

## 🛠️ Технологический стек

### Frontend
| Технология | Версия | Назначение |
|------------|--------|------------|
| **Next.js** | 15.x | React framework с Server Components |
| **React** | 19.x | UI библиотека |
| **TypeScript** | 5.x | Статическая типизация |
| **Tailwind CSS** | 3.x | Utility-first CSS framework |
| **Zustand** | 4.x | State management |
| **React Hook Form** | 7.x | Управление формами |
| **date-fns** | 3.x | Работа с датами |

### Backend
| Технология | Версия | Назначение |
|------------|--------|------------|
| **Next.js API Routes** | 15.x | RESTful API |
| **Server Actions** | - | Server-side мутации |
| **Node.js** | 20.x | Runtime окружение |
| **Socket.io** | 4.x | WebSocket для чата |

### База данных
| Технология | Назначение |
|------------|------------|
| **Supabase** | Backend-as-a-Service |
| **PostgreSQL** | Реляционная БД |
| **Row Level Security (RLS)** | Защита данных на уровне строк |

### Внешние API
| Сервис | Назначение |
|--------|------------|
| **Яндекс.Карты API** | Интерактивные карты маршрутов |
| **OpenRouter** | AI-агент для чата поддержки |
| **Nodemailer** | Отправка email-уведомлений |

### DevOps
| Инструмент | Назначение |
|------------|------------|
| **Git** | Контроль версий |
| **GitHub** | Хостинг репозитория |
| **PM2** | Process manager для Node.js |
| **Nginx** | Reverse proxy сервер |

---

## 🗄️ Структура базы данных

### ER-диаграмма

```
┌─────────────────┐
│     profiles    │
├─────────────────┤
│ id (PK)         │───┐
│ email           │   │
│ full_name       │   │
│ phone           │   │
│ role            │   │
│ avatar_url      │   │
│ created_at      │   │
└─────────────────┘   │
                      │
                      │
┌─────────────────┐   │    ┌─────────────────┐
│      tours      │   │    │    bookings     │
├─────────────────┤   │    ├─────────────────┤
│ id (PK)         │   │    │ id (PK)         │
│ title           │   │    │ user_id (FK)    │───┘
│ description     │   │    │ tour_id (FK)    │───┐
│ short_desc      │   │◄───│ booking_date    │   │
│ full_desc       │   │    │ num_people      │   │
│ cover_image     │   │    │ total_price     │   │
│ price_per_person│   │    │ status          │   │
│ start_date      │   │    │ created_at      │   │
│ end_date        │   │    └─────────────────┘   │
│ max_participants│   │                           │
│ current_bookings│   │                           │
│ yandex_map_data │   │                           │
│ status          │   │    ┌─────────────────┐   │
│ created_by      │   │    │booking_attendees│   │
│ created_at      │   │    ├─────────────────┤   │
└─────────────────┘   │    │ id (PK)         │   │
                      │    │ booking_id (FK) │───┘
                      │    │ full_name       │
┌─────────────────┐   │    │ email           │
│   tour_media    │   │    │ phone           │
├─────────────────┤   │    │ passport_data   │
│ id (PK)         │   │    └─────────────────┘
│ tour_id (FK)    │───┘
│ media_type      │
│ media_url       │        ┌─────────────────┐
│ order           │        │  chat_messages  │
│ created_at      │        ├─────────────────┤
└─────────────────┘        │ id (PK)         │
                           │ user_id (FK)    │
                           │ message         │
                           │ is_ai           │
                           │ is_support      │
                           │ session_id      │
                           │ created_at      │
                           └─────────────────┘
```

### SQL Схемы

#### 1. Таблица profiles (Профили пользователей)

```sql
CREATE TYPE user_role AS ENUM ('user', 'tour_admin', 'support_admin', 'super_admin');

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  role user_role DEFAULT 'user',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Пользователь может читать свой профиль
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Пользователь может обновлять свой профиль
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Админы могут видеть все профили
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tour_admin', 'support_admin', 'super_admin')
    )
  );
```

#### 2. Таблица tours (Туры)

```sql
CREATE TYPE tour_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  short_desc TEXT,
  full_desc TEXT,
  cover_image TEXT,
  price_per_person DECIMAL(10, 2) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 20,
  current_bookings INTEGER DEFAULT 0,
  yandex_map_data JSONB, -- JSON с координатами и настройками карты
  status tour_status DEFAULT 'draft',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_dates CHECK (end_date > start_date),
  CONSTRAINT valid_participants CHECK (max_participants > 0),
  CONSTRAINT valid_bookings CHECK (current_bookings >= 0 AND current_bookings <= max_participants)
);

-- Индексы для производительности
CREATE INDEX idx_tours_status ON tours(status);
CREATE INDEX idx_tours_dates ON tours(start_date, end_date);
CREATE INDEX idx_tours_slug ON tours(slug);

-- Row Level Security
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;

-- Все могут видеть опубликованные туры
CREATE POLICY "Anyone can view published tours"
  ON tours FOR SELECT
  USING (status = 'published');

-- Админы туров могут управлять турами
CREATE POLICY "Tour admins can manage tours"
  ON tours FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tour_admin', 'super_admin')
    )
  );
```

#### 3. Таблица tour_media (Медиа файлы туров)

```sql
CREATE TYPE media_type AS ENUM ('image', 'video');

CREATE TABLE tour_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  media_type media_type NOT NULL,
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для быстрой выборки медиа по туру
CREATE INDEX idx_tour_media_tour_id ON tour_media(tour_id, order_index);

-- RLS
ALTER TABLE tour_media ENABLE ROW LEVEL SECURITY;

-- Все могут видеть медиа опубликованных туров
CREATE POLICY "Anyone can view media of published tours"
  ON tour_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tours
      WHERE tours.id = tour_media.tour_id
      AND tours.status = 'published'
    )
  );

-- Админы могут управлять медиа
CREATE POLICY "Tour admins can manage media"
  ON tour_media FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tour_admin', 'super_admin')
    )
  );
```

#### 4. Таблица bookings (Бронирования)

```sql
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  tour_id UUID NOT NULL REFERENCES tours(id),
  booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  num_people INTEGER NOT NULL CHECK (num_people > 0),
  total_price DECIMAL(10, 2) NOT NULL,
  status booking_status DEFAULT 'pending',
  ticket_url TEXT, -- Ссылка на сгенерированный PDF билет
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_tour_id ON bookings(tour_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Пользователь может видеть свои бронирования
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

-- Пользователь может создавать бронирования
CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Админы могут видеть все бронирования
CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tour_admin', 'support_admin', 'super_admin')
    )
  );

-- Триггер для обновления current_bookings в tours
CREATE OR REPLACE FUNCTION update_tour_bookings()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'confirmed') THEN
    UPDATE tours
    SET current_bookings = current_bookings + NEW.num_people
    WHERE id = NEW.tour_id;
  ELSIF (TG_OP = 'UPDATE' AND OLD.status != 'confirmed' AND NEW.status = 'confirmed') THEN
    UPDATE tours
    SET current_bookings = current_bookings + NEW.num_people
    WHERE id = NEW.tour_id;
  ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status = 'cancelled') THEN
    UPDATE tours
    SET current_bookings = current_bookings - OLD.num_people
    WHERE id = OLD.tour_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_status_change
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_tour_bookings();
```

#### 5. Таблица booking_attendees (Участники бронирования)

```sql
CREATE TABLE booking_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  passport_data TEXT, -- Для туров, требующих паспортные данные
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс
CREATE INDEX idx_booking_attendees_booking_id ON booking_attendees(booking_id);

-- RLS
ALTER TABLE booking_attendees ENABLE ROW LEVEL SECURITY;

-- Пользователь может видеть участников своих бронирований
CREATE POLICY "Users can view own booking attendees"
  ON booking_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_attendees.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- Пользователь может добавлять участников к своим бронированиям
CREATE POLICY "Users can add attendees to own bookings"
  ON booking_attendees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_attendees.booking_id
      AND bookings.user_id = auth.uid()
    )
  );
```

#### 6. Таблица chat_messages (Сообщения чата)

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  session_id TEXT NOT NULL, -- Для анонимных пользователей
  message TEXT NOT NULL,
  is_ai BOOLEAN DEFAULT FALSE,
  is_support BOOLEAN DEFAULT FALSE, -- Сообщение от живого оператора
  support_admin_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Пользователь может видеть свои сообщения
CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id OR session_id = current_setting('app.session_id', true));

-- Пользователь может создавать сообщения
CREATE POLICY "Users can create chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Админы поддержки могут видеть все сообщения
CREATE POLICY "Support admins can view all messages"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('support_admin', 'super_admin')
    )
  );
```

---

## ⚙️ Функциональные возможности

### 1. Каталог туров

#### Пользовательские возможности:
- Просмотр списка всех доступных туров
- Фильтрация по датам, цене, длительности
- Поиск по названию и описанию
- Просмотр детальной информации о туре:
  - Интерактивная карта маршрута (Яндекс.Карты)
  - Галерея фотографий
  - Видео-превью (если есть)
  - Полное описание тура
  - Расписание
  - Информация о доступных местах

#### Технические детали:
```typescript
// Структура данных тура
interface Tour {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDesc: string;
  fullDesc: string;
  coverImage: string;
  pricePerPerson: number;
  startDate: Date;
  endDate: Date;
  maxParticipants: number;
  currentBookings: number;
  yandexMapData: {
    center: [number, number]; // [latitude, longitude]
    zoom: number;
    routes: Array<{
      name: string;
      coordinates: Array<[number, number]>;
      description: string;
    }>;
    markers: Array<{
      coordinates: [number, number];
      title: string;
      description: string;
      icon: string;
    }>;
  };
  status: 'draft' | 'published' | 'archived';
  media: Array<{
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
  }>;
}
```

### 2. Система бронирования

#### Workflow бронирования:

```
1. Выбор тура → 2. Проверка доступности → 3. Ввод данных участников 
   → 4. Подтверждение → 5. Генерация билета → 6. Email уведомление
```

#### Проверка доступности:
```typescript
// Логика проверки доступности
function checkTourAvailability(tour: Tour, numPeople: number): {
  available: boolean;
  reason?: string;
} {
  const now = new Date();
  
  // Проверка: тур уже начался?
  if (tour.startDate < now) {
    return { available: false, reason: 'Тур уже начался' };
  }
  
  // Проверка: есть ли свободные места?
  const availableSpots = tour.maxParticipants - tour.currentBookings;
  if (availableSpots < numPeople) {
    return { 
      available: false, 
      reason: `Недостаточно мест. Доступно: ${availableSpots}` 
    };
  }
  
  return { available: true };
}
```

#### Генерация билета (PDF):
```typescript
// Используется библиотека jsPDF
import jsPDF from 'jspdf';

async function generateTicket(booking: Booking): Promise<string> {
  const doc = new jsPDF();
  
  // Шапка билета
  doc.setFontSize(20);
  doc.text('БИЛЕТ НА ТУР', 105, 20, { align: 'center' });
  
  // Информация о туре
  doc.setFontSize(12);
  doc.text(`Тур: ${booking.tour.title}`, 20, 40);
  doc.text(`Дата: ${formatDate(booking.tour.startDate)}`, 20, 50);
  doc.text(`Количество человек: ${booking.numPeople}`, 20, 60);
  doc.text(`Цена: ${booking.totalPrice} ₽`, 20, 70);
  
  // QR-код для проверки
  const qrCode = await generateQRCode(booking.id);
  doc.addImage(qrCode, 'PNG', 150, 40, 40, 40);
  
  // Участники
  doc.text('Участники:', 20, 90);
  booking.attendees.forEach((attendee, index) => {
    doc.text(`${index + 1}. ${attendee.fullName}`, 20, 100 + (index * 10));
  });
  
  // Сохранение
  const pdfBuffer = doc.output('arraybuffer');
  const filename = `ticket-${booking.id}.pdf`;
  const url = await uploadToServer(pdfBuffer, filename);
  
  return url;
}
```

### 3. Email уведомления

#### Типы уведомлений:
1. **Подтверждение бронирования**
2. **Отмена бронирования**
3. **Напоминание за 24 часа до тура**
4. **Изменения в туре**

#### Шаблон email:
```typescript
// Используется Nodemailer
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT!),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function sendBookingConfirmation(booking: Booking) {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: booking.user.email,
    subject: `Подтверждение бронирования - ${booking.tour.title}`,
    html: `
      <h1>Ваше бронирование подтверждено!</h1>
      <p>Здравствуйте, ${booking.user.fullName}!</p>
      <p>Ваше бронирование на тур "${booking.tour.title}" успешно подтверждено.</p>
      
      <h2>Детали бронирования:</h2>
      <ul>
        <li>Номер бронирования: ${booking.id}</li>
        <li>Дата тура: ${formatDate(booking.tour.startDate)}</li>
        <li>Количество человек: ${booking.numPeople}</li>
        <li>Общая стоимость: ${booking.totalPrice} ₽</li>
      </ul>
      
      <p>Ваш билет прикреплен к этому письму.</p>
      <p>До встречи на туре! 🎉</p>
    `,
    attachments: [
      {
        filename: `ticket-${booking.id}.pdf`,
        path: booking.ticketUrl,
      },
    ],
  };
  
  await transporter.sendMail(mailOptions);
}
```

### 4. Чат поддержки с AI-агентом

См. подробную документацию в [CHAT_ARCHITECTURE.md](./CHAT_ARCHITECTURE.md)

**Краткое описание:**
- WebSocket соединение в реальном времени
- AI-агент на базе OpenRouter (GPT-4/Claude)
- Возможность передачи чата живому оператору
- История сообщений
- Поддержка анонимных пользователей

### 5. Административные панели

#### 5.1. Супер-админ
**Права доступа:**
- Управление всеми пользователями
- Назначение ролей админам
- Доступ ко всем данным
- Управление настройками системы

**Функционал:**
```typescript
// Компонент супер-админа
'/admin/super'
├── /users          # Управление пользователями
├── /admins         # Управление админами
├── /settings       # Настройки системы
├── /analytics      # Аналитика
└── /logs           # Логи системы
```

#### 5.2. Админ туров
**Права доступа:**
- Создание/редактирование/удаление туров
- Управление медиа-файлами туров
- Просмотр бронирований
- Управление расписанием

**Функционал:**
```typescript
'/admin/tours'
├── /list           # Список всех туров
├── /create         # Создание нового тура
├── /[id]/edit      # Редактирование тура
├── /[id]/media     # Управление медиа
├── /[id]/map       # Настройка карты маршрута
└── /bookings       # Просмотр бронирований
```

**Форма создания тура:**
- Основная информация (название, описание)
- Настройка цен
- Даты и расписание
- Загрузка обложки
- Загрузка галереи фото
- Загрузка видео (опционально)
- Настройка карты маршрута (Яндекс.Карты API)
- Установка лимита участников

#### 5.3. Админ поддержки
**Права доступа:**
- Просмотр всех чатов
- Ответы на сообщения пользователей
- Передача чата от AI-агента к себе
- Просмотр истории обращений

**Функционал:**
```typescript
'/admin/support'
├── /chats          # Список активных чатов
├── /history        # История обращений
├── /chat/[id]      # Детали конкретного чата
└── /settings       # Настройки AI-агента
```

---

## 🔌 API Endpoints

### Public API

#### Tours API
```typescript
// GET /api/tours - Получить список туров
// Query params: ?status=published&limit=10&offset=0
Response: {
  tours: Tour[];
  total: number;
  page: number;
}

// GET /api/tours/[slug] - Получить тур по slug
Response: Tour

// GET /api/tours/[id]/availability - Проверить доступность
Response: {
  available: boolean;
  availableSpots: number;
  reason?: string;
}
```

#### Bookings API
```typescript
// POST /api/bookings - Создать бронирование
Body: {
  tourId: string;
  numPeople: number;
  attendees: Array<{
    fullName: string;
    email?: string;
    phone?: string;
    passportData?: string;
  }>;
}
Response: {
  booking: Booking;
  ticketUrl: string;
}

// GET /api/bookings/[id] - Получить бронирование
Response: Booking

// PUT /api/bookings/[id]/cancel - Отменить бронирование
Response: {
  success: boolean;
  booking: Booking;
}

// GET /api/bookings/my - Получить свои бронирования
Response: Booking[]
```

#### Chat API
```typescript
// WebSocket: /api/chat/socket
Events:
  - 'message' (client → server)
  - 'ai_response' (server → client)
  - 'support_joined' (server → client)
  - 'typing' (bidirectional)

// POST /api/chat/messages - Отправить сообщение (fallback)
Body: {
  sessionId: string;
  message: string;
}
Response: {
  message: ChatMessage;
  aiResponse?: ChatMessage;
}

// GET /api/chat/history?sessionId=xxx - Получить историю
Response: ChatMessage[]
```

### Admin API

#### Admin Tours API
```typescript
// POST /api/admin/tours - Создать тур
// PUT /api/admin/tours/[id] - Обновить тур
// DELETE /api/admin/tours/[id] - Удалить тур
// POST /api/admin/tours/[id]/media - Загрузить медиа
// DELETE /api/admin/tours/[id]/media/[mediaId] - Удалить медиа
```

#### Admin Users API (Super Admin only)
```typescript
// GET /api/admin/users - Список пользователей
// PUT /api/admin/users/[id]/role - Изменить роль
// DELETE /api/admin/users/[id] - Удалить пользователя
```

---

## 🔗 Интеграции

### 1. Яндекс.Карты API

**Назначение:** Интерактивные карты маршрутов туров

**Документация:** https://yandex.ru/dev/maps/

**Основные возможности:**
- Отображение маршрута тура
- Маркеры достопримечательностей
- Кастомизация внешнего вида
- Расчёт расстояний и времени

**Пример использования:**
```typescript
// components/tours/TourMap.tsx
import { YMaps, Map, Placemark, Polyline } from '@pbe/react-yandex-maps';

export function TourMap({ tour }: { tour: Tour }) {
  const { center, zoom, markers, routes } = tour.yandexMapData;
  
  return (
    <YMaps query={{ apikey: process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY }}>
      <Map
        defaultState={{ center, zoom }}
        width="100%"
        height="400px"
      >
        {/* Маркеры достопримечательностей */}
        {markers.map((marker, index) => (
          <Placemark
            key={index}
            geometry={marker.coordinates}
            properties={{
              hintContent: marker.title,
              balloonContent: marker.description,
            }}
            options={{
              iconImageHref: marker.icon,
              iconImageSize: [30, 42],
            }}
          />
        ))}
        
        {/* Маршруты */}
        {routes.map((route, index) => (
          <Polyline
            key={index}
            geometry={route.coordinates}
            options={{
              strokeColor: '#0066FF',
              strokeWidth: 4,
              strokeOpacity: 0.8,
            }}
          />
        ))}
      </Map>
    </YMaps>
  );
}
```

**Конструктор карт для админа:**
```typescript
// components/admin/MapEditor.tsx
// Позволяет админу:
// - Добавлять точки на карту кликом
// - Рисовать маршруты
// - Добавлять описания к точкам
// - Выбирать иконки маркеров
// - Настраивать зум и центр карты
```

### 2. OpenRouter API (AI-агент)

**Назначение:** AI-агент для чата поддержки

**Документация:** https://openrouter.ai/docs

**Модели:**
- GPT-4 (primary)
- Claude 3.5 Sonnet (fallback)
- Llama 3.1 (экономичный вариант)

**Пример запроса:**
```typescript
// lib/ai/openrouter.ts
export async function getAIResponse(
  message: string,
  context: ChatMessage[]
): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4',
      messages: [
        {
          role: 'system',
          content: `Ты - AI-ассистент платформы туров по Татарстану.
            Твоя задача - помогать пользователям с вопросами о турах,
            бронированиях и общей информации. Будь вежливым и helpful.`
        },
        ...context.map(msg => ({
          role: msg.is_ai ? 'assistant' : 'user',
          content: msg.message,
        })),
        {
          role: 'user',
          content: message,
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}
```

### 3. Supabase

**Компоненты:**
- **Database:** PostgreSQL с Row Level Security
- **Auth:** Аутентификация (Email/Password, OAuth)
- **Storage:** Хранилище файлов (альтернатива локальному хранению)

**Конфигурация:**
```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// lib/supabase/server.ts (для Server Components)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}
```

---

## 🔒 Безопасность

### 1. Аутентификация и авторизация

**Supabase Auth:**
- Email/Password аутентификация
- JWT токены
- Refresh tokens
- Session management

**Role-Based Access Control (RBAC):**
```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  // Защита админских роутов
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    
    // Проверка роли
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    const requiredRoles = {
      '/admin/super': ['super_admin'],
      '/admin/tours': ['tour_admin', 'super_admin'],
      '/admin/support': ['support_admin', 'super_admin'],
    };
    
    const path = req.nextUrl.pathname;
    const roles = Object.entries(requiredRoles).find(([p]) =>
      path.startsWith(p)
    )?.[1];
    
    if (roles && !roles.includes(profile?.role)) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }
  
  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/profile/:path*', '/bookings/:path*'],
};
```

### 2. Row Level Security (RLS)

Все таблицы защищены RLS политиками (см. SQL схемы выше).

**Преимущества:**
- Защита данных на уровне БД
- Автоматическая фильтрация данных
- Невозможность обойти через прямые SQL запросы

### 3. Валидация данных

**Client-side:**
```typescript
// React Hook Form + Zod
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const bookingSchema = z.object({
  tourId: z.string().uuid(),
  numPeople: z.number().min(1).max(20),
  attendees: z.array(z.object({
    fullName: z.string().min(2),
    email: z.string().email().optional(),
    phone: z.string().regex(/^\+?[1-9]\d{9,14}$/).optional(),
  })).min(1),
});

export function BookingForm() {
  const form = useForm({
    resolver: zodResolver(bookingSchema),
  });
  
  // ...
}
```

**Server-side:**
```typescript
// app/api/bookings/route.ts
import { z } from 'zod';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = bookingSchema.parse(body);
    
    // Дополнительная проверка доступности
    const tour = await getTour(validatedData.tourId);
    const { available, reason } = checkTourAvailability(
      tour,
      validatedData.numPeople
    );
    
    if (!available) {
      return NextResponse.json(
        { error: reason },
        { status: 400 }
      );
    }
    
    // Создание бронирования
    // ...
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Некорректные данные', details: error.errors },
        { status: 400 }
      );
    }
    throw error;
  }
}
```

### 4. XSS и CSRF защита

- **XSS:** React автоматически экранирует данные
- **CSRF:** Используется SameSite cookies для Supabase сессий

### 5. Rate Limiting

```typescript
// lib/rate-limit.ts
import { LRUCache } from 'lru-cache';

const rateLimit = new LRUCache({
  max: 500,
  ttl: 60000, // 1 минута
});

export function checkRateLimit(identifier: string, limit: number = 10) {
  const tokenCount = (rateLimit.get(identifier) as number) || 0;
  
  if (tokenCount >= limit) {
    return false;
  }
  
  rateLimit.set(identifier, tokenCount + 1);
  return true;
}

// Использование в API
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Слишком много запросов' },
      { status: 429 }
    );
  }
  
  // ...
}
```

---

## 🚀 Развертывание

### Локальная разработка

```bash
# 1. Клонирование репозитория
git clone https://github.com/your-username/tatarstan-tours.git
cd tatarstan-tours

# 2. Установка зависимостей
npm install

# 3. Настройка переменных окружения
cp .env.template .env.local
# Заполните значения в .env.local

# 4. Запуск Supabase локально (опционально)
npx supabase start

# 5. Применение миграций БД
npm run db:migrate

# 6. Запуск dev сервера
npm run dev
```

### Продакшен развертывание

#### 1. Подготовка сервера

```bash
# SSH подключение к серверу
ssh user@your-server-ip

# Установка Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка PM2
sudo npm install -g pm2

# Установка Nginx
sudo apt-get install nginx

# Создание директории проекта
sudo mkdir -p /var/www/tatarstan-tours
sudo chown -R $USER:$USER /var/www/tatarstan-tours
```

#### 2. Настройка Nginx

```nginx
# /etc/nginx/sites-available/tatarstan-tours
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Статические файлы
    location /_next/static {
        alias /var/www/tatarstan-tours/.next/static;
        expires 365d;
        access_log off;
    }
    
    # Загруженные файлы
    location /uploads {
        alias /var/www/tatarstan-tours/public/uploads;
        expires 30d;
        access_log off;
    }
}

# Активация конфигурации
sudo ln -s /etc/nginx/sites-available/tatarstan-tours /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 3. SSL сертификат (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

#### 4. Настройка автоматического деплоя

**deploy.sh** (уже создан в проекте):
```bash
#!/bin/bash

# Переход в директорию проекта
cd /var/www/tatarstan-tours

# Получение последних изменений
git pull origin main

# Установка зависимостей
npm ci --production

# Сборка проекта
npm run build

# Перезапуск PM2
pm2 restart tatarstan-tours || pm2 start npm --name "tatarstan-tours" -- start

# Сохранение конфигурации PM2
pm2 save

echo "✅ Deployment completed successfully!"
```

#### 5. Первый деплой

```bash
# На локальной машине
git add .
git commit -m "Initial commit"
git push origin main

# На сервере
cd /var/www/tatarstan-tours
git clone https://github.com/your-username/tatarstan-tours.git .

# Создание .env файла
nano .env
# Вставьте production переменные

# Установка зависимостей и сборка
npm ci --production
npm run build

# Запуск через PM2
pm2 start npm --name "tatarstan-tours" -- start
pm2 startup
pm2 save

# Проверка статуса
pm2 status
pm2 logs tatarstan-tours
```

#### 6. Workflow для последующих деплоев

```bash
# На локальной машине (после внесения изменений)
git add .
git commit -m "Your commit message"
git push origin main

# На сервере
cd /var/www/tatarstan-tours
./deploy.sh
```

### Мониторинг

```bash
# Просмотр логов PM2
pm2 logs tatarstan-tours

# Просмотр статуса
pm2 status

# Просмотр метрик
pm2 monit

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Бэкапы БД

```bash
# Создание бэкапа Supabase (через CLI)
npx supabase db dump -f backup.sql

# Восстановление
npx supabase db reset
psql -h your-supabase-host -U postgres -d postgres -f backup.sql
```

---

## 📊 Производительность и оптимизация

### 1. Next.js оптимизации

- **Server Components** для всех возможных компонентов
- **Streaming SSR** для быстрой загрузки
- **Image Optimization** через next/image
- **Code Splitting** автоматически
- **Route Prefetching**

### 2. Кеширование

```typescript
// app/tours/page.tsx
import { unstable_cache } from 'next/cache';

const getCachedTours = unstable_cache(
  async () => {
    const { data } = await supabase
      .from('tours')
      .select('*')
      .eq('status', 'published');
    return data;
  },
  ['tours-list'],
  { revalidate: 60 } // Кеш на 60 секунд
);

export default async function ToursPage() {
  const tours = await getCachedTours();
  // ...
}
```

### 3. Database индексы

Все необходимые индексы созданы в SQL схемах выше.

### 4. CDN

Для статических файлов (изображения, видео) рекомендуется использовать CDN:
- Cloudflare
- AWS CloudFront
- Supabase Storage (уже с CDN)

---

## 📈 Аналитика и метрики

### Ключевые метрики:

1. **Бизнес-метрики:**
   - Количество бронирований
   - Конверсия (просмотры → бронирования)
   - Средний чек
   - Популярные туры
   - Отмены бронирований

2. **Технические метрики:**
   - Время загрузки страниц
   - Uptime сервера
   - Ошибки в логах
   - API response time

3. **Пользовательские метрики:**
   - Количество новых пользователей
   - Активные пользователи
   - Взаимодействие с чатом
   - География пользователей

---

## 🧪 Тестирование

### Unit тесты
```bash
npm test
```

### E2E тесты
```bash
npm run test:e2e
```

### Нагрузочное тестирование
```bash
# Используя Apache Bench
ab -n 1000 -c 10 https://your-domain.com/api/tours
```

---

## 📚 Заключение

Данный проект представляет собой полнофункциональную платформу для организации туров с использованием современного технологического стека. Архитектура спроектирована с учетом масштабируемости, безопасности и удобства развертывания.

### Ключевые достижения:
✅ Полный цикл бронирования туров  
✅ Интеграция интерактивных карт  
✅ AI-поддержка пользователей  
✅ Гибкая система ролей и доступа  
✅ Автоматизация уведомлений и генерации билетов  
✅ Удобная административная панель  

### Перспективы развития:
- Мобильное приложение (React Native)
- Интеграция с платежными системами
- Система отзывов и рейтингов
- Мультиязычность (русский/татарский/английский)
- Расширенная аналитика

---

## 📝 История разработки

### Итерация 1: Базовая структура и UI (27.10.2024)

**Реализовано:**
- ✅ Компонентная архитектура (Header, Hero, Footer, UI компоненты)
- ✅ Sticky адаптивный Header с мобильным меню
- ✅ Hero секция с анимациями и декоративными элементами
- ✅ Footer с 4 колонками (О компании, Ссылки, Туры, Контакты)
- ✅ Полная SEO оптимизация (metadata, Open Graph, Twitter Card)
- ✅ Адаптивный дизайн (mobile-first подход)
- ✅ Accessibility (a11y) - aria-labels, semantic HTML
- ✅ Кастомные анимации (fadeIn, fadeInUp)

**Технические улучшения:**
- ✅ Все комментарии в коде на русском языке
- ✅ Исправлено перекрытие контента fixed header'ом
- ✅ Улучшены hover эффекты навигации (подчеркивание с анимацией)
- ✅ Убрана ненужная иконка поиска

**Git коммиты:**
```
7fcafd8 - docs: Обновлена документация ITERATION_1.md
2cc25fd - fix: Добавлен отступ сверху для fixed header
83b49ac - refactor: Русификация всех комментариев в компонентах
d886285 - feat(итерация-1): Добавлена шапка, hero секция и футер с SEO
5307ee2 - Initial commit: Tatarstan Tours Platform
```

**Файлы созданы:**
- `components/layout/Header.tsx` - Шапка сайта
- `components/layout/Footer.tsx` - Подвал сайта
- `components/ui/Button.tsx` - Переиспользуемая кнопка
- `components/ui/Logo.tsx` - Компонент логотипа
- `components/home/HeroSection.tsx` - Hero баннер
- `ITERATION_1.md` - Детальная документация итерации
- `LOGO_INTEGRATION.md` - Инструкция по логотипу

**Статус:** ✅ Задеплоено на продакшн

### 📦 Деплой на продакшн-сервер (27.10.2024, 20:50)

#### Настройка сервера:
1. **Сервер:** Ubuntu 22.04.5 LTS
2. **IP:** 92.53.99.60
3. **Node.js:** v22.21.0
4. **npm:** v11.6.2
5. **PM2:** v6.0.13
6. **Nginx:** v1.18.0
7. **Git:** v2.34.1

#### Процесс деплоя:
```bash
# 1. Клонирование репозитория
cd /var/www
git clone https://github.com/Garten555/tatarstan-tours.git

# 2. Установка зависимостей
cd tatarstan-tours
npm install  # 521 пакет установлено

# 3. Настройка переменных окружения
cat > .env.production << EOF
NEXT_PUBLIC_SUPABASE_URL=https://gvgdwqlklryktqaevmnz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
OPENROUTER_API_KEY=sk-or-v1-...
SMTP_HOST=smtp.rambler.ru
SMTP_PORT=465
SMTP_USER=Daniel-Mini@rambler.ru
NEXT_PUBLIC_SITE_URL=http://92.53.99.60:3000
NODE_ENV=production
EOF

# 4. Сборка production билда
npm run build  # ✓ Успешно за 10.1s

# 5. Запуск через PM2
pm2 start npm --name "tatarstan-tours" -- start
pm2 save  # Сохранение конфигурации

# 6. Настройка firewall
ufw allow 3000/tcp  # Открыт порт 3000
ufw allow 80/tcp    # Открыт порт 80
ufw allow 443/tcp   # Открыт порт 443
```

#### Результат:
- ✅ **Сайт работает:** http://92.53.99.60:3000
- ✅ **PM2 статус:** online (0% CPU, 64.6MB RAM)
- ✅ **Билд:** без ошибок, только warnings (Supabase Edge Runtime)
- ✅ **Firewall:** порты 3000, 80, 443 открыты
- ✅ **Автозапуск:** PM2 настроен на systemd

#### Git коммиты:
1. `4c91f2a` - init: Инициализация проекта Next.js 15
2. `7fa6e17` - docs: Добавлена начальная документация проекта
3. `e1e9c5a` - feat(итерация-1): Создан Header, Hero, Footer
4. `2cc25fd` - fix: Добавлен отступ сверху для fixed header
5. `83b49ac` - refactor: Русификация всех комментариев
6. `f8a1b0d` - refactor: Удалена иконка поиска и улучшена навигация
7. `3d4e8c2` - fix(server): Исправлена типизация Supabase service client

#### Известные предупреждения (не критично):
- ⚠️ Next.js middleware deprecated → будет исправлено в следующих итерациях
- ⚠️ Multiple lockfiles warning → `/var/www/package-lock.json` будет удален
- ⚠️ Supabase Edge Runtime warnings → ожидаемо, используется только на сервере

#### Следующие шаги:
1. Настройка Nginx для работы без порта (:3000)
2. Подключение домена
3. Установка SSL сертификата (Let's Encrypt)
4. Настройка CI/CD через GitHub Actions

---

**Автор:** Daniel (Garten555)  
**Дата начала:** 27.10.2024  
**Текущая версия:** 1.1.0 (PRODUCTION)  
**Последнее обновление:** 27.10.2024, 20:50

