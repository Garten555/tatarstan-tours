/** Правила для шапки профиля / туристического паспорта */
export const PROFILE_COVER_MIN_WIDTH = 800;
export const PROFILE_COVER_MIN_HEIGHT = 200;
export const PROFILE_COVER_MAX_WIDTH = 8000;
export const PROFILE_COVER_MAX_HEIGHT = 6000;

export const PROFILE_COVER_SIZE_HINT = `Минимум ${PROFILE_COVER_MIN_WIDTH}×${PROFILE_COVER_MIN_HEIGHT} px, максимум ${PROFILE_COVER_MAX_WIDTH}×${PROFILE_COVER_MAX_HEIGHT} px`;

export function validateCoverDimensions(width: number, height: number): string | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 'Не удалось определить размер изображения';
  }

  if (width < PROFILE_COVER_MIN_WIDTH || height < PROFILE_COVER_MIN_HEIGHT) {
    return `Шапка: минимум ${PROFILE_COVER_MIN_WIDTH}×${PROFILE_COVER_MIN_HEIGHT} px (выбрано ${width}×${height})`;
  }

  if (width > PROFILE_COVER_MAX_WIDTH || height > PROFILE_COVER_MAX_HEIGHT) {
    return `Шапка: максимум ${PROFILE_COVER_MAX_WIDTH}×${PROFILE_COVER_MAX_HEIGHT} px`;
  }

  return null;
}

function readJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd9) break;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (length < 2) break;
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      if (offset + 7 > buffer.length) return null;
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += length;
  }
  return null;
}

function readWebpDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 30) return null;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    return null;
  }

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunk = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (data + size > buffer.length) break;

    if (chunk === 'VP8X' && size >= 10) {
      return {
        width: 1 + buffer.readUIntLE(data + 4, 3),
        height: 1 + buffer.readUIntLE(data + 7, 3),
      };
    }
    if (chunk === 'VP8 ' && size >= 10) {
      return {
        width: buffer.readUInt16LE(data + 6) & 0x3fff,
        height: buffer.readUInt16LE(data + 8) & 0x3fff,
      };
    }
    if (chunk === 'VP8L' && size >= 5) {
      const bits = buffer.readUInt32LE(data) >> 8;
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }

    offset = data + size + (size % 2);
  }

  return null;
}

/** Чтение размеров из буфера (API-загрузка, без sharp). */
export function readImageDimensionsFromBuffer(
  buffer: Buffer,
  mimeType: string
): { width: number; height: number } | null {
  if (mimeType === 'image/png' && buffer.length >= 24) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  if ((mimeType === 'image/jpeg' || mimeType === 'image/jpg') && buffer.length > 2) {
    return readJpegDimensions(buffer);
  }

  if (mimeType === 'image/webp') {
    return readWebpDimensions(buffer);
  }

  return null;
}

export async function validateCoverImageBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<string | null> {
  const dims = readImageDimensionsFromBuffer(buffer, mimeType);
  if (!dims) {
    return 'Не удалось определить размер изображения';
  }
  return validateCoverDimensions(dims.width, dims.height);
}
