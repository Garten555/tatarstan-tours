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
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos');
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
          <div className="mb-4">
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
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-lg font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: '#ffffff' }}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#ffffff' }} />
                  <span style={{ color: '#ffffff' }}>Загрузка...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" style={{ color: '#ffffff' }} />
                  <span style={{ color: '#ffffff' }}>Загрузить фото/видео</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Табы навигации */}
        <div className="border-b border-gray-200">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('photos')}
              className={`relative px-4 py-3 text-center font-semibold text-sm transition-all rounded-t-lg ${
                activeTab === 'photos'
                  ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <ImageIcon className={`w-4 h-4 ${activeTab === 'photos' ? 'text-emerald-600' : 'text-gray-500'}`} />
                <span>Фотографии</span>
                {images.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'photos'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {images.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`relative px-4 py-3 text-center font-semibold text-sm transition-all rounded-t-lg ${
                activeTab === 'videos'
                  ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Video className={`w-4 h-4 ${activeTab === 'videos' ? 'text-emerald-600' : 'text-gray-500'}`} />
                <span>Видео</span>
                {videos.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'videos'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {videos.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Контент табов */}
        <div className="py-4">
          {/* Фотографии */}
          {activeTab === 'photos' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-gray-900">
                    Фотографии ({images.length})
                  </h3>
                </div>
                {showViewAll && username && images.length > 0 && (
                  <Link
                    href={`/users/${username}/gallery`}
                    className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold text-sm"
                  >
                    Смотреть все
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                )}
              </div>
              {images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {images.map((image, index) => (
                    <div
                      key={image.id}
                      className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer bg-gray-100 hover:shadow-lg transition-all duration-200"
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
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                          loading="lazy"
                          unoptimized={image.media_url?.includes('s3.twcstorage.ru')}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300"></div>
                      </button>
                      {isOwner && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(image.id);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg"
                          aria-label="Удалить"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-black mb-2 text-gray-700">Пока нет фотографий</p>
                  <p className="text-gray-600">
                    {isOwner ? 'Загрузите свои фото, чтобы поделиться ими!' : 'У пользователя пока нет фотографий'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Видео */}
          {activeTab === 'videos' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-gray-900">
                    Видео ({videos.length})
                  </h3>
                </div>
                {showViewAll && username && videos.length > 0 && (
                  <Link
                    href={`/users/${username}/gallery`}
                    className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold text-sm"
                  >
                    Смотреть все
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                )}
              </div>
              {videos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer bg-gray-100 hover:shadow-lg transition-all duration-200"
                    >
                      <a
                        href={video.media_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-full block"
                        aria-label="Открыть видео"
                      >
                        <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                          <Play className="w-12 h-12 text-white" />
                        </div>
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                            <Play className="w-7 h-7 text-emerald-600 ml-1" fill="currentColor" />
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
                          className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg"
                          aria-label="Удалить"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <Video className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-black mb-2 text-gray-700">Пока нет видео</p>
                  <p className="text-gray-600">
                    {isOwner ? 'Загрузите свои видео, чтобы поделиться ими!' : 'У пользователя пока нет видео'}
                  </p>
                </div>
              )}
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
