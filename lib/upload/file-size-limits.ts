/** Изображения — жёсткий лимит для всех загрузок */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Видео в дневниках, комнатах туров, блоге */
export const MAX_USER_VIDEO_BYTES = 100 * 1024 * 1024;

/** Видео тура в админке (обложки/галерея остаются по лимиту изображений) */
export const MAX_TOUR_ADMIN_VIDEO_BYTES = 500 * 1024 * 1024;

export function formatMaxMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return Number.isInteger(mb) ? `${mb} МБ` : `${mb.toFixed(0)} МБ`;
}

/** Лимит видео по папке S3 (tours/* — только админские видео тура). */
export function maxVideoBytesForFolder(folder: string | null | undefined): number {
  if (folder?.startsWith('tours/')) {
    return MAX_TOUR_ADMIN_VIDEO_BYTES;
  }
  return MAX_USER_VIDEO_BYTES;
}
