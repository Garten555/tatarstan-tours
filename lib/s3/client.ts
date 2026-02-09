// S3 клиент для работы с Timeweb Cloud Storage
import { S3Client } from '@aws-sdk/client-s3';

// Функция для проверки переменных окружения (вызывается только при использовании)
function validateS3Config() {
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
}

// Ленивая инициализация клиента (только при использовании)
let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_s3Client) {
    validateS3Config();
    _s3Client = new S3Client({
      region: process.env.S3_REGION!,
      endpoint: process.env.S3_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
      // Для совместимости с S3-like хранилищами
      forcePathStyle: true,
    });
  }
  return _s3Client;
}

// Экспортируем клиент через геттер
export const s3Client = new Proxy({} as S3Client, {
  get(_target, prop) {
    return getS3Client()[prop as keyof S3Client];
  },
});

// Функция для получения конфигурации (с проверкой)
function getS3Config() {
  validateS3Config();
  return {
    bucket: process.env.S3_BUCKET!,
    region: process.env.S3_REGION!,
    endpoint: process.env.S3_ENDPOINT!,
    publicUrl: process.env.NEXT_PUBLIC_S3_PUBLIC_URL || process.env.S3_ENDPOINT!,
  };
}

// Экспортируем конфигурацию через геттер
export const S3_CONFIG = new Proxy({} as ReturnType<typeof getS3Config>, {
  get(_target, prop) {
    return getS3Config()[prop as keyof ReturnType<typeof getS3Config>];
  },
});

