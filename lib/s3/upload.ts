// Утилиты для загрузки файлов в S3
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_CONFIG } from './client';

/**
 * Загружает файл в S3
 * @param file - Файл для загрузки
 * @param path - Путь в бакете (например: 'tours/covers/image.jpg')
 * @returns URL загруженного файла
 */
export async function uploadFileToS3(
  file: File | Buffer,
  path: string
): Promise<string> {
  try {
    let buffer: Buffer;
    let contentType: string;

    // Если это File объект
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      contentType = file.type;
    } else {
      // Если это уже Buffer
      buffer = file;
      contentType = 'application/octet-stream';
    }

    // Команда для загрузки файла
    const command = new PutObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: path,
      Body: buffer,
      ContentType: contentType,
      // Делаем файл публично доступным
      ACL: 'public-read',
    });

    await s3Client.send(command);

    // Возвращаем публичный URL файла
    const publicUrl = `${S3_CONFIG.publicUrl}/${S3_CONFIG.bucket}/${path}`;
    return publicUrl;
  } catch (error) {
    console.error('Ошибка загрузки файла в S3:', error);
    throw new Error('Не удалось загрузить файл в S3');
  }
}

/**
 * Удаляет файл из S3
 * @param path - Путь к файлу в бакете
 */
export async function deleteFileFromS3(path: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: path,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('Ошибка удаления файла из S3:', error);
    throw new Error('Не удалось удалить файл из S3');
  }
}

/**
 * Генерирует временный URL для приватного файла
 * @param path - Путь к файлу в бакете
 * @param expiresIn - Время жизни URL в секундах (по умолчанию 3600 = 1 час)
 * @returns Временный подписанный URL
 */
export async function getPresignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: path,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Ошибка генерации подписанного URL:', error);
    throw new Error('Не удалось сгенерировать URL');
  }
}

/**
 * Генерирует уникальное имя файла
 * @param originalName - Оригинальное имя файла
 * @returns Уникальное имя с timestamp
 */
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `${timestamp}-${randomString}.${extension}`;
}

/**
 * Получает путь для загрузки файла в зависимости от типа
 * @param type - Тип файла ('tour-cover', 'tour-gallery', 'tour-video', 'avatar')
 * @param fileName - Имя файла
 * @returns Путь в бакете
 */
export function getS3Path(
  type: 'tour-cover' | 'tour-gallery' | 'tour-video' | 'avatar',
  fileName: string
): string {
  const paths = {
    'tour-cover': `tours/covers/${fileName}`,
    'tour-gallery': `tours/gallery/${fileName}`,
    'tour-video': `tours/videos/${fileName}`,
    avatar: `users/avatars/${fileName}`,
  };

  return paths[type];
}

