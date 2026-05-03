/**
 * MIME для <video><source type="…"> по пути URL (оригинальный URL до прокси — там есть расширение файла).
 */
export function guessVideoMimeTypeFromUrl(url: string): string | undefined {
  let pathname = '';
  try {
    pathname = new URL(url).pathname.toLowerCase();
  } catch {
    return undefined;
  }
  if (pathname.endsWith('.webm')) return 'video/webm';
  if (pathname.endsWith('.mov') || pathname.endsWith('.qt')) return 'video/quicktime';
  if (pathname.endsWith('.m4v')) return 'video/x-m4v';
  if (pathname.endsWith('.ogv') || pathname.endsWith('.ogg')) return 'video/ogg';
  if (pathname.endsWith('.avi')) return 'video/x-msvideo';
  if (pathname.endsWith('.mp4')) return 'video/mp4';
  return undefined;
}

/** Явный тип из загрузки / БД; иначе по расширению; иначе не задаём type (браузер сам sniff). */
export function resolveVideoSourceType(src: string, mimeType?: string): string | undefined {
  const explicit = mimeType?.trim();
  if (explicit && explicit.startsWith('video/')) return explicit;
  return guessVideoMimeTypeFromUrl(src.trim());
}
