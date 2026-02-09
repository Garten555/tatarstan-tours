'use client';

// Компонент галереи в комнате тура
import { useState, useEffect } from 'react';
import { TourRoomMedia } from '@/types';
import { Upload, Download, Trash2, Image as ImageIcon, Video, X, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import VideoPlayer from '@/components/tours/VideoPlayer';

interface TourRoomGalleryProps {
  roomId: string;
  tourEndDate: string | null;
}

export function TourRoomGallery({ roomId, tourEndDate }: TourRoomGalleryProps) {
  const [media, setMedia] = useState<TourRoomMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'temporary' | 'archived'>('all');
  const [selectedMedia, setSelectedMedia] = useState<TourRoomMedia | null>(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);

  const isTourEnded = tourEndDate ? new Date(tourEndDate) < new Date() : false;

  useEffect(() => {
    loadMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, filter]);

  // Навигация по клавиатуре для просмотрщика фото
  useEffect(() => {
    if (selectedMediaIndex === null || !selectedMedia) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedMedia.media_type === 'image') {
        const imageMedia = media.filter(m => m.media_type === 'image');
        if (imageMedia.length <= 1) return;

        const currentImageIndex = imageMedia.findIndex(m => m.id === selectedMedia.id);
        
        if (e.key === 'ArrowLeft') {
          const prevIndex = (currentImageIndex - 1 + imageMedia.length) % imageMedia.length;
          const prevMedia = imageMedia[prevIndex];
          const prevGlobalIndex = media.findIndex(m => m.id === prevMedia.id);
          setSelectedMedia(prevMedia);
          setSelectedMediaIndex(prevGlobalIndex);
        } else if (e.key === 'ArrowRight') {
          const nextIndex = (currentImageIndex + 1) % imageMedia.length;
          const nextMedia = imageMedia[nextIndex];
          const nextGlobalIndex = media.findIndex(m => m.id === nextMedia.id);
          setSelectedMedia(nextMedia);
          setSelectedMediaIndex(nextGlobalIndex);
        } else if (e.key === 'Escape') {
          setSelectedMedia(null);
          setSelectedMediaIndex(null);
        }
      } else if (e.key === 'Escape') {
        setSelectedMedia(null);
        setSelectedMediaIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMediaIndex, selectedMedia, media]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tour-rooms/${roomId}/media?filter=${filter}&limit=100`);
      const data = await response.json();
      
      if (data.success) {
        setMedia(data.media || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки медиа:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      toast.error('Разрешены только изображения и видео');
      return;
    }

    // Проверка размера
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`Файл слишком большой. Максимум ${isVideo ? '100MB' : '10MB'}`);
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/tour-rooms/${roomId}/media`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success && data.media) {
        setMedia((prev) => [data.media, ...prev]);
        toast.success('Медиа успешно загружено!');
      } else {
        toast.error(data.error || 'Не удалось загрузить медиа');
      }
    } catch (error) {
      console.error('Ошибка загрузки медиа:', error);
      toast.error('Ошибка загрузки медиа');
    } finally {
      setUploading(false);
      // Сбрасываем input
      e.target.value = '';
    }
  };

  const deleteMedia = async (mediaId: string) => {
    try {
      const response = await fetch(`/api/tour-rooms/${roomId}/media/${mediaId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        setMedia((prev) => prev.filter((m) => m.id !== mediaId));
        if (selectedMedia?.id === mediaId) {
          setSelectedMedia(null);
        }
        toast.success('Медиа удалено');
      } else {
        toast.error(data.error || 'Не удалось удалить медиа');
      }
    } catch (error) {
      console.error('Ошибка удаления медиа:', error);
      toast.error('Ошибка удаления медиа');
    }
  };

  const downloadArchive = async () => {
    // TODO: Реализовать скачивание архива (ZIP файл)
    toast('Функция скачивания архива будет реализована позже', { icon: 'ℹ️' });
  };

  return (
    <div>
      {/* Панель управления */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Все
          </button>
          <button
            onClick={() => setFilter('temporary')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'temporary'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Временные
          </button>
          <button
            onClick={() => setFilter('archived')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'archived'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Архив
          </button>
        </div>

        <div className="flex gap-2">
          {isTourEnded && filter === 'archived' && (
            <button
              onClick={downloadArchive}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Скачать архив</span>
            </button>
          )}
          {!isTourEnded && (
            <label className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Загрузка...' : 'Загрузить'}</span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}
        </div>
      </div>

      {/* Галерея */}
      {loading ? (
        <div className="text-center text-gray-500 py-8">Загрузка галереи...</div>
      ) : media.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          {filter === 'temporary' && !isTourEnded
            ? 'Пока нет временных медиа. Загрузите фото или видео!'
            : filter === 'archived'
            ? 'Архив пуст'
            : 'Галерея пуста'}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map((item, index) => (
            <div
              key={item.id}
              className="relative group cursor-pointer"
              onClick={() => {
                setSelectedMedia(item);
                setSelectedMediaIndex(index);
              }}
            >
              {/* Медиа */}
              {item.media_type === 'image' ? (
                <img
                  src={item.media_url}
                  alt={item.file_name || 'Изображение'}
                  className="w-full h-48 object-cover rounded-lg"
                />
              ) : (
                <div className="relative w-full h-48 bg-gray-900 rounded-lg flex items-center justify-center">
                  {item.thumbnail_url ? (
                    <img
                      src={item.thumbnail_url}
                      alt={item.file_name || 'Видео'}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Video className="w-12 h-12 text-white" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center">
                      <Video className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              )}

              {/* Overlay с информацией */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMedia(item.id);
                    }}
                    className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Бейдж типа */}
              <div className="absolute top-2 left-2">
                {item.media_type === 'image' ? (
                  <div className="px-2 py-1 bg-emerald-500 text-white text-xs rounded">
                    <ImageIcon className="w-3 h-3 inline mr-1" />
                    Фото
                  </div>
                ) : (
                  <div className="px-2 py-1 bg-blue-500 text-white text-xs rounded">
                    <Video className="w-3 h-3 inline mr-1" />
                    Видео
                  </div>
                )}
              </div>

              {/* Бейдж статуса */}
              {item.is_temporary ? (
                <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500 text-white text-xs rounded">
                  Временное
                </div>
              ) : (
                <div className="absolute top-2 right-2 px-2 py-1 bg-gray-500 text-white text-xs rounded">
                  Архив
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно для просмотра */}
      {selectedMedia && selectedMediaIndex !== null && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setSelectedMedia(null);
            setSelectedMediaIndex(null);
          }}
        >
          <button
            onClick={() => {
              setSelectedMedia(null);
              setSelectedMediaIndex(null);
            }}
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
            {selectedMedia.media_type === 'image' ? (
              <>
                {/* Изображение */}
                <div className="relative w-full h-full flex items-center justify-center bg-black/20 rounded-lg p-4 min-h-[400px]">
                  <img
                    src={selectedMedia.media_url}
                    alt={selectedMedia.file_name || 'Изображение'}
                    className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                  />
                </div>

                {/* Навигация для фото */}
                {media.filter(m => m.media_type === 'image').length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const imageMedia = media.filter(m => m.media_type === 'image');
                        const currentImageIndex = imageMedia.findIndex(m => m.id === selectedMedia.id);
                        const prevIndex = (currentImageIndex - 1 + imageMedia.length) % imageMedia.length;
                        const prevMedia = imageMedia[prevIndex];
                        const prevGlobalIndex = media.findIndex(m => m.id === prevMedia.id);
                        setSelectedMedia(prevMedia);
                        setSelectedMediaIndex(prevGlobalIndex);
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 z-10"
                      title="Предыдущее фото"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const imageMedia = media.filter(m => m.media_type === 'image');
                        const currentImageIndex = imageMedia.findIndex(m => m.id === selectedMedia.id);
                        const nextIndex = (currentImageIndex + 1) % imageMedia.length;
                        const nextMedia = imageMedia[nextIndex];
                        const nextGlobalIndex = media.findIndex(m => m.id === nextMedia.id);
                        setSelectedMedia(nextMedia);
                        setSelectedMediaIndex(nextGlobalIndex);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 z-10"
                      title="Следующее фото"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>

                    {/* Счетчик для фото */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                      {media.filter(m => m.media_type === 'image').findIndex(m => m.id === selectedMedia.id) + 1} / {media.filter(m => m.media_type === 'image').length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div onClick={(e) => e.stopPropagation()} className="max-w-full max-h-[90vh]">
                <VideoPlayer
                  src={selectedMedia.media_url}
                  mimeType={selectedMedia.mime_type || undefined}
                  title={selectedMedia.file_name || 'Видео'}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

