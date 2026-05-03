export type UploadFormProgressOptions = {
  /** Тело запроса полностью ушло на сервер; дальше ждём ответ (S3/БД и т.д.) */
  onRequestBodySent?: () => void;
  /** По умолчанию 30 мин — большие видео и медленный ответ S3 */
  timeoutMs?: number;
};

const DEFAULT_UPLOAD_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * POST multipart/form-data с отслеживанием прогресса отправки (XHR upload).
 */
export function uploadFormDataWithProgress(
  url: string,
  formData: FormData,
  onProgress: (percent: number | null) => void,
  options?: UploadFormProgressOptions
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.timeout = options?.timeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS;
    xhr.ontimeout = () =>
      reject(
        new Error(
          'Превышено время ожидания загрузки. Проверьте интернет, размер файла и nginx proxy_read_timeout на сервере.'
        )
      );
    xhr.upload.onloadstart = () => {
      onProgress(null);
    };
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        onProgress(Math.min(100, Math.round((100 * e.loaded) / e.total)));
      } else {
        onProgress(null);
      }
    };
    xhr.upload.onload = () => {
      options?.onRequestBodySent?.();
    };
    xhr.onload = () => {
      if (xhr.status === 0) {
        reject(new Error('Соединение прервано до ответа сервера'));
        return;
      }
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(xhr.responseText || '{}') as Record<string, unknown>;
      } catch {
        data = {};
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data });
    };
    xhr.onerror = () => reject(new Error('Ошибка сети при загрузке файла'));
    xhr.onabort = () => reject(new Error('Загрузка отменена'));
    xhr.send(formData);
  });
}
