// S3 клиент для работы с Timeweb Cloud Storage
import { S3Client } from '@aws-sdk/client-s3';

// Проверяем наличие всех необходимых переменных окружения
if (!process.env.S3_ENDPOINT) {
  throw new Error('S3_ENDPOINT не задан в переменных окружения');
}

if (!process.env.S3_ACCESS_KEY) {
  throw new Error('S3_ACCESS_KEY не задан в переменных окружения');
}

if (!process.env.S3_SECRET_KEY) {
  throw new Error('S3_SECRET_KEY не задан в переменных окружения');
}

if (!process.env.S3_BUCKET) {
  throw new Error('S3_BUCKET не задан в переменных окружения');
}

if (!process.env.S3_REGION) {
  throw new Error('S3_REGION не задан в переменных окружения');
}

// Создаём S3 клиент для Timeweb
export const s3Client = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  // Для совместимости с S3-like хранилищами
  forcePathStyle: true,
});

// Экспортируем константы для удобства
export const S3_CONFIG = {
  bucket: process.env.S3_BUCKET,
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  publicUrl: process.env.NEXT_PUBLIC_S3_PUBLIC_URL || process.env.S3_ENDPOINT,
};

