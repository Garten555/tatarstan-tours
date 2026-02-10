'use client';

import { ReactNode, useState } from 'react';
import Image from 'next/image';
import ImageViewerModal from '@/components/common/ImageViewerModal';

type TourCoverImageProps = {
  src: string;
  title: string;
  images: string[];
  children?: ReactNode;
};

export default function TourCoverImage({ src, title, images, children }: TourCoverImageProps) {
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <div className="relative h-96">
      <Image
        src={src}
        alt={title}
        fill
        className="object-cover cursor-pointer"
        priority
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setViewerOpen(true);
        }}
      />
      {children}

      <ImageViewerModal
        isOpen={viewerOpen}
        images={images}
        initialIndex={0}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}

















