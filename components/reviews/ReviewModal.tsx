'use client';

import { useMemo, useState } from 'react';
import { X, Star, Upload, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

type ReviewModalProps = {
  bookingId: string;
  tourId: string;
  tourTitle: string;
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
  isOpen,
  onClose,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => rating >= 1 && rating <= 5 && !saving, [rating, saving]);

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
    } catch (error: any) {
      toast.error(error.message || 'Не удалось отправить отзыв');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Оставить отзыв</h2>
            <p className="text-sm text-gray-600 mt-1">{tourTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6">
          <div className="text-sm font-medium text-gray-700 mb-2">Оценка</div>
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, index) => {
              const value = index + 1;
              return (
                <button
                  key={value}
                  onClick={() => setRating(value)}
                  className={`p-2 rounded-lg border transition ${
                    rating >= value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                      : 'border-gray-200 text-gray-400'
                  }`}
                >
                  <Star className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium text-gray-700">Ваш отзыв</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Поделитесь впечатлениями о туре"
            className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium text-gray-700">Фото и видео</label>
          <div className="mt-2 flex flex-wrap gap-3">
            <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-400 transition text-sm text-gray-600">
              <Upload className="w-4 h-4" />
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
              <div key={file.preview} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                {file.type === 'video' ? (
                  <video src={file.preview} className="w-full h-full object-cover" />
                ) : (
                  <img src={file.preview} alt="preview" className="w-full h-full object-cover" />
                )}
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            disabled={saving}
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
}
















