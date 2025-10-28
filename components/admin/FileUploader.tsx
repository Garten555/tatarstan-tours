'use client';

import { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import Image from 'next/image';

interface FileUploaderProps {
  type: 'tour-cover' | 'tour-gallery' | 'tour-video' | 'avatar';
  onUploadComplete: (url: string, path: string) => void;
  accept?: string;
  maxSizeMB?: number;
}

export default function FileUploader({
  type,
  onUploadComplete,
  accept = 'image/*',
  maxSizeMB = 10,
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Сбрасываем состояния
    setError(null);
    setSuccess(false);

    // Проверка размера
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Файл слишком большой. Максимум ${maxSizeMB}MB`);
      return;
    }

    // Создаём превью для изображений
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    // Загружаем файл
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки файла');
      }

      setSuccess(true);
      onUploadComplete(data.url, data.path);

      // Сбрасываем success через 3 секунды
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      {/* Превью загруженного изображения */}
      {preview && (
        <div className="mb-4 relative">
          <div className="relative w-full h-64 rounded-lg overflow-hidden">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover"
            />
          </div>
          <button
            onClick={clearPreview}
            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Область загрузки */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200
          ${uploading ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-emerald-500 hover:bg-emerald-50'}
          ${error ? 'border-red-400 bg-red-50' : ''}
          ${success ? 'border-green-400 bg-green-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
          {uploading ? (
            <>
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-emerald-700 font-medium">Загрузка...</p>
            </>
          ) : success ? (
            <>
              <CheckCircle className="w-12 h-12 text-green-600" />
              <p className="text-green-700 font-medium">Файл успешно загружен!</p>
            </>
          ) : error ? (
            <>
              <AlertCircle className="w-12 h-12 text-red-600" />
              <p className="text-red-700 font-medium">{error}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearPreview();
                }}
                className="text-sm text-red-600 hover:text-red-700 underline"
              >
                Попробовать снова
              </button>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400" />
              <div>
                <p className="text-gray-700 font-medium mb-1">
                  Нажмите для загрузки файла
                </p>
                <p className="text-sm text-gray-500">
                  Максимум {maxSizeMB}MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

