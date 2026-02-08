'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  Trash2,
  Plus,
  GripVertical,
  FileText,
  Video,
  Globe,
  Settings,
  Layout,
  MoveUp,
  MoveDown
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

type ContentBlock = 
  | { type: 'text'; id: string; content: string }
  | { type: 'image'; id: string; url: string; path: string; description: string }
  | { type: 'video'; id: string; url: string; path: string; description: string }
  | { type: 'gallery'; id: string; items: DiaryMediaItem[] }
  | { type: 'map'; id: string; location: { name: string; coordinates?: [number, number] } | null };

export function InteractiveDiaryEditor({ diary, tourId, bookingId, onSave, onCancel }: DiaryEditorProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(!!tourId || !!bookingId);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  
  const [title, setTitle] = useState(diary?.title || '');
  const [travelDate, setTravelDate] = useState(diary?.travel_date || '');
  const [visibility, setVisibility] = useState<'private' | 'friends' | 'public'>(diary?.visibility || 'private');
  const [status, setStatus] = useState<'draft' | 'published' | 'private'>(diary?.status || 'draft');
  
  const [coverImageUrl, setCoverImageUrl] = useState(diary?.cover_image_url || null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  
  // Блочный редактор контента
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>(() => {
    if (diary?.content) {
      // Парсим существующий контент в блоки
      return [{ type: 'text', id: 'block-1', content: diary.content }];
    }
    return [];
  });
  
  const [mediaItems, setMediaItems] = useState<DiaryMediaItem[]>(diary?.media_items || []);
  const [locationData, setLocationData] = useState<any>(diary?.location_data || null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  
  const coverInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!diary;

  // Загрузка данных тура/бронирования
  useEffect(() => {
    if (isEditMode || (!tourId && !bookingId)) {
      setLoading(false);
      return;
    }

    const loadTourData = async () => {
      try {
        let actualTourId = tourId;
        
        if (bookingId && !tourId) {
          const { data: booking } = await supabase
            .from('bookings')
            .select('tour_id, tour:tours(*)')
            .eq('id', bookingId)
            .single();

          if (!booking) {
            toast.error('Бронирование не найдено');
            setLoading(false);
            return;
          }
          const bookingData = booking as any;
          actualTourId = bookingData.tour_id;
        }

        if (actualTourId) {
          const { data: tour } = await supabase
            .from('tours')
            .select(`
              id,
              title,
              start_date,
              end_date,
              cover_image,
              city:cities(name),
              locations,
              description
            `)
            .eq('id', actualTourId)
            .single();

          if (!tour) {
            toast.error('Тур не найден');
            setLoading(false);
            return;
          }

          const tourData = tour as any;

          if (!title) setTitle(`Мое путешествие: ${tourData.title}`);
          if (!travelDate && tourData.start_date) {
            const startDate = new Date(tourData.start_date);
            setTravelDate(startDate.toISOString().split('T')[0]);
          }
          if (!coverImageUrl && tourData.cover_image) {
            setCoverImageUrl(tourData.cover_image);
          }

          if (tourData.locations && Array.isArray(tourData.locations) && tourData.locations.length > 0) {
            setLocationData({
              locations: tourData.locations.map((loc: any) => ({
                name: loc.name || loc,
                coordinates: loc.coordinates || null,
              })),
              city: tourData.city?.name || null,
            });
          }

          // Добавляем начальный текстовый блок с описанием тура
          if (contentBlocks.length === 0 && tourData.description) {
            setContentBlocks([{
              type: 'text',
              id: `block-${Date.now()}`,
              content: `<h2>О туре</h2><p>${tourData.description}</p>`
            }]);
          }

          toast.success(`Загружены данные тура "${tourData.title}"`);
        }
      } catch (error: any) {
        console.error('Ошибка загрузки данных тура:', error);
        toast.error('Не удалось загрузить данные тура');
      } finally {
        setLoading(false);
      }
    };

    loadTourData();
  }, [tourId, bookingId, isEditMode]);

  // Добавление нового блока
  const addBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = 
      type === 'text' ? { type: 'text', id: `block-${Date.now()}`, content: '' } :
      type === 'image' ? { type: 'image', id: `block-${Date.now()}`, url: '', path: '', description: '' } :
      type === 'video' ? { type: 'video', id: `block-${Date.now()}`, url: '', path: '', description: '' } :
      type === 'gallery' ? { type: 'gallery', id: `block-${Date.now()}`, items: [] } :
      { type: 'map', id: `block-${Date.now()}`, location: null };
    
    setContentBlocks([...contentBlocks, newBlock]);
  };

  // Удаление блока
  const removeBlock = (id: string) => {
    setContentBlocks(contentBlocks.filter(b => b.id !== id));
  };

  // Перемещение блока
  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = contentBlocks.findIndex(b => b.id === id);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= contentBlocks.length) return;
    
    const newBlocks = [...contentBlocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setContentBlocks(newBlocks);
  };

  // Обновление блока
  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    setContentBlocks((prev) =>
      prev.map((b) => (b.id === id ? ({ ...b, ...updates } as ContentBlock) : b))
    );
  };

  // Загрузка обложки
  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setCoverImageFile(file);
    setUploadingCover(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'diaries/covers');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Не удалось загрузить обложку');
      }

      setCoverImageUrl(data.url);
      toast.success('Обложка загружена!');
    } catch (error: any) {
      console.error('Ошибка загрузки обложки:', error);
      toast.error('Не удалось загрузить обложку');
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  // Загрузка медиа в блок
  const handleMediaUpload = async (blockId: string, files: File[]) => {
    setUploadingMedia(true);
    try {
      for (const file of files) {
        const maxSize = file.type.startsWith('video/') ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
          toast.error(`Файл ${file.name} слишком большой`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'diaries/media');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          toast.error(`Не удалось загрузить ${file.name}`);
          continue;
        }

        const block = contentBlocks.find(b => b.id === blockId);
        if (!block) continue;

        if (block.type === 'image' || block.type === 'video') {
          updateBlock(blockId, {
            url: data.url,
            path: data.path,
            type: file.type.startsWith('video/') ? 'video' : 'image',
          } as any);
        } else if (block.type === 'gallery') {
          const newItem: DiaryMediaItem = {
            type: file.type.startsWith('video/') ? 'video' : 'image',
            url: data.url,
            path: data.path,
            description: '',
            order: block.items.length,
          };
          updateBlock(blockId, {
            items: [...block.items, newItem],
          } as any);
        }
      }
      toast.success('Медиа загружено!');
    } catch (error: any) {
      console.error('Ошибка загрузки медиа:', error);
      toast.error('Не удалось загрузить медиа');
    } finally {
      setUploadingMedia(false);
    }
  };

  // Drag & Drop обработчики
  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    setDraggedBlockId(blockId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    if (!draggedBlockId || draggedBlockId === targetBlockId) return;

    const draggedIndex = contentBlocks.findIndex(b => b.id === draggedBlockId);
    const targetIndex = contentBlocks.findIndex(b => b.id === targetBlockId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newBlocks = [...contentBlocks];
    const [removed] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(targetIndex, 0, removed);
    setContentBlocks(newBlocks);
    setDraggedBlockId(null);
  };

  // Сохранение
  const handleSave = async () => {
    if (!title.trim() || title.trim().length < 3) {
      toast.error('Название дневника должно содержать минимум 3 символа');
      return;
    }

    setSaving(true);
    try {
      // Конвертируем блоки в HTML контент
      const content = contentBlocks.map(block => {
        if (block.type === 'text') return block.content;
        if (block.type === 'image') return `<figure><img src="${block.url}" alt="${block.description}" /><figcaption>${block.description}</figcaption></figure>`;
        if (block.type === 'video') return `<video controls><source src="${block.url}" /></video><p>${block.description}</p>`;
        if (block.type === 'gallery') {
          return `<div class="gallery">${block.items.map(item => 
            `<figure><img src="${item.url}" alt="${item.description}" /><figcaption>${item.description}</figcaption></figure>`
          ).join('')}</div>`;
        }
        if (block.type === 'map' && block.location) {
          return `<div class="map-location"><h3>${block.location.name}</h3></div>`;
        }
        return '';
      }).join('');

      // Собираем все медиа из блоков
      const allMedia: DiaryMediaItem[] = [];
      contentBlocks.forEach(block => {
        if (block.type === 'image' && block.url) {
          allMedia.push({ type: 'image', url: block.url, path: block.path, description: block.description, order: allMedia.length });
        } else if (block.type === 'video' && block.url) {
          allMedia.push({ type: 'video', url: block.url, path: block.path, description: block.description, order: allMedia.length });
        } else if (block.type === 'gallery') {
          allMedia.push(...block.items.map((item, idx) => ({ ...item, order: allMedia.length + idx })));
        }
      });

      const payload: CreateDiaryRequest | UpdateDiaryRequest = {
        title: title.trim(),
        content: content || undefined,
        travel_date: travelDate || undefined,
        visibility,
        ...(tourId && { tour_id: tourId }),
        ...(bookingId && { booking_id: bookingId }),
        ...(coverImageUrl && { cover_image_url: coverImageUrl }),
        ...(allMedia.length > 0 && { media_items: allMedia }),
        ...(locationData && { location_data: locationData }),
      };

      const url = isEditMode ? `/api/diaries/${diary.id}` : '/api/diaries';
      const method = isEditMode ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

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
      const content = contentBlocks.map(block => {
        if (block.type === 'text') return block.content;
        if (block.type === 'image') return `<figure><img src="${block.url}" alt="${block.description}" /><figcaption>${block.description}</figcaption></figure>`;
        if (block.type === 'video') return `<video controls><source src="${block.url}" /></video><p>${block.description}</p>`;
        if (block.type === 'gallery') {
          return `<div class="gallery">${block.items.map(item => 
            `<figure><img src="${item.url}" alt="${item.description}" /><figcaption>${item.description}</figcaption></figure>`
          ).join('')}</div>`;
        }
        if (block.type === 'map' && block.location) {
          return `<div class="map-location"><h3>${block.location.name}</h3></div>`;
        }
        return '';
      }).join('');

      const allMedia: DiaryMediaItem[] = [];
      contentBlocks.forEach(block => {
        if (block.type === 'image' && block.url) {
          allMedia.push({ type: 'image', url: block.url, path: block.path, description: block.description, order: allMedia.length });
        } else if (block.type === 'video' && block.url) {
          allMedia.push({ type: 'video', url: block.url, path: block.path, description: block.description, order: allMedia.length });
        } else if (block.type === 'gallery') {
          allMedia.push(...block.items.map((item, idx) => ({ ...item, order: allMedia.length + idx })));
        }
      });

      const payload: CreateDiaryRequest | UpdateDiaryRequest = {
        title: title.trim(),
        content: content || undefined,
        travel_date: travelDate || undefined,
        visibility,
        status: 'published',
        ...(tourId && { tour_id: tourId }),
        ...(bookingId && { booking_id: bookingId }),
        ...(coverImageUrl && { cover_image_url: coverImageUrl }),
        ...(allMedia.length > 0 && { media_items: allMedia }),
        ...(locationData && { location_data: locationData }),
      };

      const url = isEditMode ? `/api/diaries/${diary.id}` : '/api/diaries';
      const method = isEditMode ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Заголовок и вкладки */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900">
              {isEditMode ? 'Редактировать дневник' : 'Создать дневник путешествия'}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('edit')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'edit'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Layout className="w-4 h-4 inline mr-2" />
                Редактор
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Eye className="w-4 h-4 inline mr-2" />
                Предпросмотр
              </button>
            </div>
          </div>

          {/* Основные настройки */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
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
            </div>
            <div>
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
          </div>

          {/* Обложка */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Обложка дневника
            </label>
            <div className="relative">
              {coverImageUrl ? (
                <div className="relative h-64 rounded-xl overflow-hidden border-2 border-gray-200">
                  <Image
                    src={coverImageUrl}
                    alt="Обложка"
                    fill
                    className="object-cover"
                  />
                  <button
                    onClick={() => {
                      setCoverImageUrl(null);
                      setCoverImageFile(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-emerald-500 transition-colors">
                  <div className="text-center">
                    {uploadingCover ? (
                      <Loader2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 animate-spin" />
                    ) : (
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    )}
                    <span className="text-base text-gray-600 font-medium">Загрузить обложку</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    ref={coverInputRef}
                    onChange={handleCoverSelect}
                    className="hidden"
                    disabled={uploadingCover}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Редактор или предпросмотр */}
        {activeTab === 'edit' ? (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Блоки контента</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => addBlock('text')}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Текст
                </button>
                <button
                  onClick={() => addBlock('image')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  Фото
                </button>
                <button
                  onClick={() => addBlock('video')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  Видео
                </button>
                <button
                  onClick={() => addBlock('gallery')}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  Галерея
                </button>
                <button
                  onClick={() => addBlock('map')}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Карта
                </button>
              </div>
            </div>

            {/* Блоки контента */}
            <div className="space-y-4">
              {contentBlocks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-semibold mb-2">Начните создавать дневник</p>
                  <p className="text-sm">Добавьте первый блок контента выше</p>
                </div>
              ) : (
                contentBlocks.map((block, index) => (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, block.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, block.id)}
                    className="border-2 border-gray-200 rounded-xl p-4 hover:border-emerald-500 transition-colors bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                        <span className="text-sm font-medium text-gray-600">
                          {block.type === 'text' && '📝 Текст'}
                          {block.type === 'image' && '🖼️ Фото'}
                          {block.type === 'video' && '🎥 Видео'}
                          {block.type === 'gallery' && '🖼️ Галерея'}
                          {block.type === 'map' && '🗺️ Карта'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => moveBlock(block.id, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          title="Вверх"
                        >
                          <MoveUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveBlock(block.id, 'down')}
                          disabled={index === contentBlocks.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          title="Вниз"
                        >
                          <MoveDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeBlock(block.id)}
                          className="p-1 text-red-400 hover:text-red-600"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Рендер блока */}
                    {block.type === 'text' && (
                      <div className="border border-gray-300 rounded-lg overflow-hidden">
                        <RichTextEditor
                          content={block.content}
                          onChange={(content) => updateBlock(block.id, { content })}
                          placeholder="Начните писать..."
                        />
                      </div>
                    )}

                    {block.type === 'image' && (
                      <div>
                        {block.url ? (
                          <div className="relative">
                            <Image
                              src={block.url}
                              alt={block.description}
                              width={800}
                              height={400}
                              className="w-full h-auto rounded-lg"
                            />
                            <input
                              type="text"
                              value={block.description}
                              onChange={(e) => updateBlock(block.id, { description: e.target.value })}
                              placeholder="Описание фото..."
                              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                        ) : (
                          <label className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500">
                            <div className="text-center">
                              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                              <span className="text-base text-gray-600 font-medium">Загрузить фото</span>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length > 0) handleMediaUpload(block.id, files);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    )}

                    {block.type === 'video' && (
                      <div>
                        {block.url ? (
                          <div>
                            <video src={block.url} controls className="w-full rounded-lg" />
                            <input
                              type="text"
                              value={block.description}
                              onChange={(e) => updateBlock(block.id, { description: e.target.value })}
                              placeholder="Описание видео..."
                              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                        ) : (
                          <label className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500">
                            <div className="text-center">
                              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                              <span className="text-base text-gray-600 font-medium">Загрузить видео</span>
                            </div>
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length > 0) handleMediaUpload(block.id, files);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    )}

                    {block.type === 'gallery' && (
                      <div>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          {block.items.map((item, idx) => (
                            <div key={idx} className="relative">
                              {item.type === 'image' ? (
                                <Image
                                  src={item.url}
                                  alt={item.description || 'Фото'}
                                  width={200}
                                  height={200}
                                  className="w-full h-32 object-cover rounded-lg"
                                />
                              ) : (
                                <video src={item.url} className="w-full h-32 object-cover rounded-lg" />
                              )}
                              <button
                                onClick={() => {
                                  const newItems = block.items.filter((_, i) => i !== idx);
                                  updateBlock(block.id, { items: newItems });
                                }}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <label className="flex items-center justify-center h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500">
                          <div className="text-center">
                            <Plus className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                            <span className="text-sm text-gray-600">Добавить в галерею</span>
                          </div>
                          <input
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              if (files.length > 0) handleMediaUpload(block.id, files);
                            }}
                          />
                        </label>
                      </div>
                    )}

                    {block.type === 'map' && (
                      <div>
                        <input
                          type="text"
                          value={block.location?.name || ''}
                          onChange={(e) => updateBlock(block.id, { 
                            location: { name: e.target.value } 
                          })}
                          placeholder="Название места..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          💡 Интерактивная карта будет добавлена позже
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          // Предпросмотр
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Предпросмотр дневника</h3>
            {coverImageUrl && (
              <div className="relative h-64 rounded-xl overflow-hidden mb-6">
                <Image
                  src={coverImageUrl}
                  alt="Обложка"
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{title || 'Без названия'}</h1>
            {travelDate && (
              <p className="text-gray-600 mb-6">
                <Calendar className="w-4 h-4 inline mr-1" />
                {new Date(travelDate).toLocaleDateString('ru-RU')}
              </p>
            )}
            <div className="prose max-w-none">
              {contentBlocks.map(block => {
                if (block.type === 'text') {
                  return <div key={block.id} dangerouslySetInnerHTML={{ __html: block.content }} />;
                }
                if (block.type === 'image' && block.url) {
                  return (
                    <figure key={block.id} className="my-6">
                      <Image src={block.url} alt={block.description} width={800} height={400} className="w-full rounded-lg" />
                      {block.description && <figcaption className="text-center text-gray-600 mt-2">{block.description}</figcaption>}
                    </figure>
                  );
                }
                if (block.type === 'video' && block.url) {
                  return (
                    <div key={block.id} className="my-6">
                      <video src={block.url} controls className="w-full rounded-lg" />
                      {block.description && <p className="text-center text-gray-600 mt-2">{block.description}</p>}
                    </div>
                  );
                }
                if (block.type === 'gallery') {
                  return (
                    <div key={block.id} className="grid grid-cols-3 gap-4 my-6">
                      {block.items.map((item, idx) => (
                        <div key={idx}>
                          {item.type === 'image' ? (
                            <Image src={item.url} alt={item.description || 'Фото'} width={300} height={300} className="w-full h-48 object-cover rounded-lg" />
                          ) : (
                            <video src={item.url} className="w-full h-48 object-cover rounded-lg" />
                          )}
                        </div>
                      ))}
                    </div>
                  );
                }
                if (block.type === 'map' && block.location) {
                  return (
                    <div key={block.id} className="my-6 p-4 bg-gray-100 rounded-lg">
                      <MapPin className="w-5 h-5 inline mr-2" />
                      <span className="font-semibold">{block.location.name}</span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}

        {/* Настройки и действия */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4 inline mr-1" />
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
          </div>

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
      </div>
    </div>
  );
}







