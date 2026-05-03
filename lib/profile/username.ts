/** Согласовано с app/api/profile/check-username и app/api/profile/update */

export const USERNAME_RESERVED_WORDS = [
  'admin',
  'administrator',
  'moderator',
  'support',
  'api',
  'www',
  'mail',
  'ftp',
  'root',
  'system',
  'test',
  'null',
  'undefined',
  'true',
  'false',
  'new',
  'edit',
  'delete',
  'create',
  'update',
  'settings',
  'profile',
  'user',
  'users',
  'tour',
  'tours',
  'booking',
  'bookings',
  'diary',
  'diaries',
  'passport',
  'auth',
  'login',
  'logout',
  'register',
  'signup',
  'signin',
  'signout',
  'password',
  'reset',
  'verify',
  'confirm',
  'activate',
  'deactivate',
  'ban',
  'unban',
  'block',
  'unblock',
] as const;

/** Очистка ввода по тем же правилам, что на странице настроек профиля */
export function sanitizeUsernameInput(value: string): string {
  let cleanValue = value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  cleanValue = cleanValue.replace(/^[-_]+|[-_]+$/g, '');
  cleanValue = cleanValue.replace(/[-_]{2,}/g, (match) => match[0]);
  return cleanValue;
}

/** Локальная проверка формата; null = ок */
export function validateUsernameFormat(value: string): string | null {
  if (!value) {
    return 'Укажите ник';
  }
  if (value.length < 3) {
    return 'Ник должен содержать минимум 3 символа';
  }
  if (value.length > 30) {
    return 'Ник не может быть длиннее 30 символов';
  }
  const usernameRegex = /^[a-z0-9_-]+$/;
  if (!usernameRegex.test(value)) {
    return 'Используйте только латиницу, цифры, дефисы (-) и подчёркивания (_)';
  }
  if (/^[-_]|[-_]$/.test(value)) {
    return 'Ник не может начинаться или заканчиваться дефисом или подчёркиванием';
  }
  if (/[-_]{2,}/.test(value)) {
    return 'Ник не может содержать два дефиса или подчёркивания подряд';
  }
  const lower = value.toLowerCase();
  if ((USERNAME_RESERVED_WORDS as readonly string[]).includes(lower)) {
    return 'Этот ник зарезервирован';
  }
  return null;
}

/** Защита от открытого редиректа: только относительный путь приложения */
export function safeInternalRedirect(raw: string | null | undefined, fallback = '/passport'): string {
  if (!raw || typeof raw !== 'string') return fallback;
  const t = raw.trim();
  if (!t.startsWith('/') || t.startsWith('//')) return fallback;
  return t;
}
