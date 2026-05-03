export type UploadFormProgressOptions = {
  /** Тело запроса полностью ушло на сервер; дальше ждём ответ (S3/БД и т.д.) */
  onRequestBodySent?: () => void;
};

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
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(xhr.responseText || '{}') as Record<string, unknown>;
      } catch {
        data = {};
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data });
    };
    xhr.onerror = () => reject(new Error('network'));
    xhr.send(formData);
  });
}
