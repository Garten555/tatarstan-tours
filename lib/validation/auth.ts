// Утилиты для валидации авторизации

/**
 * Список разрешённых email провайдеров
 */
const ALLOWED_EMAIL_PROVIDERS = [
  'gmail.com',
  'yandex.ru',
  'yandex.com',
  'ya.ru',
  'mail.ru',
  'inbox.ru',
  'list.ru',
  'bk.ru',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'rambler.ru',
];

/**
 * Проверяет, является ли email провайдер разрешённым
 */
export function isAllowedEmailProvider(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_EMAIL_PROVIDERS.includes(domain);
}

/**
 * Валидация email
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) {
    return { valid: false, error: 'Email обязателен' };
  }

  // Базовая проверка формата
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Некорректный формат email' };
  }

  // Проверка разрешённого провайдера
  if (!isAllowedEmailProvider(email)) {
    const domain = email.split('@')[1];
    return {
      valid: false,
      error: `Используйте email от: ${ALLOWED_EMAIL_PROVIDERS.slice(0, 5).join(', ')} и др.`,
    };
  }

  return { valid: true };
}

/**
 * Проверка наличия русских символов
 */
export function hasRussianCharacters(text: string): boolean {
  return /[а-яА-ЯёЁ]/.test(text);
}

/**
 * Валидация пароля
 */
export function validatePassword(password: string): {
  valid: boolean;
  error?: string;
  strength: 'weak' | 'medium' | 'strong';
  strengthPercentage: number;
} {
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  let strengthPercentage = 0;

  if (!password) {
    return { valid: false, error: 'Пароль обязателен', strength: 'weak', strengthPercentage: 0 };
  }

  // Проверка на русские символы
  if (hasRussianCharacters(password)) {
    return {
      valid: false,
      error: 'Пароль не может содержать русские буквы',
      strength: 'weak',
      strengthPercentage: 0,
    };
  }

  // Минимальная длина
  if (password.length < 8) {
    return {
      valid: false,
      error: 'Пароль должен содержать минимум 8 символов',
      strength: 'weak',
      strengthPercentage: Math.min((password.length / 8) * 30, 30),
    };
  }

  // Расчёт силы пароля
  let score = 0;

  // Длина (макс 30 баллов)
  score += Math.min(password.length * 2, 30);

  // Строчные буквы (20 баллов)
  if (/[a-z]/.test(password)) score += 20;

  // Заглавные буквы (20 баллов)
  if (/[A-Z]/.test(password)) score += 20;

  // Цифры (15 баллов)
  if (/\d/.test(password)) score += 15;

  // Специальные символы (15 баллов)
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;

  strengthPercentage = Math.min(score, 100);

  // Определение уровня силы
  if (score < 50) {
    strength = 'weak';
  } else if (score < 80) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  return { valid: true, strength, strengthPercentage };
}

/**
 * Получить текст для индикатора силы пароля
 */
export function getPasswordStrengthText(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return 'Слабый пароль';
    case 'medium':
      return 'Средний пароль';
    case 'strong':
      return 'Надёжный пароль';
  }
}

/**
 * Получить цвет для индикатора силы пароля
 */
export function getPasswordStrengthColor(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return 'bg-red-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'strong':
      return 'bg-green-500';
  }
}

