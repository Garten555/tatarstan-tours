// Валидация iframe URL для защиты от XSS
export function isValidIframeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  // Разрешенные домены для iframe
  const allowedDomains = [
    'yandex.ru',
    'yandex.com',
    'maps.yandex.ru',
    'yandex.com.tr',
    '2gis.ru',
    '2gis.com',
    'google.com',
    'google.ru',
    'maps.google.com',
  ];
  
  try {
    // Если это HTML с iframe, извлекаем src
    if (url.includes('<iframe')) {
      const srcMatch = url.match(/src=["']([^"']+)["']/i);
      if (!srcMatch) return false;
      url = srcMatch[1];
    }
    
    // Проверяем URL
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Проверяем, что домен разрешен
    const isAllowed = allowedDomains.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
    
    if (!isAllowed) return false;
    
    // Проверяем протокол (только https или относительные пути)
    if (urlObj.protocol && !['https:', 'http:'].includes(urlObj.protocol)) {
      return false;
    }
    
    return true;
  } catch (error) {
    // Если URL невалидный, возвращаем false
    return false;
  }
}

export function sanitizeIframeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  if (!isValidIframeUrl(url)) {
    return null;
  }
  
  // Если это HTML с iframe, возвращаем как есть (уже проверено)
  if (url.includes('<iframe')) {
    return url;
  }
  
  // Если это просто URL, оборачиваем в iframe с безопасными атрибутами
  return `<iframe src="${url}" frameborder="0" allowfullscreen sandbox="allow-scripts allow-same-origin allow-popups allow-forms" style="width: 100%; height: 100%; border: 0;"></iframe>`;
}

















