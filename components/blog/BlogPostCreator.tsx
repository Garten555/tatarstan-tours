'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Loader2, Image as ImageIcon, Video, MapPin, X, Plus, Upload, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import PromptDialog from '@/components/ui/PromptDialog';

interface BlogPostCreatorProps {
  userId: string;
  completedTours?: any[];
}

export default function BlogPostCreator({ userId, completedTours = [] }: BlogPostCreatorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedTourId, setSelectedTourId] = useState<string>('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<Array<{ file: File; preview: string; type: 'image' | 'video'; url?: string }>>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [locationTags, setLocationTags] = useState<string[]>([]);
  const [newLocationTag, setNewLocationTag] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  
  const coverInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Автозаполнение из тура
  const handleTourSelect = (tourId: string) => {
    const tour = completedTours.find((t: any) => t.tour?.id === tourId);
    if (tour && tour.tour) {
      setSelectedTourId(tourId);
      if (!title) {
        setTitle(`Мое путешествие: ${tour.tour.title}`);
      }
      if (tour.tour.city?.name && !locationTags.includes(tour.tour.city.name)) {
        setLocationTags([...locationTags, tour.tour.city.name]);
      }
      if (tour.tour.cover_image && !coverImageUrl) {
        setCoverImageUrl(tour.tour.cover_image);
      }
      if (tour.tour.yandex_map_url && !mapUrl) {
        setMapUrl(tour.tour.yandex_map_url);
      }
      if (!content) {
        setContent(`Недавно я посетил(а) удивительный тур "${tour.tour.title}". Хочу поделиться своими впечатлениями!\n\n`);
      }
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Размер файла не должен превышать 5 МБ');
      return;
    }

    try {
      setUploadingCover(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'blog-covers');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setCoverImageUrl(data.url);
        toast.success('Обложка загружена');
      } else {
        throw new Error(data.error || 'Ошибка загрузки');
      }
    } catch (error: any) {
      console.error('Ошибка загрузки обложки:', error);
      toast.error(error.message || 'Ошибка загрузки обложки');
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingMedia(true);
    try {
      const newMediaFiles: Array<{ file: File; preview: string; type: 'image' | 'video'; url?: string }> = [];
      
      for (const file of files) {
        const maxSize = file.type.startsWith('video/') ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
          toast.error(`Файл ${file.name} слишком большой`);
          continue;
        }

        let preview = '';
        if (file.type.startsWith('image/')) {
          preview = URL.createObjectURL(file);
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'blog-media');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          newMediaFiles.push({
            file,
            preview,
            type: file.type.startsWith('video/') ? 'video' : 'image',
            url: data.url,
          });
        } else {
          toast.error(`Не удалось загрузить ${file.name}`);
        }
      }

      if (newMediaFiles.length > 0) {
        setMediaFiles([...mediaFiles, ...newMediaFiles]);
        toast.success(`Загружено ${newMediaFiles.length} медиа`);
      }
    } catch (error: any) {
      console.error('Ошибка загрузки медиа:', error);
      toast.error('Ошибка загрузки медиа');
    } finally {
      setUploadingMedia(false);
      if (mediaInputRef.current) mediaInputRef.current.value = '';
    }
  };

  const removeMedia = (index: number) => {
    const file = mediaFiles[index];
    if (file.preview) {
      URL.revokeObjectURL(file.preview);
    }
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
  };

  // Поиск городов из БД
  useEffect(() => {
    if (newLocationTag.length < 2) {
      setCities([]);
      setShowCityDropdown(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      fetch(`/api/admin/cities?search=${encodeURIComponent(newLocationTag)}`)
        .then(res => res.json())
        .then(data => {
          const foundCities = data.cities || [];
          setCities(foundCities);
          setShowCityDropdown(foundCities.length > 0);
        })
        .catch(() => {
          setCities([]);
          setShowCityDropdown(false);
        });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [newLocationTag]);

  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(event.target as Node) &&
        locationInputRef.current &&
        !locationInputRef.current.contains(event.target as Node)
      ) {
        setShowCityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addLocationTag = (cityName?: string) => {
    const tagToAdd = cityName || newLocationTag.trim();
    if (tagToAdd && !locationTags.includes(tagToAdd)) {
      setLocationTags([...locationTags, tagToAdd]);
      setNewLocationTag('');
      setCities([]);
      setShowCityDropdown(false);
    }
  };

  const removeLocationTag = (tag: string) => {
    setLocationTags(locationTags.filter(t => t !== tag));
  };

  const selectCity = (city: { id: string; name: string }) => {
    addLocationTag(city.name);
  };

  // Функция для автоматического преобразования ссылок на карты в iframe
  const processMapLinks = (text: string): string => {
    // Если текст уже содержит iframe, пропускаем обработку
    if (text.includes('<iframe') || text.includes('&lt;iframe')) {
      return text;
    }

    // Объединенный паттерн для всех картографических сервисов
    // Ищем URL, которые начинаются с http/https или без протокола, но содержат домены карт
    const mapUrlPattern = /\b(https?:\/\/)?(www\.)?(yandex\.ru\/(maps\/|map-widget\/v1\/)[^\s<>"']+|maps\.yandex\.ru\/[^\s<>"']+|google\.com\/maps\/[^\s<>"']+|maps\.google\.com\/[^\s<>"']+|2gis\.ru\/[^\s<>"']+|2gis\.com\/[^\s<>"']+)/gi;

    return text.replace(mapUrlPattern, (match, protocol, www, urlPart, offset) => {
      // offset - это позиция совпадения в исходном тексте
      // Проверяем, не находимся ли мы внутри HTML тега
      const beforeMatch = text.substring(0, offset);
      const lastOpenTag = beforeMatch.lastIndexOf('<');
      const lastCloseTag = beforeMatch.lastIndexOf('>');
      
      // Если мы внутри HTML тега, не обрабатываем
      if (lastOpenTag > lastCloseTag) {
        return match;
      }

      // Нормализуем URL
      let url = match.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      // Создаем iframe с единым стилем
      return `<div class="my-4 rounded-lg overflow-hidden border border-gray-200"><iframe src="${url}" width="100%" height="400" frameborder="0" style="border:0" allowfullscreen></iframe></div>`;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Заполните заголовок');
      return;
    }

    // Проверяем, что есть хотя бы текст, медиа или карта
    const hasContent = content.trim().length > 0;
    const hasMedia = mediaFiles.length > 0;
    const hasMap = mapUrl.trim().length > 0;
    
    if (!hasContent && !hasMedia && !hasMap) {
      toast.error('Добавьте текст, фото/видео или карту');
      return;
    }

    setLoading(true);
    try {
      // Формируем контент с медиа и картами
      let finalContent = content.trim();
      
      // Автоматически преобразуем ссылки на карты в тексте в iframe
      if (finalContent) {
        finalContent = processMapLinks(finalContent);
      }
      
      // Добавляем медиа в контент
      if (mediaFiles.length > 0) {
        const mediaHtml = mediaFiles.map((media, index) => {
          if (media.type === 'video') {
            return `<div class="my-4"><video controls class="w-full rounded-xl"><source src="${media.url}" type="video/mp4"></video></div>`;
          } else {
            return `<div class="my-4"><img src="${media.url}" alt="Изображение ${index + 1}" class="w-full rounded-xl" /></div>`;
          }
        }).join('\n');
        
        if (finalContent) {
          finalContent = `${finalContent}\n\n${mediaHtml}`;
        } else {
          finalContent = mediaHtml;
        }
      }

      // Добавляем карту из отдельного поля, если есть (и она еще не была добавлена автоматически)
      if (mapUrl.trim() && (!finalContent || !finalContent.includes(mapUrl))) {
        const mapHtml = `<div class="my-4 rounded-lg overflow-hidden border border-gray-200"><iframe src="${mapUrl}" width="100%" height="400" frameborder="0" style="border:0" allowfullscreen></iframe></div>`;
        if (finalContent) {
          finalContent = `${finalContent}\n\n${mapHtml}`;
        } else {
          finalContent = mapHtml;
        }
      }

      const response = await fetch('/api/blog/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          title,
          content: finalContent,
          cover_image_url: coverImageUrl,
          status: 'published',
          visibility: 'public',
          location_tags: locationTags,
          tour_id: selectedTourId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось создать пост');
      }

      toast.success('Пост создан!', {
        icon: <Check className="w-5 h-5 text-green-500" />,
        duration: 3000,
      });
      setTitle('');
      setContent('');
      setCoverImageUrl(null);
      setMediaFiles([]);
      setLocationTags([]);
      setMapUrl('');
      setShowForm(false);
      setSelectedTourId('');
      
      // Отправляем событие для обновления списка постов
      window.dispatchEvent(new CustomEvent('blog:post-created', { detail: { post: data.post } }));
    } catch (error: any) {
      toast.error(error.message || 'Ошибка создания поста');
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <div 
        onClick={() => setShowForm(true)}
        className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm cursor-pointer hover:border-gray-300 transition-colors"
      >
        <div className="flex items-center gap-3 text-gray-500">
          <div className="flex-shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="text-base">Что у вас нового?</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Выбор тура для автозаполнения */}
        {completedTours.length > 0 && (
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">
              Выберите тур для автозаполнения (необязательно)
            </label>
            <select
              value={selectedTourId}
              onChange={(e) => handleTourSelect(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 text-lg bg-white"
            >
              <option value="">Не выбирать тур</option>
              {completedTours.map((booking: any) => {
                if (!booking.tour) return null;
                return (
                  <option key={booking.tour.id} value={booking.tour.id}>
                    {booking.tour.title} {booking.tour.city?.name ? `(${booking.tour.city.name})` : ''}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Заголовок */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Заголовок поста..."
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 text-xl"
          required
        />

        {/* Содержание */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Что у вас нового? (необязательно) Вы можете просто вставить ссылку на карту (Yandex Maps, Google Maps, 2GIS) прямо в текст, и она автоматически отобразится."
          rows={8}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 resize-none text-lg"
        />

        {/* Обложка - компактная */}
        {coverImageUrl && (
          <div className="relative rounded-lg overflow-hidden">
            <Image
              src={coverImageUrl}
              alt="Обложка"
              width={600}
              height={300}
              className="w-full h-48 object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCoverImageUrl(null);
              }}
              className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full z-10"
              title="Удалить обложку"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Медиа - компактная сетка */}
        {mediaFiles.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {mediaFiles.map((media, index) => (
              <div key={index} className="relative group aspect-square">
                {media.type === 'video' ? (
                  <video
                    src={media.preview || media.url}
                    className="w-full h-full object-cover rounded-lg"
                    controls
                  />
                ) : (
                  <Image
                    src={media.preview || media.url || ''}
                    alt={`Медиа ${index + 1}`}
                    width={150}
                    height={150}
                    className="w-full h-full object-cover rounded-lg"
                  />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeMedia(index);
                  }}
                  className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="Удалить медиа"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Карта - компактная */}
        {mapUrl && (
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <iframe
              src={mapUrl}
              width="100%"
              height="250"
              frameBorder="0"
              style={{ border: 0 }}
              allowFullScreen
            />
          </div>
        )}

        {/* Локации - компактные теги */}
        {locationTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {locationTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
              >
                <MapPin className="w-3 h-3" />
                {tag}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeLocationTag(tag);
                  }}
                  className="hover:text-red-500"
                  title="Удалить тег"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Панель инструментов */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <div className="flex items-center gap-1">
            {/* Загрузка обложки */}
            <label className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors" title="Добавить обложку">
              <ImageIcon className="w-5 h-5 text-gray-600" />
              <input
                ref={coverInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleCoverUpload}
                disabled={uploadingCover}
              />
            </label>
            {/* Загрузка медиа/видео */}
            <label className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors" title="Добавить фото/видео">
              <Video className="w-5 h-5 text-gray-600" />
              <input
                ref={mediaInputRef}
                type="file"
                className="hidden"
                accept="image/*,video/*"
                multiple
                onChange={handleMediaSelect}
                disabled={uploadingMedia}
              />
            </label>
            {/* Добавление карты */}
            <button
              type="button"
              onClick={() => setShowMapDialog(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Добавить карту"
            >
              <MapPin className="w-5 h-5 text-gray-600" />
            </button>
            {/* Добавление локации с автодополнением */}
            <div className="relative flex items-center gap-1">
              <div className="relative">
                <input
                  ref={locationInputRef}
                  type="text"
                  value={newLocationTag}
                  onChange={(e) => setNewLocationTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (cities.length > 0) {
                        selectCity(cities[0]);
                      } else {
                        addLocationTag();
                      }
                    }
                  }}
                  onFocus={() => {
                    if (cities.length > 0) {
                      setShowCityDropdown(true);
                    }
                  }}
                  placeholder="Место"
                  className="px-3 py-1.5 border-2 border-gray-200 rounded-lg text-sm w-32 md:w-40 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                {showCityDropdown && cities.length > 0 && (
                  <div
                    ref={cityDropdownRef}
                    className="absolute top-full left-0 mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto w-full"
                  >
                    {cities.map((city) => (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() => selectCity(city)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center gap-2"
                      >
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        {city.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => addLocationTag()}
                className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors"
                title="Добавить место"
              >
                <Plus className="w-4 h-4 text-emerald-600" />
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Публикация...</span>
              </>
            ) : (
              'Опубликовать'
            )}
          </button>
        </div>
        {(uploadingCover || uploadingMedia) && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            Загрузка...
          </div>
        )}
      </form>
      
      {/* Диалог для добавления карты */}
      <PromptDialog
        isOpen={showMapDialog}
        title="Добавить карту"
        message="Вставьте URL карты (iframe) для отображения на карте в вашем посте"
        placeholder="https://yandex.ru/map-widget/v1/..."
        defaultValue={mapUrl}
        confirmText="Добавить"
        cancelText="Отмена"
        onConfirm={(url) => {
          if (url.trim()) {
            setMapUrl(url.trim());
          }
          setShowMapDialog(false);
        }}
        onCancel={() => setShowMapDialog(false)}
      />
    </div>
  );
}
