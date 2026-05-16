'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ImageViewerModal from '@/components/common/ImageViewerModal';

type TourMediaGalleryProps = {
  photos: { id: string; media_url: string; file_name?: string | null }[];
};

function gridClassForCount(count: number): string {
  if (count <= 1) return 'grid-cols-1 max-w-lg mx-auto';
  if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
  return 'grid-cols-2 md:grid-cols-3';
}

export default function TourMediaGallery({ photos }: TourMediaGalleryProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const imageUrls = useMemo(
    () => photos.map((photo) => photo.media_url).filter(Boolean),
    [photos]
  );

  const showSlider = photos.length > 3;

  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setScrollPosition(scrollLeft);
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    if (!showSlider) return;

    updateScrollState();

    const container = scrollContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      updateScrollState();
    });
    resizeObserver.observe(container);

    const images = container.querySelectorAll('img');
    const onImageLoad = () => updateScrollState();
    images.forEach((img) => {
      if (!img.complete) {
        img.addEventListener('load', onImageLoad);
      }
    });

    return () => {
      resizeObserver.disconnect();
      images.forEach((img) => img.removeEventListener('load', onImageLoad));
    };
  }, [photos, showSlider, updateScrollState]);

  useEffect(() => {
    if (viewerOpen || !showSlider) return;
    const id = requestAnimationFrame(() => updateScrollState());
    return () => cancelAnimationFrame(id);
  }, [viewerOpen, showSlider, updateScrollState]);

  if (photos.length === 0) return null;

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = Math.min(400, container.clientWidth * 0.85);
    const newPosition =
      direction === 'left'
        ? Math.max(0, scrollPosition - scrollAmount)
        : scrollPosition + scrollAmount;

    container.scrollTo({
      left: newPosition,
      behavior: 'smooth',
    });
  };

  const handleScroll = () => {
    updateScrollState();
  };

  return (
    <>
      <section className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 md:p-8 hover:shadow-xl transition-all duration-300 w-full max-w-full overflow-hidden">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 mb-6 md:mb-8 pb-4 border-b-2 border-gray-200">
          Фотогалерея
        </h2>

        {showSlider ? (
          <div className="relative">
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scroll('left')}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/90 hover:bg-white rounded-full shadow-xl border-2 border-gray-200 flex items-center justify-center transition-all duration-200 hover:scale-110"
                aria-label="Предыдущие фото"
              >
                <ChevronLeft className="w-6 h-6 text-gray-700" />
              </button>
            )}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scroll('right')}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/90 hover:bg-white rounded-full shadow-xl border-2 border-gray-200 flex items-center justify-center transition-all duration-200 hover:scale-110"
                aria-label="Следующие фото"
              >
                <ChevronRight className="w-6 h-6 text-gray-700" />
              </button>
            )}

            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex gap-4 md:gap-5 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => openViewer(index)}
                  className="group relative flex-shrink-0 h-48 md:h-56 lg:h-64 w-64 md:w-72 lg:w-80 rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-200 hover:border-emerald-400"
                  aria-label={`Открыть фото ${index + 1}`}
                >
                  <Image
                    src={photo.media_url}
                    alt={photo.file_name || `Фото тура ${index + 1}`}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                    sizes="(max-width: 768px) 256px, (max-width: 1024px) 288px, 320px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-base font-bold bg-black/50 px-5 py-2.5 rounded-lg">
                      Просмотр
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={`grid ${gridClassForCount(photos.length)} gap-4 md:gap-5 w-full`}>
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => openViewer(index)}
                className="group relative h-48 md:h-56 lg:h-64 rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 w-full aspect-[4/3] border-2 border-gray-200 hover:border-emerald-400"
                aria-label={`Открыть фото ${index + 1}`}
              >
                <Image
                  src={photo.media_url}
                  alt={photo.file_name || `Фото тура ${index + 1}`}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                  sizes={
                    photos.length === 1
                      ? '512px'
                      : photos.length === 2
                        ? '(max-width: 640px) 100vw, 50vw'
                        : '(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 33vw'
                  }
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-base font-bold bg-black/50 px-5 py-2.5 rounded-lg">
                    Просмотр
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <ImageViewerModal
        isOpen={viewerOpen}
        images={imageUrls}
        initialIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
      />
    </>
  );
}
