'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RichTextEditor from './RichTextEditor';
import AutoResizeTextarea from './AutoResizeTextarea';
import { Upload, Loader2, Save, AlertCircle, CheckCircle2, MapPin, Search, X, Copy, Calendar } from 'lucide-react';
import Image from 'next/image';
import { safeJsonParse } from '@/lib/utils/fetch';

interface TourFormProps {
  mode: 'create' | 'edit';
  initialData?: any;
  existingMedia?: Array<{ id: string; media_type: string; media_url: string }>;
}

interface FormErrors {
  title?: string;
  slug?: string;
  price_per_person?: string;
  start_date?: string;
  end_date?: string;
  max_participants?: string;
  yandex_map_url?: string;
  short_desc?: string;
  full_desc?: string;
  cover_image?: string;
}

export default function TourForm({ mode, initialData, existingMedia = [] }: TourFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>(''); // ✅ Статус загрузки
  const [coverImage, setCoverImage] = useState<string | null>(initialData?.cover_image || null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [extraDateRanges, setExtraDateRanges] = useState<Array<{ start_date: string; end_date: string }>>([]);

  // Form data
  const [formData, setFormData] = useState({
    id: initialData?.id || null, // ✅ Добавляем id для режима edit
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
    city_id: initialData?.city_id || null,
  });

  // Состояние для поиска города
  const [citySearch, setCitySearch] = useState('');
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCity, setSelectedCity] = useState<{ id: string; name: string } | null>(null);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

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
      .split('')
      .map(char => {
        const lower = char.toLowerCase();
        if (map[lower]) return map[lower];
        if (char >= 'A' && char <= 'Z') return char.toLowerCase();
        if (char >= 'a' && char <= 'z') return char;
        if (char >= '0' && char <= '9') return char;
        return '-';
      })
      .join('')
      .toLowerCase()
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Инициализация превью существующих медиа в режиме edit
  useEffect(() => {
    if (mode !== 'edit') return;
    if (!existingMedia || existingMedia.length === 0) return;
    // Не перезаписываем если уже есть локальные превью (например, пользователь добавил новые)
    if (galleryPreviews.length > 0 || videoPreviews.length > 0) return;

    const existingPhotos = existingMedia.filter((m) => m.media_type === 'image' || (m as any).media_type === 'photo');
    const existingVideos = existingMedia.filter((m) => m.media_type === 'video');
    setGalleryPreviews(existingPhotos.map((m) => m.media_url));
    setVideoPreviews(existingVideos.map((m) => m.media_url));
  }, [mode, existingMedia]);

  // Загрузка выбранного города при редактировании
  useEffect(() => {
    if (mode === 'edit' && initialData?.city_id && !selectedCity) {
      fetch(`/api/admin/cities/${initialData.city_id}`)
        .then(async res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return safeJsonParse(res);
        })
        .then(data => {
          if (data.city) {
            setSelectedCity({ id: data.city.id, name: data.city.name });
            setCitySearch(data.city.name);
          }
        })
        .catch(console.error);
    }
  }, [mode, initialData?.city_id]);

  // Поиск городов
  useEffect(() => {
    if (citySearch.length < 2) {
      setCities([]);
      setShowCityDropdown(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      fetch(`/api/admin/cities?search=${encodeURIComponent(citySearch)}`)
        .then(async res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return safeJsonParse(res);
        })
        .then(data => {
          const foundCities = data.cities || [];
          setCities(foundCities);
          // Показываем dropdown сразу после получения результатов
          if (foundCities.length > 0) {
            setShowCityDropdown(true);
          }
        })
        .catch(console.error);
    }, 200); // Уменьшена задержка с 300 до 200мс для более быстрого отклика

    return () => clearTimeout(timeoutId);
  }, [citySearch]);

  // Выбор города
  const handleCitySelect = (city: { id: string; name: string }) => {
    setSelectedCity(city);
    setCitySearch(city.name);
    setFormData(prev => ({ ...prev, city_id: city.id }));
    setShowCityDropdown(false);
  };

  // Очистка выбранного города
  const handleCityClear = () => {
    setSelectedCity(null);
    setCitySearch('');
    setFormData(prev => ({ ...prev, city_id: null }));
    setCities([]);
    setShowCityDropdown(false);
  };

  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.city-search-container')) {
        setShowCityDropdown(false);
      }
    };

    if (showCityDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCityDropdown]);

  // Парсинг iframe Яндекс карты
  const parseYandexMapIframe = (input: string): string => {
    // Если это уже URL - вернуть как есть
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return input;
    }

    // Парсинг iframe
    const srcMatch = input.match(/src=["']([^"']+)["']/);
    if (srcMatch && srcMatch[1]) {
      return srcMatch[1];
    }

    return input;
  };

  // Валидация
  const validateField = (name: string, value: any): string | undefined => {
    switch (name) {
      case 'title':
        if (!value || value.trim().length < 3) {
          return 'Название должно содержать минимум 3 символа';
        }
        if (value.length > 200) {
          return 'Название не может быть длиннее 200 символов';
        }
        break;

      case 'slug':
        if (!value || value.trim().length < 3) {
          return 'Slug должен содержать минимум 3 символа';
        }
        if (!/^[a-z0-9-]+$/.test(value)) {
          return 'Slug может содержать только латинские буквы, цифры и дефисы';
        }
        break;

      case 'price_per_person':
        if (!value || parseFloat(value) <= 0) {
          return 'Цена должна быть больше 0';
        }
        if (parseFloat(value) > 1000000) {
          return 'Цена не может превышать 1,000,000 ₽';
        }
        break;

      case 'start_date':
        if (!value) {
          return 'Укажите дату начала тура';
        }
        break;

      case 'end_date':
        if (!value) {
          return 'Укажите дату окончания тура';
        }
        if (formData.start_date && new Date(value) <= new Date(formData.start_date)) {
          return 'Дата окончания должна быть позже даты начала';
        }
        break;

      case 'max_participants':
        if (!value || parseInt(value) < 1) {
          return 'Минимум 1 участник';
        }
        if (parseInt(value) > 1000) {
          return 'Максимум 1000 участников';
        }
        break;

      case 'yandex_map_url':
        if (value && value.trim().length > 0) {
          const parsedUrl = parseYandexMapIframe(value);
          if (!parsedUrl.includes('yandex.ru')) {
            return 'Ссылка должна быть с yandex.ru';
          }
        }
        break;

        case 'short_desc':
        if (!value || value.trim().length < 10) {
          return 'Краткое описание должно содержать минимум 10 символов';
        }
        if (value.length > 500) {
          return 'Краткое описание не может быть длиннее 500 символов';
        }
        break;

      case 'full_desc':
        if (!value || value.trim().length < 50) {
          return 'Полное описание должно содержать минимум 50 символов';
        }
        break;
    }
  };

  // Обработчик изменения с валидацией
  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  };

  // Обработчик потери фокуса
  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, formData[name as keyof typeof formData]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  // Обработчик названия с автогенерацией slug
  const handleTitleChange = (title: string) => {
    handleFieldChange('title', title);
    if (mode === 'create') {
      const slug = transliterate(title);
      setFormData(prev => ({ ...prev, slug }));
      // Очищаем ошибку slug и touched при автогенерации
      setErrors(prev => ({ ...prev, slug: undefined }));
      setTouched(prev => ({ ...prev, slug: false }));
    }
  };

  // Обработчик Яндекс карты с парсингом iframe
  const handleYandexMapChange = (value: string) => {
    const parsedUrl = parseYandexMapIframe(value);
    handleFieldChange('yandex_map_url', parsedUrl);
  };

  // Handle cover image upload
  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, cover_image: 'Файл слишком большой (максимум 10 МБ)' }));
        return;
      }
      setCoverImageFile(file);
      setCoverImage(URL.createObjectURL(file));
      setErrors(prev => ({ ...prev, cover_image: undefined }));
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
    
    // Валидация всех полей
    const newErrors: FormErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) newErrors[key as keyof FormErrors] = error;
    });

    if (!coverImage && mode === 'create') {
      newErrors.cover_image = 'Добавьте обложку тура';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
      alert('Пожалуйста, исправьте ошибки в форме');
      return;
    }

    const invalidExtraRange = extraDateRanges.some((range) => {
      if (!range.start_date || !range.end_date) return true;
      return new Date(range.end_date) <= new Date(range.start_date);
    });

    if (invalidExtraRange) {
      alert('Проверьте дополнительные даты: обе даты обязательны, окончание должно быть позже начала');
      return;
    }

    setLoading(true);
    setLoadingStatus('Подготовка данных...');

    try {
      // Upload cover image (ТОЛЬКО если выбран новый файл)
      let coverImageUrl = (formData as any).cover_image || coverImage;
      if (coverImageFile) {
        setLoadingStatus('Загрузка обложки...');
        const formDataUpload = new FormData();
        formDataUpload.append('file', coverImageFile);
        formDataUpload.append('folder', 'tours/covers');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload,
        });

        if (!uploadResponse.ok) {
          const contentType = uploadResponse.headers.get('content-type');
          let errorMessage = 'Не удалось загрузить обложку';
          if (contentType && contentType.includes('application/json')) {
            try {
              const uploadError = await uploadResponse.json();
              errorMessage = uploadError.error || errorMessage;
            } catch {
              // Если не удалось распарсить JSON, используем дефолтное сообщение
            }
          }
          throw new Error(errorMessage);
        }
        
        const uploadData = await safeJsonParse(uploadResponse);
        if (!uploadData.url) {
          throw new Error('Не получен URL загруженной обложки');
        }
        coverImageUrl = uploadData.url;
      } else if (mode === 'edit' && coverImage) {
        coverImageUrl = coverImage;
      } else if (mode === 'create' && !coverImageUrl) {
        throw new Error('Обложка тура обязательна');
      }

      // Create/update tour
      setLoadingStatus(mode === 'create' ? 'Создание тура...' : 'Обновление тура...');
      
      const tourData = {
        ...formData,
        cover_image: coverImageUrl,
        price_per_person: parseFloat(formData.price_per_person),
        yandex_map_url: formData.yandex_map_url.trim() || null,
        description: formData.short_desc || formData.full_desc || '', // Обязательное поле
        // Удаляем id при создании
        ...(mode === 'create' ? { id: undefined } : {}),
      };
      
      // Удаляем undefined значения
      Object.keys(tourData).forEach(key => {
        if (tourData[key as keyof typeof tourData] === undefined) {
          delete tourData[key as keyof typeof tourData];
        }
      });
      
      const response = await fetch('/api/admin/tours', {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tourData),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = 'Не удалось сохранить тур';
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.details 
              ? `${errorData.error}: ${errorData.details}`
              : errorData.error || errorMessage;
          } catch {
            // Если не удалось распарсить JSON, используем дефолтное сообщение
          }
        } else {
          const text = await response.text().catch(() => '');
          if (text) {
            errorMessage = `HTTP ${response.status}: ${text.substring(0, 100)}`;
          } else {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      const result = await safeJsonParse(response);
      const tourId = mode === 'create' ? result.data.id : initialData.id;

      // Upload gallery photos and videos ПАРАЛЛЕЛЬНО (быстрее!)
      const uploadPromises: Promise<any>[] = [];
      const totalFiles = galleryFiles.length + videoFiles.length;

      if (galleryFiles.length > 0) {
        setLoadingStatus(`Загрузка ${galleryFiles.length} фото...`);
        galleryFiles.forEach((file) => {
          const formDataUpload = new FormData();
          formDataUpload.append('file', file);
          formDataUpload.append('folder', 'tours/gallery');
          formDataUpload.append('tourId', tourId);
          formDataUpload.append('mediaType', 'photo');

          uploadPromises.push(
            fetch('/api/upload', {
              method: 'POST',
              body: formDataUpload,
            }).then(res => {
              if (!res.ok) throw new Error(`Ошибка загрузки фото: ${file.name}`);
              return res;
            })
          );
        });
      }

      if (videoFiles.length > 0) {
        setLoadingStatus(`Загрузка ${videoFiles.length} видео...`);
        videoFiles.forEach((file) => {
          const formDataUpload = new FormData();
          formDataUpload.append('file', file);
          formDataUpload.append('folder', 'tours/videos');
          formDataUpload.append('tourId', tourId);
          formDataUpload.append('mediaType', 'video');

          uploadPromises.push(
            fetch('/api/upload', {
              method: 'POST',
              body: formDataUpload,
            }).then(res => {
              if (!res.ok) throw new Error(`Ошибка загрузки видео: ${file.name}`);
              return res;
            })
          );
        });
      }

      // Ждем завершения всех загрузок параллельно
      if (uploadPromises.length > 0) {
        setLoadingStatus(`Загрузка ${totalFiles} файлов...`);
        try {
          await Promise.all(uploadPromises);
        } catch (error) {
          throw new Error('Не удалось загрузить медиафайлы');
        }
      }
      
      if (extraDateRanges.length > 0) {
        setLoadingStatus('Создание дополнительных дат...');
        const datesPayload = extraDateRanges.map((range) => ({
          start_date: new Date(range.start_date).toISOString(),
          end_date: new Date(range.end_date).toISOString(),
        }));

        const duplicateResponse = await fetch(`/api/admin/tours/${tourId}/duplicate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dates: datesPayload }),
        });

        if (!duplicateResponse.ok) {
          const contentType = duplicateResponse.headers.get('content-type');
          let errorMessage = 'Не удалось добавить дополнительные даты';
          if (contentType && contentType.includes('application/json')) {
            try {
              const duplicateResult = await duplicateResponse.json();
              errorMessage = duplicateResult.error || errorMessage;
            } catch {
              // Если не удалось распарсить JSON, используем дефолтное сообщение
            }
          }
          throw new Error(errorMessage);
        }
        
        const duplicateResult = await safeJsonParse(duplicateResponse);
      }

      setLoadingStatus('Завершение...');
      // Используем prefetch для быстрого перехода
      router.prefetch('/admin/tours');
      router.push('/admin/tours');
      router.refresh();
    } catch (error: any) {
      console.error('Error saving tour:', error);
      const errorMessage = error.message || 'Не удалось сохранить тур';
      alert(errorMessage);
      setLoadingStatus('');
    } finally {
      setLoading(false);
    }
  };

  // Компонент для отображения ошибки
  const ErrorMessage = ({ message }: { message?: string }) => {
    if (!message) return null;
    return (
      <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
        <AlertCircle className="w-3 h-3" />
        <span>{message}</span>
      </div>
    );
  };

  // Компонент для отображения успеха
  const SuccessMessage = ({ show }: { show: boolean }) => {
    if (!show) return null;
    return (
      <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
        <CheckCircle2 className="w-3 h-3" />
        <span>Отлично!</span>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-8 shadow-sm border border-emerald-100">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {mode === 'create' ? '🎯 Создание нового тура' : '✏️ Редактирование тура'}
        </h2>
        <p className="text-gray-600">
          Заполните все поля формы для {mode === 'create' ? 'создания' : 'обновления'} тура
        </p>
      </div>

      {/* Основная информация */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center font-bold">1</span>
          Основная информация
        </h3>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Название тура <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onBlur={() => handleBlur('title')}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
              errors.title && touched.title
                ? 'border-red-300 focus:ring-red-200 bg-red-50'
                : 'border-gray-300 focus:ring-emerald-200 focus:border-emerald-500'
            }`}
            placeholder="Например: Казанский Кремль и Кул-Шариф"
          />
          <ErrorMessage message={errors.title && touched.title ? errors.title : undefined} />
          {formData.title && !errors.title && touched.title && <SuccessMessage show />}
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Slug (URL адрес) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => handleFieldChange('slug', e.target.value)}
            onBlur={() => handleBlur('slug')}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all font-mono text-sm ${
              errors.slug && touched.slug
                ? 'border-red-300 focus:ring-red-200 bg-red-50'
                : 'border-gray-300 focus:ring-emerald-200 focus:border-emerald-500'
            }`}
            placeholder="kazan-kremlin-kul-sharif"
          />
          <ErrorMessage message={errors.slug && touched.slug ? errors.slug : undefined} />
          {formData.slug && !errors.slug && touched.slug && <SuccessMessage show />}
          <p className="text-xs text-gray-500 mt-1">
            URL: /tours/{formData.slug || 'slug-tура'}
          </p>
        </div>

        {/* City */}
        <div className="city-search-container">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Город <span className="text-gray-400 text-xs">(необязательно)</span>
          </label>
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={citySearch}
                onChange={(e) => {
                  setCitySearch(e.target.value);
                  if (selectedCity && e.target.value !== selectedCity.name) {
                    setSelectedCity(null);
                    setFormData(prev => ({ ...prev, city_id: null }));
                  }
                }}
                onFocus={() => {
                  // Показываем dropdown если есть результаты поиска или если уже введен текст
                  if (cities.length > 0 || citySearch.length >= 2) {
                    setShowCityDropdown(true);
                  }
                }}
                onInput={(e) => {
                  // Показываем dropdown при вводе, если есть результаты
                  if (cities.length > 0) {
                    setShowCityDropdown(true);
                  }
                }}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition-all"
                placeholder="Начните вводить название города..."
              />
              {selectedCity && (
                <button
                  type="button"
                  onClick={handleCityClear}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            
            {/* Dropdown с результатами поиска */}
            {showCityDropdown && cities.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {cities.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleCitySelect(city)}
                    className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    <span className="text-gray-900">{city.name}</span>
                  </button>
                ))}
              </div>
            )}
            
            {/* Сообщение если ничего не найдено */}
            {showCityDropdown && citySearch.length >= 2 && cities.length === 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-sm text-gray-500">
                Город не найден
              </div>
            )}
          </div>
          {selectedCity && (
            <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Выбран: {selectedCity.name}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tour Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Тип тура <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.tour_type}
              onChange={(e) => handleFieldChange('tour_type', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition-all"
            >
              <option value="excursion">🏛️ Экскурсия</option>
              <option value="hiking">🥾 Пеший тур</option>
              <option value="cruise">⛴️ Круиз</option>
              <option value="bus_tour">🚌 Автобусный тур</option>
              <option value="walking_tour">🚶 Прогулка</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Категория <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleFieldChange('category', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition-all"
            >
              <option value="history">📜 История</option>
              <option value="nature">🌲 Природа</option>
              <option value="culture">🎭 Культура</option>
              <option value="architecture">🏰 Архитектура</option>
              <option value="food">🍽️ Гастрономия</option>
              <option value="adventure">⛰️ Приключения</option>
            </select>
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Цена за человека (₽) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.price_per_person}
              onChange={(e) => handleFieldChange('price_per_person', e.target.value)}
              onBlur={() => handleBlur('price_per_person')}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                errors.price_per_person && touched.price_per_person
                  ? 'border-red-300 focus:ring-red-200 bg-red-50'
                  : 'border-gray-300 focus:ring-emerald-200 focus:border-emerald-500'
              }`}
              placeholder="1500"
            />
            <ErrorMessage message={errors.price_per_person && touched.price_per_person ? errors.price_per_person : undefined} />
          </div>

          {/* Max Participants */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Макс. участников <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={formData.max_participants}
              onChange={(e) => handleFieldChange('max_participants', parseInt(e.target.value) || 1)}
              onBlur={() => handleBlur('max_participants')}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                errors.max_participants && touched.max_participants
                  ? 'border-red-300 focus:ring-red-200 bg-red-50'
                  : 'border-gray-300 focus:ring-emerald-200 focus:border-emerald-500'
              }`}
              placeholder="20"
            />
            <ErrorMessage message={errors.max_participants && touched.max_participants ? errors.max_participants : undefined} />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Дата начала <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.start_date}
              onChange={(e) => handleFieldChange('start_date', e.target.value)}
              onBlur={() => handleBlur('start_date')}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                errors.start_date && touched.start_date
                  ? 'border-red-300 focus:ring-red-200 bg-red-50'
                  : 'border-gray-300 focus:ring-emerald-200 focus:border-emerald-500'
              }`}
            />
            <ErrorMessage message={errors.start_date && touched.start_date ? errors.start_date : undefined} />
          </div>

          {/* End Date */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Дата окончания <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setExtraDateRanges((prev) => [...prev, { start_date: '', end_date: '' }]);
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                title="Добавить ещё даты тура"
              >
                <Copy className="w-3 h-3" />
                + даты
              </button>
            </div>
            <input
              type="datetime-local"
              value={formData.end_date}
              onChange={(e) => handleFieldChange('end_date', e.target.value)}
              onBlur={() => handleBlur('end_date')}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                errors.end_date && touched.end_date
                  ? 'border-red-300 focus:ring-red-200 bg-red-50'
                  : 'border-gray-300 focus:ring-emerald-200 focus:border-emerald-500'
              }`}
            />
            <ErrorMessage message={errors.end_date && touched.end_date ? errors.end_date : undefined} />
          </div>

          {/* Status */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Статус <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleFieldChange('status', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition-all"
            >
              <option value="draft">📝 Черновик</option>
              <option value="active">🚀 Активен</option>
              <option value="completed">✔️ Завершён</option>
              <option value="cancelled">❌ Отменён</option>
            </select>
          </div>
        </div>

        {extraDateRanges.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">Дополнительные даты тура</h4>
            {extraDateRanges.map((range, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата начала
                  </label>
                  <input
                    type="datetime-local"
                    value={range.start_date}
                    onChange={(e) => {
                      const value = e.target.value;
                      setExtraDateRanges((prev) =>
                        prev.map((item, idx) => (idx === index ? { ...item, start_date: value } : item))
                      );
                    }}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all border-gray-300 focus:ring-emerald-200 focus:border-emerald-500"
                  />
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Дата окончания
                    </label>
                    <input
                      type="datetime-local"
                      value={range.end_date}
                      onChange={(e) => {
                        const value = e.target.value;
                        setExtraDateRanges((prev) =>
                          prev.map((item, idx) => (idx === index ? { ...item, end_date: value } : item))
                        );
                      }}
                      className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all border-gray-300 focus:ring-emerald-200 focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setExtraDateRanges((prev) => prev.filter((_, idx) => idx !== index))}
                    className="px-3 py-3 border border-gray-300 rounded-xl text-gray-600 hover:text-red-600 hover:border-red-300 transition-colors"
                    title="Удалить даты"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Медиа */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center font-bold">2</span>
          Медиа файлы
        </h3>

        {/* Cover Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Обложка тура <span className="text-red-500">*</span>
          </label>
          <div className="space-y-4">
            {coverImage && (
              <div className="relative w-full h-64 rounded-xl overflow-hidden border-2 border-gray-200">
                {coverImage.startsWith('blob:') ? (
                  <img
                    src={coverImage}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image
                    src={coverImage}
                    alt="Cover preview"
                    fill
                    className="object-cover"
                  />
                )}
              </div>
            )}
            <label className="flex items-center justify-center gap-2 w-full px-4 py-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all">
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-base text-gray-600 font-medium">
                {coverImage ? 'Изменить обложку' : 'Загрузить обложку'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverImageChange}
                className="hidden"
              />
            </label>
            <ErrorMessage message={errors.cover_image ? errors.cover_image : undefined} />
          </div>
        </div>

        {/* Gallery Photos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Фото галерея
          </label>
          <div className="space-y-4">
            {galleryPreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {galleryPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <Image
                      src={preview}
                      alt={`Gallery ${index + 1}`}
                      width={200}
                      height={200}
                      className="w-full h-32 object-cover rounded-xl border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeGalleryPhoto(index)}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center justify-center gap-2 w-full px-4 py-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all">
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-base text-gray-600 font-medium">
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
            {videoPreviews.length > 0 && (
              <div className="space-y-2">
                {videoPreviews.map((preview, index) => (
                  <div key={index} className="relative flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <video
                      className="w-32 h-20 object-cover rounded-lg"
                      controls
                      playsInline
                      preload="metadata"
                    >
                      <source src={preview} type={videoFiles[index]?.type || 'video/mp4'} />
                    </video>
                    <span className="flex-1 text-sm text-gray-600 font-medium">
                      {videoFiles[index]?.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeVideo(index)}
                      className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center justify-center gap-2 w-full px-4 py-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all">
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-base text-gray-600 font-medium">
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
              Видео будет отображаться на странице тура. Максимум 100 МБ на файл
            </p>
          </div>
        </div>
      </div>

      {/* Местоположение и описание */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">3</span>
          Местоположение и описание
        </h3>

        {/* Yandex Map */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Яндекс Карта <span className="text-gray-400 text-xs">(необязательно)</span>
          </label>
          <AutoResizeTextarea
            value={formData.yandex_map_url}
            onChange={(e) => handleYandexMapChange(e.target.value)}
            onBlur={() => handleBlur('yandex_map_url')}
            minRows={3}
            maxRows={10}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all font-mono text-xs ${
              errors.yandex_map_url && touched.yandex_map_url
                ? 'border-red-300 focus:ring-red-200 bg-red-50'
                : 'border-gray-300 focus:ring-emerald-200 focus:border-emerald-500'
            }`}
            placeholder='Вставьте ссылку или весь iframe код&#10;Например: <iframe src="https://yandex.ru/map-widget/..." ... ></iframe>'
          />
          <ErrorMessage message={errors.yandex_map_url && touched.yandex_map_url ? errors.yandex_map_url : undefined} />
          {formData.yandex_map_url && !errors.yandex_map_url && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Карта успешно добавлена!
              </p>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Создайте карту в{' '}
            <a 
              href="https://yandex.ru/map-constructor/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              Конструкторе карт Яндекса
            </a>
            {' '}и вставьте код или ссылку
          </p>
        </div>

        {/* Short Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Краткое описание <span className="text-red-500">*</span>
          </label>
          <AutoResizeTextarea
            value={formData.short_desc}
            onChange={(e) => handleFieldChange('short_desc', e.target.value)}
            onBlur={() => handleBlur('short_desc')}
            minRows={3}
            maxRows={8}
            maxLength={500}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
              errors.short_desc && touched.short_desc
                ? 'border-red-300 focus:ring-red-200 bg-red-50'
                : 'border-gray-300 focus:ring-emerald-200 focus:border-emerald-500'
            }`}
            placeholder="Краткое описание для карточки тура (1-2 предложения)..."
          />
          <div className="flex items-center justify-between mt-1">
            <ErrorMessage message={errors.short_desc && touched.short_desc ? errors.short_desc : undefined} />
            <span className="text-xs text-gray-500">
              {formData.short_desc.length}/500
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Это описание будет отображаться на карточке тура в каталоге
          </p>
        </div>

        {/* Full Description (Rich Text Editor) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Полное описание <span className="text-red-500">*</span>
          </label>
          <div className={`border rounded-xl overflow-hidden transition-all ${
            errors.full_desc && touched.full_desc
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300'
          }`}>
            <RichTextEditor
              content={formData.full_desc}
              onChange={(content) => {
                handleFieldChange('full_desc', content);
                if (!touched.full_desc) {
                  setTouched(prev => ({ ...prev, full_desc: true }));
                }
              }}
              placeholder="Напишите детальную информацию о туре с форматированием..."
            />
          </div>
          <ErrorMessage message={errors.full_desc && touched.full_desc ? errors.full_desc : undefined} />
          <p className="text-xs text-gray-500 mt-1">
            Это описание будет отображаться на странице тура
          </p>
        </div>
      </div>

      {/* Дублирование тура (только в режиме редактирования) */}

      {/* Submit Button */}
      <div className="flex gap-4 sticky bottom-6 z-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 px-6 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-sm"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {loadingStatus || 'Сохранение...'}
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              {mode === 'create' ? 'Создать тур' : 'Сохранить изменения'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
