-- Tatarstan Tours Database Schema
-- Migration 001: Initial Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- ENUMS
-- ==========================================

-- User roles
CREATE TYPE user_role AS ENUM ('user', 'tour_admin', 'support_admin', 'super_admin');

-- Tour status
CREATE TYPE tour_status AS ENUM ('draft', 'published', 'archived');

-- Media types
CREATE TYPE media_type AS ENUM ('image', 'video');

-- Booking status
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- ==========================================
-- TABLES
-- ==========================================

-- 1. Profiles (User profiles)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT, -- Отчество (опционально)
  phone TEXT,
  role user_role DEFAULT 'user',
  avatar_url TEXT, -- URL аватарки в S3
  avatar_path TEXT, -- Путь к аватарке в S3 (для удаления при замене)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tours
CREATE TABLE tours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  short_desc TEXT,
  full_desc TEXT,
  cover_image TEXT, -- URL обложки в S3
  cover_path TEXT, -- Путь к обложке в S3 (для удаления при замене)
  price_per_person DECIMAL(10, 2) NOT NULL CHECK (price_per_person > 0),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 20 CHECK (max_participants > 0),
  current_bookings INTEGER DEFAULT 0 CHECK (current_bookings >= 0),
  yandex_map_data JSONB,
  status tour_status DEFAULT 'draft',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_dates CHECK (end_date > start_date),
  CONSTRAINT valid_bookings CHECK (current_bookings <= max_participants)
);

-- 3. Tour Media
CREATE TABLE tour_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  media_type media_type NOT NULL,
  media_url TEXT NOT NULL, -- URL медиа в S3
  media_path TEXT, -- Путь к медиа в S3 (для удаления)
  thumbnail_url TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  tour_id UUID NOT NULL REFERENCES tours(id),
  booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  num_people INTEGER NOT NULL CHECK (num_people > 0),
  total_price DECIMAL(10, 2) NOT NULL CHECK (total_price > 0),
  status booking_status DEFAULT 'pending',
  ticket_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Booking Attendees
CREATE TABLE booking_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  email TEXT,
  phone TEXT,
  passport_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Chat Messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  session_id TEXT NOT NULL,
  message TEXT NOT NULL,
  is_ai BOOLEAN DEFAULT FALSE,
  is_support BOOLEAN DEFAULT FALSE,
  support_admin_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- INDEXES
-- ==========================================

-- Tours
CREATE INDEX idx_tours_status ON tours(status);
CREATE INDEX idx_tours_dates ON tours(start_date, end_date);
CREATE INDEX idx_tours_slug ON tours(slug);
CREATE INDEX idx_tours_created_by ON tours(created_by);

-- Tour Media
CREATE INDEX idx_tour_media_tour_id ON tour_media(tour_id, order_index);

-- Bookings
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_tour_id ON bookings(tour_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(booking_date);

-- Booking Attendees
CREATE INDEX idx_booking_attendees_booking_id ON booking_attendees(booking_id);

-- Chat Messages
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tour_admin', 'support_admin', 'super_admin')
    )
  );

-- Tours Policies
CREATE POLICY "Anyone can view published tours"
  ON tours FOR SELECT
  USING (status = 'published' OR auth.uid() IS NOT NULL);

CREATE POLICY "Tour admins can manage tours"
  ON tours FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tour_admin', 'super_admin')
    )
  );

-- Tour Media Policies
CREATE POLICY "Anyone can view media of published tours"
  ON tour_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tours
      WHERE tours.id = tour_media.tour_id
      AND tours.status = 'published'
    )
  );

CREATE POLICY "Tour admins can manage media"
  ON tour_media FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tour_admin', 'super_admin')
    )
  );

-- Bookings Policies
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tour_admin', 'support_admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update bookings"
  ON bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tour_admin', 'support_admin', 'super_admin')
    )
  );

-- Booking Attendees Policies
CREATE POLICY "Users can view own booking attendees"
  ON booking_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_attendees.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add attendees to own bookings"
  ON booking_attendees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_attendees.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- Chat Messages Policies
CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Support admins can view all messages"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('support_admin', 'super_admin')
    )
  );

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tours_updated_at
  BEFORE UPDATE ON tours
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Update tour bookings count
CREATE OR REPLACE FUNCTION update_tour_bookings()
RETURNS TRIGGER AS $$
BEGIN
  -- При создании или изменении статуса на confirmed
  IF (TG_OP = 'INSERT' AND NEW.status = 'confirmed') THEN
    UPDATE tours
    SET current_bookings = current_bookings + NEW.num_people
    WHERE id = NEW.tour_id;
  
  -- При изменении статуса с pending на confirmed
  ELSIF (TG_OP = 'UPDATE' AND OLD.status != 'confirmed' AND NEW.status = 'confirmed') THEN
    UPDATE tours
    SET current_bookings = current_bookings + NEW.num_people
    WHERE id = NEW.tour_id;
  
  -- При отмене бронирования
  ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status = 'cancelled') THEN
    UPDATE tours
    SET current_bookings = GREATEST(0, current_bookings - OLD.num_people)
    WHERE id = OLD.tour_id;
  
  -- При удалении подтвержденного бронирования
  ELSIF (TG_OP = 'DELETE' AND OLD.status = 'confirmed') THEN
    UPDATE tours
    SET current_bookings = GREATEST(0, current_bookings - OLD.num_people)
    WHERE id = OLD.tour_id;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for booking status changes
CREATE TRIGGER booking_status_change
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_tour_bookings();

-- Function: Create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Имя'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Фамилия'),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- SEED DATA (optional - for testing)
-- ==========================================

-- Insert a test admin user (you'll need to create this user in Supabase Auth first)
-- UPDATE profiles SET role = 'super_admin' WHERE email = 'admin@tatarstan-tours.ru';

