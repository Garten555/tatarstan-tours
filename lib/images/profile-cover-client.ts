import { validateCoverDimensions } from '@/lib/images/profile-cover';

export function loadImageDimensionsFromFile(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось прочитать изображение'));
    };
    img.src = url;
  });
}

export async function validateCoverImageFile(file: File): Promise<string | null> {
  try {
    const { width, height } = await loadImageDimensionsFromFile(file);
    return validateCoverDimensions(width, height);
  } catch {
    return 'Не удалось прочитать изображение';
  }
}
