'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Save, 
  Eye, 
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
  MoveDown,
  Route,
  Clock,
  Camera,
  Sparkles,
  Compass,
  Heart,
  Sun,
  Cloud,
  Wind,
  Map,
  Navigation,
  Zap
} from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { CreateDiaryRequest, UpdateDiaryRequest, TravelDiary, DiaryMediaItem } from '@/types';
import { escapeHtml, sanitizeRichHtml } from '@/lib/utils/sanitize';
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
  | { type: 'image'; id: string; url: string; path: string; description: string; location?: { name: string; coordinates?: [number, number] } }
  | { type: 'video'; id: string; url: string; path: string; description: string; location?: { name: string; coordinates?: [number, number] } }
  | { type: 'gallery'; id: string; items: DiaryMediaItem[] }
  | { type: 'map'; id: string; locations: Array<{ name: string; coordinates?: [number, number]; description?: string }> }
  | { type: 'timeline'; id: string; events: Array<{ time: string; title: string; description: string; media?: string }> }
  | { type: 'route'; id: string; waypoints: Array<{ name: string; coordinates?: [number, number]; order: number }> }
  | { type: 'weather'; id: string; date: string; temperature?: number; condition?: string; icon?: string }
  | { type: 'mood'; id: string; date: string; emotion: string; intensity: number; note?: string };

export function UniqueDiaryEditor({ diary, tourId, bookingId, onSave, onCancel }: DiaryEditorProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(!!tourId || !!bookingId);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'map' | 'timeline'>('edit');
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ name: string; coordinates?: [number, number] } | null>(null);
  
  const [title, setTitle] = useState(diary?.title || '');
  const [travelDate, setTravelDate] = useState(diary?.travel_date || '');
  const [visibility, setVisibility] = useState<'private' | 'friends' | 'public'>(diary?.visibility || 'private');
  const [status, setStatus] = useState<'draft' | 'published' | 'private'>(diary?.status || 'draft');
  
  const [coverImageUrl, setCoverImageUrl] = useState(diary?.cover_image_url || null);
  const [uploadingCover, setUploadingCover] = useState(false);
  
  // Блочный редактор контента
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>(() => {
    if (diary?.content) {
      return [{ type: 'text', id: 'block-1', content: diary.content }];
    }
    return [];
  });
  const [tourDataLoaded, setTourDataLoaded] = useState(false);
  
  const [mediaItems, setMediaItems] = useState<DiaryMediaItem[]>(diary?.media_items || []);
  const [locationData, setLocationData] = useState<any>(diary?.location_data || null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  
  // Уникальные функции
  const [autoDetectLocations, setAutoDetectLocations] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);
  const [travelRoute, setTravelRoute] = useState<Array<{ name: string; coordinates?: [number, number]; time?: string }>>([]);
  
  const coverInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!diary;

  // Загрузка данных тура
  useEffect(() => {
    if (isEditMode || tourDataLoaded || (!tourId && !bookingId)) {
      if (!tourId && !bookingId) {
        setLoading(false);
      }
      return;
    }

    const loadTourData = async () => {
      try {
        console.log('[Diary Editor] Загрузка данных тура...', { tourId, bookingId });
        let actualTourId = tourId;
        
        if (bookingId && !tourId) {
          console.log('[Diary Editor] Получение данных тура из бронирования...', bookingId);
          
          // Используем API endpoint для получения данных
          const response = await fetch(`/api/bookings/${bookingId}/tour-data`);
          if (!response.ok) {
            const errorData = await response.json();
            console.error('[Diary Editor] Ошибка получения данных бронирования:', errorData);
            toast.error(errorData.error || 'Бронирование не найдено');
            setLoading(false);
            return;
          }

          const { booking, tour } = await response.json();
          
          if (!tour) {
            toast.error('Данные тура не найдены');
            setLoading(false);
            return;
          }

          const bookingData = booking as any;
          const tourData = tour as any;
          console.log('[Diary Editor] Данные тура получены из API:', tourData);
          
          actualTourId = bookingData.tour_id;
          
          // Заполняем поля из данных тура
          if (!title || title.trim() === '') {
            setTitle(`Мое путешествие: ${tourData.title}`);
          }
          
          if (!travelDate && tourData.start_date) {
            const startDate = new Date(tourData.start_date);
            setTravelDate(startDate.toISOString().split('T')[0]);
          }
          
          if (!coverImageUrl && tourData.cover_image) {
            setCoverImageUrl(tourData.cover_image);
          }

          // Создаем маршрут из данных тура
          if (tourData.yandex_map_data && (tourData.yandex_map_data as any).markers) {
            const markers = (tourData.yandex_map_data as any).markers;
            setTravelRoute(markers.map((m: any, idx: number) => ({
              name: m.title || `Точка ${idx + 1}`,
              coordinates: m.coordinates,
              time: tourData.start_date,
            })));
          }

          // Обрабатываем локации
          if (tourData.locations && Array.isArray(tourData.locations) && tourData.locations.length > 0) {
            setLocationData({
              locations: tourData.locations.map((loc: any) => ({
                name: loc.name || loc,
                coordinates: loc.coordinates || null,
              })),
              city: tourData.city?.name || null,
            });
          }

          // Создаем начальные блоки только если их еще нет
          setContentBlocks(prevBlocks => {
            if (prevBlocks.length > 0) {
              return prevBlocks; // Не перезаписываем существующие блоки
            }

            const newBlocks: ContentBlock[] = [];

            // Добавляем текстовый блок с описанием тура
            const tourDescription = tourData.full_desc || tourData.description || tourData.short_desc;
            if (tourDescription) {
              newBlocks.push({
                type: 'text',
                id: `block-${Date.now()}-text`,
                content: `<h2>О туре "${tourData.title}"</h2><p>${tourDescription}</p>`
              });
            }

            // Добавляем блок карты с локациями
            if (tourData.locations && Array.isArray(tourData.locations) && tourData.locations.length > 0) {
              newBlocks.push({
                type: 'map',
                id: `block-${Date.now()}-map`,
                locations: tourData.locations.map((loc: any) => ({
                  name: loc.name || loc,
                  coordinates: loc.coordinates,
                  description: loc.description,
                })),
              });
            }

            // Если есть маршрут, добавляем блок маршрута
            if (tourData.yandex_map_data && (tourData.yandex_map_data as any).markers) {
              const markers = (tourData.yandex_map_data as any).markers;
              newBlocks.push({
                type: 'route',
                id: `block-${Date.now()}-route`,
                waypoints: markers.map((m: any, idx: number) => ({
                  name: m.title || `Точка ${idx + 1}`,
                  coordinates: m.coordinates,
                  order: idx + 1,
                })),
              });
            }

            return newBlocks.length > 0 ? newBlocks : prevBlocks;
          });

          setTourDataLoaded(true);
          toast.success(`✨ Загружены данные тура "${tourData.title}"`);
          setLoading(false);
          return; // Не продолжаем загрузку тура, так как уже получили все данные
        }

        if (actualTourId) {
          console.log('[Diary Editor] Загрузка данных тура...', actualTourId);
          
          // Используем обычный клиент (RLS работает для туров)
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
              short_desc,
              full_desc,
              yandex_map_data
            `)
            .eq('id', actualTourId)
            .single();

          if (tourError) {
            console.error('[Diary Editor] Ошибка загрузки тура:', tourError);
            toast.error('Тур не найден');
            setLoading(false);
            return;
          }

          if (!tour) {
            toast.error('Тур не найден');
            setLoading(false);
            return;
          }

          const tourData = tour as any;
          console.log('[Diary Editor] Данные тура загружены:', tourData);

          // Заполняем поля
          if (!title || title.trim() === '') {
            setTitle(`Мое путешествие: ${tourData.title}`);
          }
          
          if (!travelDate && tourData.start_date) {
            const startDate = new Date(tourData.start_date);
            setTravelDate(startDate.toISOString().split('T')[0]);
          }
          
          if (!coverImageUrl && tourData.cover_image) {
            setCoverImageUrl(tourData.cover_image);
          }

          // Создаем маршрут из данных тура
          if (tourData.yandex_map_data && (tourData.yandex_map_data as any).markers) {
            const markers = (tourData.yandex_map_data as any).markers;
            setTravelRoute(markers.map((m: any, idx: number) => ({
              name: m.title || `Точка ${idx + 1}`,
              coordinates: m.coordinates,
              time: tourData.start_date,
            })));
          }

          // Обрабатываем локации
          if (tourData.locations && Array.isArray(tourData.locations) && tourData.locations.length > 0) {
            setLocationData({
              locations: tourData.locations.map((loc: any) => ({
                name: loc.name || loc,
                coordinates: loc.coordinates || null,
              })),
              city: tourData.city?.name || null,
            });
          }

          // Создаем начальные блоки только если их еще нет
          setContentBlocks(prevBlocks => {
            if (prevBlocks.length > 0) {
              return prevBlocks; // Не перезаписываем существующие блоки
            }

            const newBlocks: ContentBlock[] = [];

            // Добавляем текстовый блок с описанием тура (используем full_desc или description)
            const tourDescription = tourData.full_desc || tourData.description || tourData.short_desc;
            if (tourDescription) {
              newBlocks.push({
                type: 'text',
                id: `block-${Date.now()}-text`,
                content: `<h2>О туре "${tourData.title}"</h2><p>${tourDescription}</p>`
              });
            }

            // Добавляем блок карты с локациями
            if (tourData.locations && Array.isArray(tourData.locations) && tourData.locations.length > 0) {
              newBlocks.push({
                type: 'map',
                id: `block-${Date.now()}-map`,
                locations: tourData.locations.map((loc: any) => ({
                  name: loc.name || loc,
                  coordinates: loc.coordinates,
                  description: loc.description,
                })),
              });
            }

            // Если есть маршрут, добавляем блок маршрута
            if (tourData.yandex_map_data && (tourData.yandex_map_data as any).markers) {
              const markers = (tourData.yandex_map_data as any).markers;
              newBlocks.push({
                type: 'route',
                id: `block-${Date.now()}-route`,
                waypoints: markers.map((m: any, idx: number) => ({
                  name: m.title || `Точка ${idx + 1}`,
                  coordinates: m.coordinates,
                  order: idx + 1,
                })),
              });
            }

            return newBlocks.length > 0 ? newBlocks : prevBlocks;
          });

          setTourDataLoaded(true);
          toast.success(`✨ Загружены данные тура "${tourData.title}"`);
        }
      } catch (error: any) {
        console.error('[Diary Editor] Ошибка загрузки данных тура:', error);
        toast.error(`Не удалось загрузить данные тура: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadTourData();
  }, [tourId, bookingId, isEditMode, tourDataLoaded]);

  // Автоматическое определение локации из GPS в EXIF (JPEG и др.)
  const extractLocationFromImage = async (file: File): Promise<{ name: string; coordinates?: [number, number] } | null> => {
    if (!autoDetectLocations || !file.type.startsWith('image/')) return null;

    try {
      const exifr = (await import('exifr')).default;
      const gps = await exifr.gps(file);
      if (
        !gps ||
        typeof (gps as { latitude?: unknown }).latitude !== 'number' ||
        typeof (gps as { longitude?: unknown }).longitude !== 'number'
      ) {
        return null;
      }
      const lat = (gps as { latitude: number }).latitude;
      const lon = (gps as { longitude: number }).longitude;
      return {
        name: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
        coordinates: [lat, lon],
      };
    } catch {
      return null;
    }
  };

  // Добавление нового блока
  const addBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = 
      type === 'text' ? { type: 'text', id: `block-${Date.now()}`, content: '' } :
      type === 'image' ? { type: 'image', id: `block-${Date.now()}`, url: '', path: '', description: '' } :
      type === 'video' ? { type: 'video', id: `block-${Date.now()}`, url: '', path: '', description: '' } :
      type === 'gallery' ? { type: 'gallery', id: `block-${Date.now()}`, items: [] } :
      type === 'map' ? { type: 'map', id: `block-${Date.now()}`, locations: [] } :
      type === 'timeline' ? { type: 'timeline', id: `block-${Date.now()}`, events: [] } :
      type === 'route' ? { type: 'route', id: `block-${Date.now()}`, waypoints: [] } :
      type === 'weather' ? { type: 'weather', id: `block-${Date.now()}`, date: travelDate || new Date().toISOString().split('T')[0] } :
      { type: 'mood', id: `block-${Date.now()}`, date: travelDate || new Date().toISOString().split('T')[0], emotion: 'happy', intensity: 5 };
    
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
      toast.success('✨ Обложка загружена!');
    } catch (error: any) {
      console.error('Ошибка загрузки обложки:', error);
      toast.error('Не удалось загрузить обложку');
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  // Загрузка медиа с автоматическим определением локации
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

        // Пытаемся определить локацию из фото
        const detectedLocation = await extractLocationFromImage(file);

        const block = contentBlocks.find(b => b.id === blockId);
        if (!block) continue;

        if (block.type === 'image' || block.type === 'video') {
          updateBlock(blockId, {
            url: data.url,
            path: data.path,
            type: file.type.startsWith('video/') ? 'video' : 'image',
            location: detectedLocation || undefined,
          } as any);
          
          if (detectedLocation) {
            toast.success(`📍 Локация определена: ${detectedLocation.name}`);
          }
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
      toast.success('✨ Медиа загружено!');
    } catch (error: any) {
      console.error('Ошибка загрузки медиа:', error);
      toast.error('Не удалось загрузить медиа');
    } finally {
      setUploadingMedia(false);
    }
  };

  // Drag & Drop
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
      const content = contentBlocks.map(block => {
        if (block.type === 'text') return block.content;
        if (block.type === 'image') return `<figure><img src="${block.url}" alt="${block.description}" /><figcaption>${block.description}</figcaption></figure>`;
        if (block.type === 'video') return `<video controls><source src="${block.url}" /></video><p>${block.description}</p>`;
        if (block.type === 'gallery') {
          return `<div class="gallery">${block.items.map(item => 
            `<figure><img src="${item.url}" alt="${item.description}" /><figcaption>${item.description}</figcaption></figure>`
          ).join('')}</div>`;
        }
        if (block.type === 'map') {
          return `<div class="map-locations">${block.locations.map(loc => 
            `<div class="location"><h3>${loc.name}</h3>${loc.description ? `<p>${loc.description}</p>` : ''}</div>`
          ).join('')}</div>`;
        }
        if (block.type === 'timeline') {
          return `<div class="timeline">${block.events.map(event => 
            `<div class="timeline-event"><time>${event.time}</time><h4>${event.title}</h4><p>${event.description}</p></div>`
          ).join('')}</div>`;
        }
        if (block.type === 'route') {
          return `<div class="route">${block.waypoints.map(wp => 
            `<div class="waypoint">${wp.order}. ${wp.name}</div>`
          ).join('')}</div>`;
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

      // Собираем все локации из блоков
      const allLocations: Array<{ name: string; coordinates?: [number, number] }> = [];
      contentBlocks.forEach(block => {
        if (block.type === 'map') {
          allLocations.push(...block.locations);
        } else if ((block.type === 'image' || block.type === 'video') && block.location) {
          allLocations.push(block.location);
        }
      });

      const finalLocationData = {
        ...locationData,
        locations: [...(locationData?.locations || []), ...allLocations],
        route: travelRoute,
      };

      const payload: CreateDiaryRequest | UpdateDiaryRequest = {
        title: title.trim(),
        content: content || undefined,
        travel_date: travelDate || undefined,
        visibility,
        ...(tourId && { tour_id: tourId }),
        ...(bookingId && { booking_id: bookingId }),
        ...(coverImageUrl && { cover_image_url: coverImageUrl }),
        ...(allMedia.length > 0 && { media_items: allMedia }),
        ...(finalLocationData && { location_data: finalLocationData }),
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

      toast.success('✨ Дневник сохранен как черновик');
      
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
    await handleSave();
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
      <div className="max-w-7xl mx-auto p-6">
        {/* Заголовок с уникальными вкладками */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-emerald-600" />
                {isEditMode ? 'Редактировать дневник' : 'Создать уникальный дневник'}
              </h2>
              <p className="text-gray-600 mt-1">Интерактивный инструмент для создания истории путешествия</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('edit')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'edit'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Layout className="w-4 h-4" />
                Редактор
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'map'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Map className="w-4 h-4" />
                Карта
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'timeline'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                Timeline
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'preview'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Eye className="w-4 h-4" />
                Превью
              </button>
            </div>
          </div>

          {/* Основные настройки */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Zap className="w-4 h-4 inline mr-1" />
                Умные функции
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDetectLocations}
                    onChange={(e) => setAutoDetectLocations(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Авто-локации</span>
                </label>
              </div>
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
                      <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
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

        {/* Контент в зависимости от вкладки */}
        {activeTab === 'edit' && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Блоки контента</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => addBlock('text')}
                  className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Текст
                </button>
                <button
                  onClick={() => addBlock('image')}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                >
                  <ImageIcon className="w-4 h-4" />
                  Фото
                </button>
                <button
                  onClick={() => addBlock('video')}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm"
                >
                  <Video className="w-4 h-4" />
                  Видео
                </button>
                <button
                  onClick={() => addBlock('gallery')}
                  className="px-3 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2 text-sm"
                >
                  <ImageIcon className="w-4 h-4" />
                  Галерея
                </button>
                <button
                  onClick={() => addBlock('map')}
                  className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 text-sm"
                >
                  <MapPin className="w-4 h-4" />
                  Карта
                </button>
                <button
                  onClick={() => addBlock('timeline')}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm"
                >
                  <Clock className="w-4 h-4" />
                  Timeline
                </button>
                <button
                  onClick={() => addBlock('route')}
                  className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2 text-sm"
                >
                  <Route className="w-4 h-4" />
                  Маршрут
                </button>
                <button
                  onClick={() => addBlock('weather')}
                  className="px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2 text-sm"
                >
                  <Sun className="w-4 h-4" />
                  Погода
                </button>
                <button
                  onClick={() => addBlock('mood')}
                  className="px-3 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 flex items-center gap-2 text-sm"
                >
                  <Heart className="w-4 h-4" />
                  Настроение
                </button>
              </div>
            </div>

            {/* Блоки контента */}
            <div className="space-y-4">
              {contentBlocks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-semibold mb-2">Начните создавать уникальный дневник</p>
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
                          {block.type === 'timeline' && '⏰ Timeline'}
                          {block.type === 'route' && '🛣️ Маршрут'}
                          {block.type === 'weather' && '☀️ Погода'}
                          {block.type === 'mood' && '❤️ Настроение'}
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
                            {block.location && (
                              <div className="mt-2 px-3 py-2 bg-blue-50 rounded-lg flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-blue-600" />
                                <span className="text-sm text-blue-700">{block.location.name}</span>
                              </div>
                            )}
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
                            {block.location && (
                              <div className="mt-2 px-3 py-2 bg-blue-50 rounded-lg flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-blue-600" />
                                <span className="text-sm text-blue-700">{block.location.name}</span>
                              </div>
                            )}
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
                        <div className="space-y-2 mb-4">
                          {block.locations.map((loc, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
                              <MapPin className="w-4 h-4 text-emerald-600" />
                              <input
                                type="text"
                                value={loc.name}
                                onChange={(e) => {
                                  const newLocations = [...block.locations];
                                  newLocations[idx] = { ...newLocations[idx], name: e.target.value };
                                  updateBlock(block.id, { locations: newLocations });
                                }}
                                placeholder="Название места..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                              />
                              <button
                                onClick={() => {
                                  const newLocations = block.locations.filter((_, i) => i !== idx);
                                  updateBlock(block.id, { locations: newLocations });
                                }}
                                className="p-1 text-red-400 hover:text-red-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => {
                            const newLocations = [...block.locations, { name: '', order: block.locations.length }];
                            updateBlock(block.id, { locations: newLocations });
                          }}
                          className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-emerald-500 flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Добавить место
                        </button>
                        <p className="text-xs text-gray-500 mt-2">
                          💡 Интерактивная карта будет отображаться в предпросмотре
                        </p>
                      </div>
                    )}

                    {block.type === 'timeline' && (
                      <div>
                        <div className="space-y-3 mb-4">
                          {block.events.map((event, idx) => (
                            <div key={idx} className="flex gap-3 p-3 bg-gray-100 rounded-lg">
                              <div className="flex-shrink-0">
                                <Clock className="w-5 h-5 text-purple-600" />
                              </div>
                              <div className="flex-1 space-y-2">
                                <input
                                  type="time"
                                  value={event.time}
                                  onChange={(e) => {
                                    const newEvents = [...block.events];
                                    newEvents[idx] = { ...newEvents[idx], time: e.target.value };
                                    updateBlock(block.id, { events: newEvents });
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                                <input
                                  type="text"
                                  value={event.title}
                                  onChange={(e) => {
                                    const newEvents = [...block.events];
                                    newEvents[idx] = { ...newEvents[idx], title: e.target.value };
                                    updateBlock(block.id, { events: newEvents });
                                  }}
                                  placeholder="Название события..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                                <textarea
                                  value={event.description}
                                  onChange={(e) => {
                                    const newEvents = [...block.events];
                                    newEvents[idx] = { ...newEvents[idx], description: e.target.value };
                                    updateBlock(block.id, { events: newEvents });
                                  }}
                                  placeholder="Описание..."
                                  rows={2}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <button
                                onClick={() => {
                                  const newEvents = block.events.filter((_, i) => i !== idx);
                                  updateBlock(block.id, { events: newEvents });
                                }}
                                className="p-1 text-red-400 hover:text-red-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => {
                            const newEvents = [...block.events, { time: '', title: '', description: '' }];
                            updateBlock(block.id, { events: newEvents });
                          }}
                          className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Добавить событие
                        </button>
                      </div>
                    )}

                    {block.type === 'route' && (
                      <div>
                        <div className="space-y-2 mb-4">
                          {block.waypoints.map((wp, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
                              <span className="flex-shrink-0 w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold">
                                {wp.order}
                              </span>
                              <input
                                type="text"
                                value={wp.name}
                                onChange={(e) => {
                                  const newWaypoints = [...block.waypoints];
                                  newWaypoints[idx] = { ...newWaypoints[idx], name: e.target.value };
                                  updateBlock(block.id, { waypoints: newWaypoints });
                                }}
                                placeholder="Название точки маршрута..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                              />
                              <button
                                onClick={() => {
                                  const newWaypoints = block.waypoints.filter((_, i) => i !== idx);
                                  updateBlock(block.id, { waypoints: newWaypoints });
                                }}
                                className="p-1 text-red-400 hover:text-red-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => {
                            const newWaypoints = [...block.waypoints, { name: '', order: block.waypoints.length + 1 }];
                            updateBlock(block.id, { waypoints: newWaypoints });
                          }}
                          className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-teal-500 flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Добавить точку маршрута
                        </button>
                      </div>
                    )}

                    {block.type === 'weather' && (
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Дата</label>
                            <input
                              type="date"
                              value={block.date}
                              onChange={(e) => updateBlock(block.id, { date: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Температура (°C)</label>
                            <input
                              type="number"
                              value={block.temperature || ''}
                              onChange={(e) => updateBlock(block.id, { temperature: parseInt(e.target.value) || undefined })}
                              placeholder="20"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Условия</label>
                            <select
                              value={block.condition || ''}
                              onChange={(e) => updateBlock(block.id, { condition: e.target.value || undefined })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                              <option value="">Выберите...</option>
                              <option value="sunny">☀️ Солнечно</option>
                              <option value="cloudy">☁️ Облачно</option>
                              <option value="rainy">🌧️ Дождь</option>
                              <option value="snowy">❄️ Снег</option>
                              <option value="windy">💨 Ветрено</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {block.type === 'mood' && (
                      <div className="p-4 bg-gradient-to-br from-rose-50 to-pink-50 rounded-lg border border-rose-200">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Дата</label>
                            <input
                              type="date"
                              value={block.date}
                              onChange={(e) => updateBlock(block.id, { date: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Настроение</label>
                            <select
                              value={block.emotion}
                              onChange={(e) => updateBlock(block.id, { emotion: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                              <option value="happy">😊 Счастлив</option>
                              <option value="excited">🤩 В восторге</option>
                              <option value="calm">😌 Спокоен</option>
                              <option value="tired">😴 Устал</option>
                              <option value="sad">😢 Грустен</option>
                              <option value="inspired">💡 Вдохновлен</option>
                            </select>
                          </div>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Интенсивность: {block.intensity}/10
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={block.intensity}
                            onChange={(e) => updateBlock(block.id, { intensity: parseInt(e.target.value) })}
                            className="w-full"
                          />
                        </div>
                        <textarea
                          value={block.note || ''}
                          onChange={(e) => updateBlock(block.id, { note: e.target.value })}
                          placeholder="Заметка о настроении..."
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Map className="w-6 h-6 text-blue-600" />
              Интерактивная карта путешествия
            </h3>
            <div className="h-96 bg-gray-200 rounded-xl flex items-center justify-center text-gray-500 mb-4">
              <div className="text-center">
                <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-semibold mb-2">Карта маршрута</p>
                <p className="text-sm">Все локации из блоков будут отображаться здесь</p>
              </div>
            </div>
            <div className="space-y-2">
              {contentBlocks
                .filter(b => b.type === 'map')
                .map(block => 
                  block.type === 'map' && block.locations.map((loc, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">{loc.name}</span>
                      {loc.coordinates && (
                        <span className="text-sm text-gray-500">
                          ({loc.coordinates[0]}, {loc.coordinates[1]})
                        </span>
                      )}
                    </div>
                  ))
                )}
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Clock className="w-6 h-6 text-purple-600" />
              Хронология путешествия
            </h3>
            <div className="relative">
              {contentBlocks
                .filter(b => b.type === 'timeline')
                .map(block => 
                  block.type === 'timeline' && (
                    <div key={block.id} className="space-y-4">
                      {block.events.map((event, idx) => (
                        <div key={idx} className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                              {idx + 1}
                            </div>
                            {idx < block.events.length - 1 && (
                              <div className="w-0.5 h-16 bg-purple-300 mx-auto mt-2" />
                            )}
                          </div>
                          <div className="flex-1 pb-8">
                            <div className="text-sm text-purple-600 font-medium mb-1">{event.time}</div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-1">{event.title}</h4>
                            <p className="text-gray-600">{event.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              {contentBlocks.filter(b => b.type === 'timeline').length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-semibold mb-2">Нет событий в timeline</p>
                  <p className="text-sm">Добавьте блок Timeline в редакторе</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
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
                  return <div key={block.id} dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(block.content) }} />;
                }
                if (block.type === 'image' && block.url) {
                  return (
                    <figure key={block.id} className="my-6">
                      <Image src={block.url} alt={block.description} width={800} height={400} className="w-full rounded-lg" />
                      {block.description && <figcaption className="text-center text-gray-600 mt-2">{block.description}</figcaption>}
                      {block.location && (
                        <div className="mt-2 text-center text-sm text-blue-600 flex items-center justify-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {block.location.name}
                        </div>
                      )}
                    </figure>
                  );
                }
                if (block.type === 'video' && block.url) {
                  return (
                    <div key={block.id} className="my-6">
                      <video src={block.url} controls className="w-full rounded-lg" />
                      {block.description && <p className="text-center text-gray-600 mt-2">{block.description}</p>}
                      {block.location && (
                        <div className="mt-2 text-center text-sm text-blue-600 flex items-center justify-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {block.location.name}
                        </div>
                      )}
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
                if (block.type === 'map') {
                  return (
                    <div key={block.id} className="my-6 p-6 bg-blue-50 rounded-lg">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <MapPin className="w-6 h-6 text-blue-600" />
                        Посещенные места
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {block.locations.map((loc, idx) => (
                          <div key={idx} className="p-3 bg-white rounded-lg">
                            <div className="font-semibold text-gray-900">{loc.name}</div>
                            {loc.description && <p className="text-sm text-gray-600 mt-1">{loc.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                if (block.type === 'timeline') {
                  return (
                    <div key={block.id} className="my-6">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Clock className="w-6 h-6 text-purple-600" />
                        Хронология
                      </h3>
                      <div className="space-y-4">
                        {block.events.map((event, idx) => (
                          <div key={idx} className="flex gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm text-purple-600 font-medium">{event.time}</div>
                              <h4 className="text-lg font-semibold">{event.title}</h4>
                              <p className="text-gray-600">{event.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                if (block.type === 'route') {
                  return (
                    <div key={block.id} className="my-6 p-6 bg-teal-50 rounded-lg">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Route className="w-6 h-6 text-teal-600" />
                        Маршрут
                      </h3>
                      <div className="space-y-2">
                        {block.waypoints.map((wp, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold">
                              {wp.order}
                            </span>
                            <span className="font-medium">{wp.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                if (block.type === 'weather') {
                  return (
                    <div key={block.id} className="my-6 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Sun className="w-8 h-8 text-yellow-500" />
                        <div>
                          <div className="font-semibold text-gray-900">
                            {block.date && new Date(block.date).toLocaleDateString('ru-RU')}
                          </div>
                          {block.temperature && (
                            <div className="text-2xl font-bold text-blue-600">{block.temperature}°C</div>
                          )}
                          {block.condition && (
                            <div className="text-sm text-gray-600 capitalize">{block.condition}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
                if (block.type === 'mood') {
                  return (
                    <div key={block.id} className="my-6 p-4 bg-gradient-to-br from-rose-50 to-pink-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Heart className="w-8 h-8 text-rose-600" />
                        <div>
                          <div className="font-semibold text-gray-900">
                            {block.date && new Date(block.date).toLocaleDateString('ru-RU')}
                          </div>
                          <div className="text-lg font-bold text-rose-600 capitalize">{block.emotion}</div>
                          <div className="text-sm text-gray-600">Интенсивность: {block.intensity}/10</div>
                          {block.note && <p className="text-sm text-gray-600 mt-1">{block.note}</p>}
                        </div>
                      </div>
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

