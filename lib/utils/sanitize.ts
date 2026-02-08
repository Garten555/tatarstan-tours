/**
 * Утилиты для защиты от XSS атак
 * Санитизация HTML и текстовых данных
 */

/**
 * Экранирует HTML символы для безопасного отображения
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
  };
  
  return String(text).replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Санитизирует текст, удаляя потенциально опасные символы
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  
  return escapeHtml(text)
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/<script/gi, '&lt;script')
    .replace(/<\/script>/gi, '&lt;/script&gt;')
    .trim();
}

/**
 * Безопасно обрезает текст до указанной длины
 */
export function safeTruncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return '';
  const sanitized = sanitizeText(text);
  if (sanitized.length <= maxLength) return sanitized;
  return sanitized.slice(0, maxLength) + '...';
}

/**
 * Валидирует URL для безопасного использования
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    // Разрешаем только http и https протоколы
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Безопасно извлекает текст из HTML (удаляет все теги)
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}





















