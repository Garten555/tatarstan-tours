'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import ImageViewerModal from '@/components/common/ImageViewerModal';

type PhotoItem = {
  id: string;
  media_url: string;
  file_name?: string | null;
};

type TourGalleryGridProps = {
  title: string;
  photos: PhotoItem[];
  images: string[];
};

export default function TourGalleryGrid({ title, photos, images }: TourGalleryGridProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const photoUrls = useMemo(
    () => photos.map((photo) => photo.media_url).filter(Boolean),
    [photos]
  );

  if (photos.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Фотогалерея</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photos.map((photo) => {
          const indexInImages = images.indexOf(photo.media_url);
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => {
                setViewerIndex(Math.max(indexInImages, 0));
                setViewerOpen(true);
              }}
              className="relative h-48 rounded-xl overflow-hidden"
              aria-label="Открыть фото"
            >
              <Image
                src={photo.media_url}
                alt={photo.file_name || title}
                fill
                className="object-cover hover:scale-110 transition-transform duration-300"
              />
            </button>
          );
        })}
      </div>

      <ImageViewerModal
        isOpen={viewerOpen}
        images={images}
        initialIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}















