'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ImageIcon, Video, Play, Upload, Loader2, X, ExternalLink } from 'lucide-react';
import ImageViewerModal from '@/components/common/ImageViewerModal';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDialog } from '@/hooks/useDialog';

interface UserGalleryProps {
  media: Array<{
    id: string;
    media_url: string;
    media_type: 'image' | 'video';
    thumbnail_url?: string | null;
    created_at: string;
  }>;
  userId: string;
  isOwner: boolean;
  username?: string;
  showViewAll?: boolean;
}

export default function UserGallery({ media, userId, isOwner, username, showViewAll = false }: UserGalleryProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [localMedia, setLocalMedia] = useState(media);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { alert, confirm, DialogComponents } = useDialog();

  const images = localMedia.filter((m) => m.media_type === 'image');
  const videos = localMedia.filter((m) => m.media_type === 'video');
  const imageUrls = images.map((img) => img.media_url);

  // Проверяем URL параметр для открытия просмотрщика
  useEffect(() => {
    if (!searchParams) return;
    const imageParam = searchParams.get('image');
    if (imageParam !== null && imageParam !== undefined) {
      const index = parseInt(imageParam, 10);
      if (!isNaN(index) && index >= 0 && index < imageUrls.length) {
        setViewerIndex(index);
        setViewerOpen(true);
      }
    }
  }, [searchParams, imageUrls.length]);

  const openViewer = (index: number) => {
    if (username) {
      // Открываем отдельную страницу галереи
      router.push(`/users/${username}/gallery?image=${index}`);
    } else {
      // Открываем модальное окно (для обратной совместимости)
      setViewerIndex(index);
      setViewerOpen(true);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const isVideo = file.type.startsWith('video/');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'user-gallery');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Ошибка загрузки');
        }

              // Сохраняем в user_gallery
              const { data: galleryItem, error } = await supabase
                .from('user_gallery')
                .insert({
                  user_id: userId,
                  media_type: isVideo ? 'video' : 'image',
                  media_url: data.url,
                  media_path: data.path,
                  file_name: file.name,
                  file_size: file.size,
                  mime_type: file.type,
                } as any)
                .select()
                .single();

        if (error) throw error;
        return galleryItem;
      });

      const uploaded = await Promise.all(uploadPromises);
      setLocalMedia((prev) => [...uploaded, ...prev]);
      await alert('Медиа успешно загружено', 'Успешно', 'success');
      router.refresh();
    } catch (error: any) {
      await alert(error.message || 'Не удалось загрузить медиа', 'Ошибка', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (mediaId: string) => {
    const confirmed = await confirm('Вы уверены, что хотите удалить это медиа?', 'Удаление медиа');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('user_gallery')
        .delete()
        .eq('id', mediaId);

      if (error) throw error;

      setLocalMedia((prev) => prev.filter((m) => m.id !== mediaId));
      await alert('Медиа удалено', 'Успешно', 'success');
      router.refresh();
    } catch (error: any) {
      await alert(error.message || 'Не удалось удалить медиа', 'Ошибка', 'error');
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Кнопка загрузки для владельца */}
        {isOwner && (
          <div className="mb-6">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Загрузка...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>Загрузить фото/видео</span>
                </>
              )}
            </button>
          </div>
        )}
        {/* Фотографии */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-purple-100/50 border border-purple-200/50 rounded-xl">
                <span className="text-sm font-bold text-purple-700">Фотографии</span>
              </div>
              <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 flex items-center gap-3">
                <ImageIcon className="w-6 h-6 md:w-7 md:h-7 text-purple-600" />
                Фотографии
              </h3>
              <span className="text-lg md:text-xl text-gray-600 font-medium">({images.length})</span>
            </div>
            {showViewAll && username && images.length > 0 && (
              <Link
                href={`/users/${username}/gallery`}
                className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-base"
              >
                Смотреть все
                <ExternalLink className="w-5 h-5" />
              </Link>
            )}
          </div>
          {images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {images.map((image, index) => (
                <div
                  key={image.id}
                  className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all duration-300"
                >
                  <button
                    type="button"
                    onClick={() => openViewer(index)}
                    className="w-full h-full"
                    aria-label={`Открыть фото ${index + 1}`}
                  >
                          <Image
                            src={image.media_url}
                            alt={`Фото ${index + 1}`}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            loading="lazy"
                          />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium bg-black/50 px-4 py-2 rounded-lg">
                        Просмотр
                      </div>
                    </div>
                  </button>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(image.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      aria-label="Удалить"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-xl font-bold mb-2 text-gray-700">Пока нет фотографий</p>
              <p className="text-base text-gray-600">
                {isOwner ? 'Загрузите свои фото, чтобы поделиться ими!' : 'У пользователя пока нет фотографий'}
              </p>
            </div>
          )}
        </div>

        {/* Видео */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="px-3 py-1.5 bg-emerald-100/50 border border-emerald-200/50 rounded-xl">
              <span className="text-sm font-bold text-emerald-700">Видео</span>
            </div>
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 flex items-center gap-3">
              <Video className="w-6 h-6 md:w-7 md:h-7 text-emerald-600" />
              Видео
            </h3>
            <span className="text-lg md:text-xl text-gray-600 font-medium">({videos.length})</span>
          </div>
          {videos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all duration-300"
                >
                  <a
                    href={video.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-full block"
                    aria-label="Открыть видео"
                  >
                    {video.thumbnail_url ? (
                      <Image
                        src={video.thumbnail_url}
                        alt="Превью видео"
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <Play className="w-12 h-12 text-white" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 text-emerald-600 ml-1" fill="currentColor" />
                      </div>
                    </div>
                  </a>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleDelete(video.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      aria-label="Удалить"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
              <Video className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-xl font-bold mb-2 text-gray-700">Пока нет видео</p>
              <p className="text-base text-gray-600">
                {isOwner ? 'Загрузите свои видео, чтобы поделиться ими!' : 'У пользователя пока нет видео'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Просмотрщик изображений */}
      <ImageViewerModal
        isOpen={viewerOpen}
        images={imageUrls}
        initialIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
      />

      {/* Диалоги */}
      {DialogComponents}
    </>
  );
}

