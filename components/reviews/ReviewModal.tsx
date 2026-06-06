'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Star, Upload, Loader2, Quote } from 'lucide-react';
import toast from 'react-hot-toast';
import { getReviewTheme } from '@/lib/reviews/rating-theme';

type ReviewModalProps = {
  bookingId?: string;
  tourId?: string;
  tourTitle: string;
  reviewId?: string;
  initialRating?: number;
  initialText?: string;
  mode?: 'create' | 'edit';
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

type LocalFile = {
  file: File;
  preview: string;
  type: 'image' | 'video';
};

export default function ReviewModal({
  bookingId,
  tourId,
  tourTitle,
  reviewId,
  initialRating = 5,
  initialText = '',
  mode = 'create',
  isOpen,
  onClose,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState(initialRating);
  const [text, setText] = useState(initialText);
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setRating(initialRating);
    setText(initialText);
    setFiles([]);
  }, [isOpen, initialRating, initialText]);

  const isEdit = mode === 'edit';
  const theme = useMemo(() => getReviewTheme(rating), [rating]);
  const canSubmit = useMemo(() => rating >= 1 && rating <= 5 && !saving, [rating, saving]);
  const previewText = text.trim() || 'Ваш отзыв появится здесь…';

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isEdit) return;
    const selected = Array.from(event.target.files || []);
    if (selected.length === 0) return;

    const newFiles: LocalFile[] = [];
    for (const file of selected) {
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      const preview = URL.createObjectURL(file);
      newFiles.push({ file, preview, type });
    }

    setFiles((prev) => [...prev, ...newFiles]);
    event.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => {
      const next = [...prev];
      const removed = next.splice(index, 1);
      removed.forEach((item) => URL.revokeObjectURL(item.preview));
      return next;
    });
  };

  const uploadFile = async (file: LocalFile) => {
    const formData = new FormData();
    const folder = file.type === 'video' ? 'reviews/videos' : 'reviews/images';
    formData.append('file', file.file);
    formData.append('folder', folder);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Не удалось загрузить файл');
    }

    return {
      media_type: file.type,
      media_url: data.url as string,
      media_path: data.path as string | null,
    };
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);

    try {
      if (isEdit) {
        if (!reviewId) {
          throw new Error('Не указан отзыв');
        }

        const response = await fetch(`/api/reviews/${reviewId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating, text }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Не удалось сохранить отзыв');
        }

        toast.success('Отзыв обновлён');
        onClose();
        onSuccess?.();
        return;
      }

      if (!bookingId || !tourId) {
        throw new Error('Не указано бронирование');
      }

      const media = [];
      for (const [index, file] of files.entries()) {
        const uploaded = await uploadFile(file);
        media.push({ ...uploaded, order_index: index });
      }

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          tour_id: tourId,
          rating,
          text,
          media,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось отправить отзыв');
      }

      toast.success('Отзыв отправлен на модерацию');
      onClose();
      setText('');
      setRating(5);
      setFiles([]);
      onSuccess?.();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить отзыв');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overflow-y-auto">
      <div className="my-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isEdit ? 'Редактировать отзыв' : 'Оставить отзыв'}
            </h2>
            <p className="mt-1 text-sm text-gray-600">{tourTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium text-gray-700">Оценка</div>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold transition-colors duration-200 ${theme.badge}`}
            >
              {theme.label}
            </span>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, index) => {
              const value = index + 1;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className={`rounded-lg border p-2 transition-all duration-200 ${
                    rating >= value ? theme.starActive : 'border-gray-200 text-gray-400'
                  }`}
                >
                  <Star className={`h-5 w-5 ${rating >= value ? 'fill-current' : ''}`} />
                </button>
              );
            })}
          </div>
        </div>

        <div
          className={`relative mt-6 rounded-2xl border-2 p-5 transition-all duration-300 ${theme.card}`}
        >
          <div className="absolute right-4 top-4 opacity-15 transition-opacity duration-300">
            <Quote className={`h-10 w-10 ${theme.quote}`} />
          </div>
          <p className="relative z-10 mb-4 text-base leading-relaxed text-gray-700 md:text-lg">
            &ldquo;{previewText}&rdquo;
          </p>
          <div className="relative z-10 flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 bg-gradient-to-br text-sm font-bold text-white ${theme.avatar}`}
            >
              Вы
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">Ваш отзыв</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const value = index + 1;
                    const isActive = rating >= value;
                    return (
                      <Star
                        key={value}
                        className={`h-4 w-4 transition-colors duration-200 ${
                          isActive ? `${theme.ratingColor} fill-current` : 'text-gray-200'
                        }`}
                      />
                    );
                  })}
                </div>
                <span className={`text-sm font-bold transition-colors duration-200 ${theme.ratingColor}`}>
                  {rating.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium text-gray-700" htmlFor="review-text">
            Ваш отзыв
          </label>
          <textarea
            id="review-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Поделитесь впечатлениями о туре"
            className={`mt-2 w-full rounded-lg border border-gray-200 px-4 py-2 transition-shadow focus:outline-none focus:ring-2 ${theme.focusRing}`}
          />
        </div>

        {!isEdit ? (
          <div className="mt-6">
            <label className="text-sm font-medium text-gray-700">Фото и видео</label>
            <div className="mt-2 flex flex-wrap gap-3">
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 transition ${theme.uploadHover}`}
              >
                <Upload className="h-4 w-4" />
                Добавить файлы
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              {files.map((file, index) => (
                <div key={file.preview} className="relative h-24 w-24 overflow-hidden rounded-lg border">
                  {file.type === 'video' ? (
                    <video src={file.preview} className="h-full w-full object-cover" />
                  ) : (
                    <img src={file.preview} alt="preview" className="h-full w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="absolute right-1 top-1 h-5 w-5 rounded-full bg-black/60 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-50"
            disabled={saving}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex items-center gap-2 rounded-lg px-5 py-2 text-white transition-colors duration-200 disabled:opacity-60 ${theme.submit}`}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Сохранить' : 'Отправить'}
          </button>
        </div>
      </div>
    </div>
  );
}
