-- Миграция 040: Настройки приватности для подписок и друзей
-- Migration 040: Privacy settings for follows and friends
-- Дата: Январь 2025

-- ==========================================
-- 1. ДОБАВЛЕНИЕ ПОЛЕЙ В USER_MESSAGE_PRIVACY
-- ==========================================

-- Добавляем поля для контроля подписок и друзей
ALTER TABLE user_message_privacy 
  ADD COLUMN IF NOT EXISTS who_can_follow TEXT NOT NULL DEFAULT 'everyone' 
    CHECK (who_can_follow IN ('everyone', 'friends', 'nobody')),
  ADD COLUMN IF NOT EXISTS who_can_add_friend TEXT NOT NULL DEFAULT 'everyone' 
    CHECK (who_can_add_friend IN ('everyone', 'friends', 'nobody')),
  ADD COLUMN IF NOT EXISTS who_can_view_gallery TEXT NOT NULL DEFAULT 'everyone' 
    CHECK (who_can_view_gallery IN ('everyone', 'followers', 'friends', 'nobody'));

-- Комментарии
COMMENT ON COLUMN user_message_privacy.who_can_follow IS 'Кто может подписаться: everyone (все), friends (только друзья), nobody (никто)';
COMMENT ON COLUMN user_message_privacy.who_can_add_friend IS 'Кто может добавить в друзья: everyone (все), friends (только друзья), nobody (никто)';
COMMENT ON COLUMN user_message_privacy.who_can_view_gallery IS 'Кто может просматривать галерею: everyone (все), followers (подписчики), friends (только друзья), nobody (никто)';

-- Обновляем существующие записи дефолтными значениями
UPDATE user_message_privacy 
SET 
  who_can_follow = 'everyone',
  who_can_add_friend = 'everyone',
  who_can_view_gallery = 'everyone'
WHERE who_can_follow IS NULL OR who_can_add_friend IS NULL OR who_can_view_gallery IS NULL;

