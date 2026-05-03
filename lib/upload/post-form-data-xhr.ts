/**
 * POST multipart/form-data с XMLHttpRequest — fetch не отдаёт progress загрузки.
 */
export function postFormDataJsonWithProgress<T = unknown>(
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (!onProgress || !e.lengthComputable) return;
      const pct = Math.min(100, Math.round((100 * e.loaded) / e.total));
      onProgress(pct);
    };

    xhr.onload = () => {
      let body: unknown = {};
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        reject(new Error('Неверный ответ сервера'));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as T);
        return;
      }
      const err = body as { error?: string; details?: string };
      reject(new Error(err.error || err.details || `Ошибка ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error('Ошибка сети'));
    xhr.send(formData);
  });
}
