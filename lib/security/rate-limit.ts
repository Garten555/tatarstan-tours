// Rate limiting для защиты от атак
import { NextRequest } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Очистка старых записей каждые 5 минут
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    Object.keys(store).forEach((key) => {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    });
  }, 5 * 60 * 1000);
}

export interface RateLimitOptions {
  windowMs: number; // Время окна в миллисекундах
  maxRequests: number; // Максимальное количество запросов
}

export function rateLimit(
  request: NextRequest,
  options: RateLimitOptions = { windowMs: 60000, maxRequests: 100 }
): { success: boolean; remaining: number; resetTime: number } {
  const ip = (request as any).ip || 
    request.headers.get('x-forwarded-for')?.split(',')[0] || 
    request.headers.get('x-real-ip') || 
    'unknown';

  const key = `rate_limit_${ip}`;
  const now = Date.now();
  
  // Получаем или создаем запись
  let record = store[key];
  
  if (!record || record.resetTime < now) {
    // Создаем новую запись
    record = {
      count: 1,
      resetTime: now + options.windowMs,
    };
    store[key] = record;
    return {
      success: true,
      remaining: options.maxRequests - 1,
      resetTime: record.resetTime,
    };
  }
  
  // Увеличиваем счетчик
  record.count++;
  
  if (record.count > options.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }
  
  return {
    success: true,
    remaining: options.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}





