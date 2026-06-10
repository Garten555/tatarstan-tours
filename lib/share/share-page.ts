export type SharePageResult = 'shared' | 'copied' | 'cancelled' | 'failed';

export type SharePageOptions = {
  url: string;
  title?: string;
  text?: string;
};

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fallback below */
    }
  }

  if (typeof document === 'undefined') return false;

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/** Web Share API или копирование ссылки в буфер обмена. */
export async function sharePage(options: SharePageOptions): Promise<SharePageResult> {
  const { url, title, text } = options;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        url,
        ...(title ? { title } : {}),
        ...(text ? { text } : {}),
      });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  const copied = await copyToClipboard(url);
  return copied ? 'copied' : 'failed';
}
