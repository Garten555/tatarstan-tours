'use client';

type Props = {
  src: string;
  alt?: string;
  className?: string;
};

/**
 * Обложка в ленте: фиксированное соотношение сторон + object-cover (без «растягивания»).
 */
export function FeedAspectCover({ src, alt = '', className = '' }: Props) {
  return (
    <div
      className={`relative aspect-[16/10] w-full overflow-hidden bg-gray-100 ${className}`.trim()}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover object-center"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
