'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RichTextEditor from './RichTextEditor';
import { Upload, Loader2, Save } from 'lucide-react';
import Image from 'next/image';

interface TourFormProps {
  mode: 'create' | 'edit';
  initialData?: any;
}

export default function TourForm({ mode, initialData }: TourFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(initialData?.cover_image || null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);

  // Form data
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    short_desc: initialData?.short_desc || '',
    full_desc: initialData?.full_desc || '',
    tour_type: initialData?.tour_type || 'excursion',
    category: initialData?.category || 'history',
    price_per_person: initialData?.price_per_person || '',
    start_date: initialData?.start_date ? new Date(initialData.start_date).toISOString().slice(0, 16) : '',
    end_date: initialData?.end_date ? new Date(initialData.end_date).toISOString().slice(0, 16) : '',
    max_participants: initialData?.max_participants || 20,
    status: initialData?.status || 'draft',
    yandex_map_url: initialData?.yandex_map_url || '',
  });

  // Транслитерация
  const transliterate = (text: string): string => {
    const map: { [key: string]: string } = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    };
    
    return text
      .toLowerCase()
      .split('')
      .map(char => map[char] || char)
      .join('');
  };

  // Generate slug from title
  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: transliterate(title)
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim(),
    }));
  };

  // Handle cover image upload
  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      setCoverImage(URL.createObjectURL(file));
    }
  };

  // Handle gallery photos upload
  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setGalleryFiles(prev => [...prev, ...files]);
      const previews = files.map(file => URL.createObjectURL(file));
      setGalleryPreviews(prev => [...prev, ...previews]);
    }
  };

  // Handle video upload
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setVideoFiles(prev => [...prev, ...files]);
      const previews = files.map(file => URL.createObjectURL(file));
      setVideoPreviews(prev => [...prev, ...previews]);
    }
  };

  // Remove gallery photo
  const removeGalleryPhoto = (index: number) => {
    setGalleryFiles(prev => prev.filter((_, i) => i !== index));
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Remove video
  const removeVideo = (index: number) => {
    setVideoFiles(prev => prev.filter((_, i) => i !== index));
    setVideoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let coverImageUrl = coverImage;
      let coverImagePath = null;

      // Upload cover image if new file selected
      if (coverImageFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', coverImageFile);
        uploadFormData.append('folder', 'tours/covers');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Не удалось загрузить обложку');
        }

        const uploadData = await uploadResponse.json();
        coverImageUrl = uploadData.url;
        coverImagePath = uploadData.path;
      }

      // Create/update tour
      const tourData = {
        ...formData,
        price_per_person: parseFloat(formData.price_per_person),
        max_participants: parseInt(formData.max_participants.toString()),
        cover_image: coverImageUrl,
        cover_path: coverImagePath || initialData?.cover_path,
      };

      const apiUrl = mode === 'create' 
        ? '/api/admin/tours'
        : `/api/admin/tours/${initialData.id}`;

      const response = await fetch(apiUrl, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tourData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Не удалось сохранить тур');
      }

      const result = await response.json();
      const tourId = mode === 'create' ? result.data.id : initialData.id;

      // Upload gallery photos
      if (galleryFiles.length > 0) {
        for (const file of galleryFiles) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('folder', 'tours/gallery');
          formData.append('tourId', tourId);
          formData.append('mediaType', 'photo');

          await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
        }
      }

      // Upload videos
      if (videoFiles.length > 0) {
        for (const file of videoFiles) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('folder', 'tours/videos');
          formData.append('tourId', tourId);
          formData.append('mediaType', 'video');

          await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
        }
      }

      router.push('/admin/tours');
      router.refresh();
    } catch (error: any) {
      console.error('Error saving tour:', error);
      alert(error.message || 'Не удалось сохранить тур');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Название тура *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Например: Казанский Кремль и Кул-Шариф"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Slug (URL) *
          </label>
          <input
            type="text"
            required
            value={formData.slug}
            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="kazan-kremlin-kul-sharif"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Тип тура *
          </label>
          <select
            required
            value={formData.tour_type}
            onChange={(e) => setFormData(prev => ({ ...prev, tour_type: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="excursion">Экскурсия</option>
            <option value="hiking">Поход</option>
            <option value="cruise">Круиз</option>
            <option value="bus_tour">Автобусный тур</option>
            <option value="walking_tour">Пешая прогулка</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Категория *
          </label>
          <select
            required
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="history">История</option>
            <option value="nature">Природа</option>
            <option value="culture">Культура</option>
            <option value="architecture">Архитектура</option>
            <option value="food">Еда и гастрономия</option>
            <option value="adventure">Приключения</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Цена за человека (₽) *
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.price_per_person}
            onChange={(e) => setFormData(prev => ({ ...prev, price_per_person: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="1500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Макс. участников *
          </label>
          <input
            type="number"
            required
            min="1"
            value={formData.max_participants}
            onChange={(e) => setFormData(prev => ({ ...prev, max_participants: parseInt(e.target.value) || 1 }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Дата начала *
          </label>
          <input
            type="datetime-local"
            required
            value={formData.start_date}
            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Дата окончания *
          </label>
          <input
            type="datetime-local"
            required
            value={formData.end_date}
            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Статус *
          </label>
          <select
            required
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="draft">Черновик</option>
            <option value="published">Опубликован</option>
            <option value="active">Активен</option>
            <option value="archived">Архивирован</option>
          </select>
        </div>
      </div>

      {/* Cover Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Обложка тура
        </label>
        <div className="space-y-4">
          {coverImage && (
            <div className="relative w-full h-64 rounded-lg overflow-hidden">
              <Image
                src={coverImage}
                alt="Превью обложки"
                fill
                className="object-cover"
              />
            </div>
          )}
          <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors">
            <Upload className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              {coverImage ? 'Изменить обложку' : 'Загрузить обложку'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverImageChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Yandex Map */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Яндекс Карта (URL конструктора) *
        </label>
        <input
          type="url"
          required
          value={formData.yandex_map_url}
          onChange={(e) => setFormData(prev => ({ ...prev, yandex_map_url: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="https://yandex.ru/map-constructor/..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Создайте карту в{' '}
          <a 
            href="https://yandex.ru/map-constructor/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-emerald-600 hover:underline"
          >
            Конструкторе карт Яндекса
          </a>
          {' '}и вставьте ссылку для встраивания
        </p>
      </div>

      {/* Short Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Краткое описание *
        </label>
        <textarea
          required
          value={formData.short_desc}
          onChange={(e) => setFormData(prev => ({ ...prev, short_desc: e.target.value }))}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Краткое описание для карточки тура (1-2 предложения)..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Это описание будет отображаться на карточке тура в каталоге
        </p>
      </div>

      {/* Full Description (Rich Text Editor) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Полное описание *
        </label>
        <RichTextEditor
          content={formData.full_desc}
          onChange={(content) => setFormData(prev => ({ ...prev, full_desc: content }))}
          placeholder="Напишите детальную информацию о туре с форматированием..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Это описание будет отображаться на странице тура
        </p>
      </div>

      {/* Gallery Photos */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Фото галерея
        </label>
        <div className="space-y-4">
          {/* Preview */}
          {galleryPreviews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {galleryPreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <Image
                    src={preview}
                    alt={`Gallery ${index + 1}`}
                    width={200}
                    height={200}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeGalleryPhoto(index)}
                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Upload */}
          <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors">
            <Upload className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              Загрузить фото (можно несколько)
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleGalleryChange}
              className="hidden"
            />
          </label>
          <p className="text-xs text-gray-500">
            Фотографии будут отображаться в галерее тура
          </p>
        </div>
      </div>

      {/* Videos */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Видео описание
        </label>
        <div className="space-y-4">
          {/* Preview */}
          {videoPreviews.length > 0 && (
            <div className="space-y-2">
              {videoPreviews.map((preview, index) => (
                <div key={index} className="relative flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <video
                    src={preview}
                    className="w-32 h-20 object-cover rounded"
                    controls
                  />
                  <span className="flex-1 text-sm text-gray-600">
                    {videoFiles[index]?.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeVideo(index)}
                    className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Upload */}
          <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors">
            <Upload className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              Загрузить видео (можно несколько)
            </span>
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={handleVideoChange}
              className="hidden"
            />
          </label>
          <p className="text-xs text-gray-500">
            Видео будет отображаться на странице тура
          </p>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {mode === 'create' ? 'Создать тур' : 'Сохранить изменения'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
