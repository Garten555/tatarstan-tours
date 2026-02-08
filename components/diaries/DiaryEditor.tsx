'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Save, 
  Eye, 
  EyeOff, 
  Upload, 
  X, 
  Image as ImageIcon, 
  MapPin, 
  Calendar,
  Loader2,
  Trash2
} from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { CreateDiaryRequest, UpdateDiaryRequest, TravelDiary, DiaryMediaItem } from '@/types';
import { escapeHtml } from '@/lib/utils/sanitize';
import RichTextEditor from '@/components/admin/RichTextEditor';

interface DiaryEditorProps {
  diary?: TravelDiary;
  tourId?: string;
  bookingId?: string;
  onSave?: (diary: TravelDiary) => void;
  onCancel?: () => void;
}

// Экспортируем старый редактор для обратной совместимости
export function DiaryEditor({ diary, tourId, bookingId, onSave, onCancel }: DiaryEditorProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(!!tourId || !!bookingId); // Загружаем данные если есть tourId/bookingId
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  
  const [title, setTitle] = useState(diary?.title || '');
  const [content, setContent] = useState(diary?.content || '');
  const [travelDate, setTravelDate] = useState(diary?.travel_date || '');
  const [visibility, setVisibility] = useState<'private' | 'friends' | 'public'>(diary?.visibility || 'private');
  const [status, setStatus] = useState<'draft' | 'published' | 'private'>(diary?.status || 'draft');
  
  const [coverImage, setCoverImage] = useState<{ file: File; preview: string } | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState(diary?.cover_image_url || null);
  const [mediaItems, setMediaItems] = useState<DiaryMediaItem[]>(diary?.media_items || []);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [locationData, setLocationData] = useState<any>(diary?.location_data || null);
  
  const coverInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!diary;

  // Загрузка данных тура/бронирования при создании нового дневника
  useEffect(() => {
    if (isEditMode || (!tourId && !bookingId)) {
      setLoading(false);
      return;
    }

    const loadTourData = async () => {
      try {
        let actualTourId = tourId;
        
        // Если есть bookingId, получаем tour_id из бронирования
        if (bookingId && !tourId) {
          const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('tour_id, tour:tours(*)')
            .eq('id', bookingId)
            .single();

          if (bookingError || !booking) {
            toast.error('Бронирование не найдено');
            setLoading(false);
            return;
          }

          const bookingData = booking as any;
          actualTourId = bookingData.tour_id;
        }

        // Загружаем данные тура
        if (actualTourId) {
          const { data: tour, error: tourError } = await supabase
            .from('tours')
            .select(`
              id,
              title,
              start_date,
              end_date,
              cover_image,
              city:cities(name),
              locations,
              description,
              short_description
            `)
            .eq('id', actualTourId)
            .single();

          if (tourError || !tour) {
            toast.error('Тур не найден');
            setLoading(false);
            return;
          }

          const tourData = tour as any;

          // Автоматически заполняем поля
          if (!title) {
            setTitle(`Мое путешествие: ${tourData.title}`);
          }
          
          // Устанавливаем дату путешествия (дата начала тура)
          if (!travelDate && tourData.start_date) {
            const startDate = new Date(tourData.start_date);
            setTravelDate(startDate.toISOString().split('T')[0]);
          }

          // Устанавливаем обложку из тура
          if (!coverImageUrl && tourData.cover_image) {
            setCoverImageUrl(tourData.cover_image);
          }

          // Добавляем локации из тура в location_data
          if (tourData.locations && Array.isArray(tourData.locations) && tourData.locations.length > 0) {
            setLocationData({
              locations: tourData.locations.map((loc: any) => ({
                name: loc.name || loc,
                coordinates: loc.coordinates || null,
                description: loc.description || null,
              })),
              city: tourData.city?.name || null,
            });
          } else if (tourData.city?.name) {
            // Если нет локаций, но есть город
            setLocationData({
              locations: [{ name: tourData.city.name }],
              city: tourData.city.name,
            });
          }
          
          toast.success(`Загружены данные тура "${tourData.title}"`);

          // Добавляем описание тура в контент как начальный текст
          if (!content && tourData.description) {
            setContent(`<h2>О туре</h2><p>${tourData.description}</p>`);
          }
        }
      } catch (error: any) {
        console.error('Ошибка загрузки данных тура:', error);
        toast.error('Не удалось загрузить данные тура');
      } finally {
        setLoading(false);
      }
    };

    loadTourData();
  }, [tourId, bookingId, isEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Загрузка обложки
  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите изображение');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Изображение слишком большое (максимум 10MB)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverImage({ file, preview: reader.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Загрузка медиа в S3
  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingMedia(true);
    try {
      const newMediaItems: DiaryMediaItem[] = [];
      
      for (const file of files) {
        // Валидация размера
        const maxSize = file.type.startsWith('video/') ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
          toast.error(`Файл ${file.name} слишком большой (максимум ${maxSize / 1024 / 1024}MB)`);
          continue;
        }

        // Создаем превью для отображения
        let previewUrl = '';
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          previewUrl = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }

        // Загружаем в S3
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'diaries/media');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok || !uploadData.success) {
          toast.error(`Не удалось загрузить ${file.name}`);
          continue;
        }

        newMediaItems.push({
          type: file.type.startsWith('video/') ? 'video' : 'image',
          url: uploadData.url,
          path: uploadData.path,
          description: '',
          order: mediaItems.length + newMediaItems.length,
        });
      }

      if (newMediaItems.length > 0) {
        setMediaItems([...mediaItems, ...newMediaItems]);
        toast.success(`Загружено ${newMediaItems.length} медиа`);
      }
    } catch (error: any) {
      console.error('Ошибка загрузки медиа:', error);
      toast.error('Не удалось загрузить медиа');
    } finally {
      setUploadingMedia(false);
      if (mediaInputRef.current) {
        mediaInputRef.current.value = '';
      }
    }
  };

  const removeMediaItem = (index: number) => {
    setMediaItems(mediaItems.filter((_, i) => i !== index));
  };

  const updateMediaDescription = (index: number, description: string) => {
    const updated = [...mediaItems];
    updated[index] = { ...updated[index], description };
    setMediaItems(updated);
  };

  // Сохранение как черновик
  const handleSave = async () => {
    if (!title.trim() || title.trim().length < 3) {
      toast.error('Название дневника должно содержать минимум 3 символа');
      return;
    }

    setSaving(true);
    try {
      const payload: CreateDiaryRequest | UpdateDiaryRequest = {
        title: title.trim(),
        content: content.trim() || undefined,
        travel_date: travelDate || undefined,
        visibility,
        ...(tourId && { tour_id: tourId }),
        ...(bookingId && { booking_id: bookingId }),
        ...(coverImageUrl && { cover_image_url: coverImageUrl }),
        ...(mediaItems.length > 0 && { media_items: mediaItems }),
        ...(locationData && { location_data: locationData }),
      };

      let response: Response;
      if (isEditMode) {
        response = await fetch(`/api/diaries/${diary.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/diaries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось сохранить дневник');
      }

      toast.success('Дневник сохранен как черновик');
      
      if (onSave) {
        onSave(data.diary);
      } else {
        router.push(`/diaries/${data.diary.id}`);
      }
    } catch (error: any) {
      console.error('Ошибка сохранения дневника:', error);
      toast.error(error.message || 'Не удалось сохранить дневник');
    } finally {
      setSaving(false);
    }
  };

  // Публикация
  const handlePublish = async () => {
    if (!title.trim() || title.trim().length < 3) {
      toast.error('Название дневника должно содержать минимум 3 символа');
      return;
    }

    setPublishing(true);
    try {
      const payload: CreateDiaryRequest | UpdateDiaryRequest = {
        title: title.trim(),
        content: content.trim() || undefined,
        travel_date: travelDate || undefined,
        visibility,
        status: 'published',
        ...(tourId && { tour_id: tourId }),
        ...(bookingId && { booking_id: bookingId }),
        ...(coverImageUrl && { cover_image_url: coverImageUrl }),
        ...(mediaItems.length > 0 && { media_items: mediaItems }),
        ...(locationData && { location_data: locationData }),
      };

      let response: Response;
      if (isEditMode) {
        response = await fetch(`/api/diaries/${diary.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/diaries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, status: 'published' }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось опубликовать дневник');
      }

      toast.success('Дневник опубликован!');
      
      if (onSave) {
        onSave(data.diary);
      } else {
        router.push(`/diaries/${data.diary.id}`);
      }
    } catch (error: any) {
      console.error('Ошибка публикации дневника:', error);
      toast.error(error.message || 'Не удалось опубликовать дневник');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-xl">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">
        {isEditMode ? 'Редактировать дневник' : 'Создать дневник путешествия'}
      </h2>

      {/* Обложка */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Обложка дневника
        </label>
        <div className="relative">
          {coverImage ? (
            <div className="relative h-64 rounded-xl overflow-hidden">
              <Image
                src={coverImage.preview}
                alt="Обложка"
                fill
                className="object-cover"
              />
              <button
                onClick={() => {
                  setCoverImage(null);
                  if (coverInputRef.current) coverInputRef.current.value = '';
                }}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : coverImageUrl ? (
            <div className="relative h-64 rounded-xl overflow-hidden">
              <Image
                src={coverImageUrl}
                alt="Обложка"
                fill
                className="object-cover"
              />
              <button
                onClick={() => setCoverImageUrl(null)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-emerald-500 transition-colors">
              <div className="text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <span className="text-base text-gray-600 font-medium">Загрузить обложку</span>
              </div>
              <input
                type="file"
                accept="image/*"
                ref={coverInputRef}
                onChange={handleCoverSelect}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* Название */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Название дневника *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Например: Путешествие по Казани"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          maxLength={100}
        />
        <p className="text-xs text-gray-500 mt-1">{title.length}/100</p>
      </div>

      {/* Дата путешествия */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Calendar className="w-4 h-4 inline mr-1" />
          Дата путешествия
        </label>
        <input
          type="date"
          value={travelDate}
          onChange={(e) => setTravelDate(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Содержание - Rich Text Editor */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Содержание дневника
        </label>
        <div className="border border-gray-300 rounded-xl overflow-hidden">
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Расскажите о своем путешествии... Добавьте фотографии, опишите впечатления, поделитесь эмоциями!"
          />
        </div>
      </div>

      {/* Медиа галерея */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <ImageIcon className="w-4 h-4 inline mr-1" />
          Фотографии и видео ({mediaItems.length})
        </label>
        <label 
          className={`flex items-center justify-center h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors mb-4 ${
            uploadingMedia 
              ? 'border-emerald-500 bg-emerald-50' 
              : 'border-gray-300 hover:border-emerald-500 hover:bg-emerald-50'
          }`}
        >
          <div className="text-center">
            {uploadingMedia ? (
              <>
                <Loader2 className="w-8 h-8 text-emerald-500 mx-auto mb-1 animate-spin" />
                <span className="text-emerald-600 text-sm">Загрузка...</span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                <span className="text-gray-600 text-base font-medium">Перетащите файлы сюда или нажмите для выбора</span>
                <span className="text-sm text-gray-500 block mt-1">Изображения до 10MB, видео до 100MB</span>
              </>
            )}
          </div>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            ref={mediaInputRef}
            onChange={handleMediaSelect}
            className="hidden"
            disabled={uploadingMedia}
          />
        </label>

        {mediaItems.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {mediaItems.map((item, index) => (
              <div key={index} className="relative group bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                <div className="relative h-40 rounded-lg overflow-hidden">
                  {item.type === 'video' ? (
                    <video
                      src={item.url}
                      className="w-full h-full object-cover"
                      controls={false}
                    />
                  ) : (
                    <Image
                      src={item.url}
                      alt={`Медиа ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <button
                    onClick={() => removeMediaItem(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {item.type === 'video' && (
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      Видео
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <textarea
                    value={item.description || ''}
                    onChange={(e) => updateMediaDescription(index, e.target.value)}
                    placeholder="Добавьте описание..."
                    rows={2}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Видимость */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Видимость
        </label>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as 'private' | 'friends' | 'public')}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="private">Приватный (только я)</option>
          <option value="friends">Друзья (подписчики)</option>
          <option value="public">Публичный (все)</option>
        </select>
      </div>

      {/* Кнопки */}
      <div className="flex gap-4">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Отмена
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || publishing}
          className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Сохранить черновик
        </button>
        <button
          onClick={handlePublish}
          disabled={saving || publishing}
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
        >
          {publishing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
          Опубликовать
        </button>
      </div>
    </div>
  );
}

