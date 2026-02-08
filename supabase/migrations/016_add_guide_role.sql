-- Миграция: Добавление роли 'guide' в enum user_role
-- Migration 016: Add 'guide' role to user_role enum

-- Добавляем новое значение в enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'guide';

-- Комментарий для документации
COMMENT ON TYPE user_role IS 'Роли пользователей: user, tour_admin, support_admin, super_admin, guide';





















