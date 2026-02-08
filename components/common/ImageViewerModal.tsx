'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

type ImageViewerModalProps = {
  isOpen: boolean;
  images: string[];
  title?: string;
  initialIndex?: number;
  isLoading?: boolean;
  onClose: () => void;
};

export default function ImageViewerModal({
  isOpen,
  images,
  title,
  initialIndex = 0,
  isLoading = false,
  onClose,
}: ImageViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageError, setImageError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const safeIndex = Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0));
    setCurrentIndex(safeIndex);
    setImageError(false);
  }, [isOpen, initialIndex, images.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (images.length <= 1) return;
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images.length, onClose]);

  if (!isOpen || !mounted) return null;

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-gradient-to-br from-black via-gray-950 to-black z-[200] flex items-center justify-center p-0"
      onClick={onClose}
      style={{ backdropFilter: 'blur(20px)' }}
    >
      {/* Верхняя панель с кнопкой закрытия и счетчиком */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 md:p-6 bg-gradient-to-b from-black/80 to-transparent">
        {images.length > 1 && (
          <div className="flex items-center gap-3 px-5 py-2.5 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 shadow-xl">
            <span className="text-white text-lg md:text-xl font-black text-emerald-400">
              {currentIndex + 1}
            </span>
            <span className="text-white/60 text-lg md:text-xl font-bold">/</span>
            <span className="text-white text-lg md:text-xl font-black">
              {images.length}
            </span>
          </div>
        )}
        <div className="ml-auto">
          <button
            onClick={onClose}
            className="group relative bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white rounded-2xl p-3 md:p-4 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 border-2 border-white/20 hover:border-white/40"
            aria-label="Закрыть"
          >
            <X className="w-6 h-6 md:w-7 md:h-7 transition-transform duration-300 group-hover:rotate-90" />
          </button>
        </div>
      </div>

      {images.length > 0 ? (
        <div
          className="relative w-full h-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Контейнер изображения */}
          <div className="relative w-full h-full flex items-center justify-center px-4 md:px-8 py-20 md:py-24">
            {!imageError && images[currentIndex] ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={images[currentIndex]}
                  alt={title ? `${title} - ${currentIndex + 1} из ${images.length}` : 'Просмотр фото'}
                  className="max-w-full max-h-[90vh] object-contain rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.8)] animate-in fade-in duration-500"
                  style={{ maxWidth: '100%', height: 'auto' }}
                  onError={() => setImageError(true)}
                  onLoad={() => setImageError(false)}
                />
                {/* Градиентная рамка вокруг изображения */}
                <div className="absolute inset-0 pointer-events-none rounded-3xl bg-gradient-to-br from-emerald-500/10 via-transparent to-purple-500/10 blur-3xl -z-10" />
              </div>
            ) : (
              <div className="text-white text-center p-12 md:p-16 bg-white/5 backdrop-blur-2xl rounded-3xl border-2 border-white/10 shadow-2xl max-w-2xl">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center border-2 border-red-500/30">
                  <X className="w-10 h-10 text-red-400" />
                </div>
                <p className="text-2xl md:text-3xl font-black mb-4">Ошибка загрузки изображения</p>
                <p className="text-base md:text-lg text-gray-300 mb-8">
                  {images[currentIndex] || 'URL не указан'}
                </p>
                <button
                  onClick={() => {
                    setImageError(false);
                    setCurrentIndex(0);
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl font-black text-lg md:text-xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                >
                  Попробовать снова
                </button>
              </div>
            )}
            {isLoading && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xl rounded-3xl">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <div className="text-white text-xl md:text-2xl font-black">Загрузка галереи...</div>
                </div>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <>
              {/* Кнопка "Предыдущее" */}
              <button
                onClick={prevImage}
                className="group absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-40 bg-white/95 hover:bg-white text-gray-900 rounded-2xl p-4 md:p-5 shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-110 border-2 border-white hover:border-emerald-400 backdrop-blur-sm"
                title="Предыдущее (←)"
                aria-label="Предыдущее фото"
              >
                <ChevronLeft className="w-8 h-8 md:w-10 md:h-10 transition-transform duration-300 group-hover:-translate-x-1" />
              </button>
              
              {/* Кнопка "Следующее" */}
              <button
                onClick={nextImage}
                className="group absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-40 bg-white/95 hover:bg-white text-gray-900 rounded-2xl p-4 md:p-5 shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-110 border-2 border-white hover:border-emerald-400 backdrop-blur-sm"
                title="Следующее (→)"
                aria-label="Следующее фото"
              >
                <ChevronRight className="w-8 h-8 md:w-10 md:h-10 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="text-white text-center p-12 md:p-16 bg-white/5 backdrop-blur-2xl rounded-3xl border-2 border-white/10 shadow-2xl">
          <div className="text-2xl md:text-3xl font-black mb-2">Галерея пуста</div>
          <p className="text-lg md:text-xl text-gray-300">Нет изображений для отображения</p>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}





