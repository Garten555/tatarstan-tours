/**
 * Безопасный парсинг JSON из Response
 * Обрабатывает случаи, когда сервер возвращает HTML или текст вместо JSON
 */
export async function safeJsonParse<T = any>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  
  // Проверяем, что ответ действительно JSON
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Ожидался JSON, но получен ${contentType}. Ответ: ${text.substring(0, 100)}`);
  }
  
  try {
    const text = await response.text();
    if (!text.trim()) {
      throw new Error('Пустой ответ от сервера');
    }
    return JSON.parse(text) as T;
  } catch (error: any) {
    // Если парсинг не удался, пытаемся получить текст ошибки
    const text = await response.clone().text();
    throw new Error(`Ошибка парсинга JSON: ${error.message}. Ответ сервера: ${text.substring(0, 200)}`);
  }
}

/**
 * Безопасный fetch с обработкой ошибок
 */
export async function safeFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ data: T; response: Response }> {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    // Пытаемся получить JSON ошибки, если возможно
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch {
      // Если не JSON, используем статус
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await safeJsonParse<T>(response);
  return { data, response };
}

