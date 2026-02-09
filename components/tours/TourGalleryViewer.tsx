'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { escapeHtml } from '@/lib/utils/sanitize';

interface TourGalleryViewerProps {
  photos: Array<{
    id: string;
    media_url: string;
    file_name?: string | null;
  }>;
  title: string;
}

export function TourGalleryViewer({ photos, title }: TourGalleryViewerProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const openGallery = (index: number) => {
    setSelectedIndex(index);
  };

  const closeGallery = () => {
    setSelectedIndex(null);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % photos.length);
    }
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex - 1 + photos.length) % photos.length);
    }
  };

  // Навигация по клавиатуре
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => (prev !== null ? (prev - 1 + photos.length) % photos.length : null));
      } else if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) => (prev !== null ? (prev + 1) % photos.length : null));
      } else if (e.key === 'Escape') {
        closeGallery();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, photos.length]);

  return (
    <>
      {/* Сетка фотографий */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative h-48 rounded-xl overflow-hidden cursor-pointer group"
            onClick={() => openGallery(index)}
          >
            <Image
              src={photo.media_url}
              alt={escapeHtml(photo.file_name || `Фото ${index + 1}`)}
              fill
              className="object-cover hover:scale-110 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium bg-black/50 px-4 py-2 rounded-lg">
                Просмотр
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Модальное окно просмотрщика */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={closeGallery}
        >
          <button
            onClick={closeGallery}
            className="absolute top-4 right-4 z-[60] rounded-full p-3 md:p-4 transition-all duration-300 hover:scale-110 min-w-[52px] min-h-[52px] flex items-center justify-center"
            aria-label="Закрыть"
            style={{
              background: 'linear-gradient(to bottom right, #ffffff, #f3f4f6)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(255, 255, 255, 0.8)',
              border: '2px solid rgba(255, 255, 255, 0.9)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to bottom right, #f9fafb, #ffffff)';
              e.currentTarget.style.boxShadow = '0 6px 30px rgba(16, 185, 129, 0.4), 0 0 0 2px rgba(16, 185, 129, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to bottom right, #ffffff, #f3f4f6)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(255, 255, 255, 0.8)';
            }}
          >
            <X 
              className="w-6 h-6 md:w-7 md:h-7 font-black transition-all duration-300 group-hover:rotate-90 relative z-10" 
              strokeWidth={3.5}
              style={{ color: '#111827', stroke: '#111827' }}
            />
          </button>

          <div className="relative max-w-7xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            {/* Изображение */}
            <div className="relative w-full h-full flex items-center justify-center bg-black/20 rounded-lg p-4 min-h-[400px]">
              <img
                src={photos[selectedIndex].media_url}
                alt={escapeHtml(photos[selectedIndex].file_name || `${title} - ${selectedIndex + 1}`)}
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>

            {/* Навигация */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 z-10"
                  title="Предыдущее"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 z-10"
                  title="Следующее"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Счетчик */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                  {selectedIndex + 1} / {photos.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

