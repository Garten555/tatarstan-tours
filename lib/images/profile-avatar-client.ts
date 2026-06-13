import { validateAvatarDimensions } from '@/lib/images/profile-avatar';
import { loadImageDimensionsFromFile } from '@/lib/images/profile-cover-client';

export async function validateAvatarImageFile(file: File): Promise<string | null> {
  try {
    const { width, height } = await loadImageDimensionsFromFile(file);
    return validateAvatarDimensions(width, height);
  } catch {
    return 'Не удалось прочитать изображение';
  }
}
