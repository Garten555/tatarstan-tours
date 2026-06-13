import { readImageDimensionsFromBuffer } from '@/lib/images/profile-cover';

/** Правила для аватара профиля */
export const PROFILE_AVATAR_MIN_WIDTH = 200;
export const PROFILE_AVATAR_MIN_HEIGHT = 200;
export const PROFILE_AVATAR_MAX_WIDTH = 4096;
export const PROFILE_AVATAR_MAX_HEIGHT = 4096;

export const PROFILE_AVATAR_SIZE_HINT = `Минимум ${PROFILE_AVATAR_MIN_WIDTH}×${PROFILE_AVATAR_MIN_HEIGHT} px, максимум ${PROFILE_AVATAR_MAX_WIDTH}×${PROFILE_AVATAR_MAX_HEIGHT} px`;

export function validateAvatarDimensions(width: number, height: number): string | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 'Не удалось определить размер изображения';
  }

  if (width < PROFILE_AVATAR_MIN_WIDTH || height < PROFILE_AVATAR_MIN_HEIGHT) {
    return `Аватар: минимум ${PROFILE_AVATAR_MIN_WIDTH}×${PROFILE_AVATAR_MIN_HEIGHT} px (выбрано ${width}×${height})`;
  }

  if (width > PROFILE_AVATAR_MAX_WIDTH || height > PROFILE_AVATAR_MAX_HEIGHT) {
    return `Аватар: максимум ${PROFILE_AVATAR_MAX_WIDTH}×${PROFILE_AVATAR_MAX_HEIGHT} px`;
  }

  return null;
}

export async function validateAvatarImageBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<string | null> {
  const dims = readImageDimensionsFromBuffer(buffer, mimeType);
  if (!dims) {
    return 'Не удалось определить размер изображения';
  }
  return validateAvatarDimensions(dims.width, dims.height);
}
