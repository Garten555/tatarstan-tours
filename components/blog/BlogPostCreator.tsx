'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Loader2, Image as ImageIcon, Video, MapPin, X, Check, MoreHorizontal, Route, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import PromptDialog from '@/components/ui/PromptDialog';

interface BlogPostCreatorProps {
  userId: string;
  completedTours?: any[];
  /** Подтверждённые, ещё не прошедшие брони — отдельный шаблон текста */
  upcomingTours?: any[];
}

export default function BlogPostCreator({ userId, completedTours = [], upcomingTours = [] }: BlogPostCreatorProps) {
  const MAX_COVER_SIZE = 5 * 1024 * 1024;
  const ALLOWED_COVER_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showForm, setShowForm] = useState(false);
  /** id бронирования (не tour_id), чтобы различать повторные поездки в один тур */
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<Array<{ file: File; preview: string; type: 'image' | 'video'; url?: string }>>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [locationTags, setLocationTags] = useState<string[]>([]);
  const [newLocationTag, setNewLocationTag] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  /** После открытия формы подгружаем брони с API — на странице профиля список может быть устаревшим или пустым в props */
  const [bookingListsFromApi, setBookingListsFromApi] = useState<{
    completed: any[];
    upcoming: any[];
  } | null>(null);
  const [bookingsLoadStatus, setBookingsLoadStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const mergedCompleted = bookingListsFromApi?.completed ?? completedTours;
  const mergedUpcoming = bookingListsFromApi?.upcoming ?? upcomingTours;

  useEffect(() => {
    if (!showForm) {
      setBookingsLoadStatus('idle');
      setBookingListsFromApi(null);
      return;
    }
    let cancelled = false;
    setBookingsLoadStatus('loading');
    (async () => {
      try {
        const res = await fetch('/api/user/bookings', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || cancelled) {
          if (!cancelled) setBookingsLoadStatus('error');
          return;
        }
        const raw = (data.bookings || []).filter(
          (b: any) =>
            b?.tour &&
            (b.status === 'completed' || b.status === 'confirmed')
        );
        const completed = raw.filter((b: any) => b.status === 'completed');
        const upcoming = raw.filter((b: any) => b.status === 'confirmed');
        if (!cancelled) {
          setBookingListsFromApi({ completed, upcoming });
          setBookingsLoadStatus('done');
        }
      } catch {
        if (!cancelled) setBookingsLoadStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showForm]);

  /** Город из тура иначе название тура (если в туре нет привязки к городу) */
  const tourLocationSuggestions = useMemo(() => {
    const out: { name: string; tourTitle: string; bookingId: string }[] = [];
    const seenCity = new Set<string>();
    const byBooking = new Map<string, { name: string; tourTitle: string; bookingId: string }>();
    for (const b of [...mergedCompleted, ...mergedUpcoming]) {
      const tour = (b as any)?.tour;
      if (!tour) continue;
      const bid = String((b as any).id);
      const cityName = typeof tour.city?.name === 'string' ? tour.city.name.trim() : '';
      if (cityName) {
        const k = cityName.toLowerCase();
        if (seenCity.has(k)) continue;
        seenCity.add(k);
        const row = {
          name: cityName,
          tourTitle: (tour.title as string) || 'Тур',
          bookingId: bid,
        };
        out.push(row);
        byBooking.set(bid, row);
      }
    }
    for (const b of [...mergedCompleted, ...mergedUpcoming]) {
      const tour = (b as any)?.tour;
      if (!tour) continue;
      const bid = String((b as any).id);
      if (byBooking.has(bid)) continue;
      const title = typeof tour.title === 'string' ? tour.title.trim() : '';
      if (title) {
        out.push({ name: title, tourTitle: title, bookingId: bid });
        byBooking.set(bid, { name: title, tourTitle: title, bookingId: bid });
      }
    }
    return out;
  }, [mergedCompleted, mergedUpcoming]);

  const filteredTourLocs = useMemo(() => {
    const q = newLocationTag.trim().toLowerCase();
    return tourLocationSuggestions
      .filter((item) => !locationTags.includes(item.name))
      .filter((item) => {
        if (!q) return false;
        return (
          item.name.toLowerCase().includes(q) ||
          item.tourTitle.toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [tourLocationSuggestions, newLocationTag, locationTags]);

  /** Все брони с туром — по одной карточке (повторные поездки в один город различаются) */
  const tourBookingsForCards = useMemo(
    () => [...mergedCompleted, ...mergedUpcoming].filter((b: any) => b?.tour?.id),
    [mergedCompleted, mergedUpcoming]
  );

  const coverInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  const findBooking = (bookingId: string) =>
    mergedCompleted.find((b: any) => String(b.id) === String(bookingId)) ||
    mergedUpcoming.find((b: any) => String(b.id) === String(bookingId));

  const formatTourDate = (booking: any) => {
    const tour = booking.tour;
    if (!tour) return '';
    const isUpcoming = booking.status === 'confirmed';
    const raw = isUpcoming
      ? (tour.start_date || tour.end_date)
      : (tour.end_date || tour.start_date);
    if (!raw) return '';
    try {
      return new Date(raw).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  /**
   * Одна бронь → обложка и карта из тура (как в карточке тура), место в посте, привязка tour_id.
   * Заголовок и текст подставляются только если поля ещё пустые.
   */
  const applyTourFromBooking = (bookingId: string) => {
    if (!bookingId) {
      setSelectedBookingId('');
      return;
    }
    const booking = findBooking(bookingId);
    if (!booking?.tour) return;

    setSelectedBookingId(String(bookingId));
    const { tour } = booking;
    const isUpcoming = booking.status === 'confirmed';

    if (tour.cover_image) setCoverImageUrl(tour.cover_image);
    if (tour.yandex_map_url) setMapUrl(tour.yandex_map_url);

    const placeTag =
      (typeof tour.city?.name === 'string' && tour.city.name.trim()) ||
      (typeof tour.title === 'string' && tour.title.trim()) ||
      '';
    if (placeTag) {
      setLocationTags((prev) => (prev.includes(placeTag) ? prev : [...prev, placeTag]));
    }

    setTitle((prev) =>
      prev.trim()
        ? prev
        : isUpcoming
          ? `Скоро: ${tour.title}`
          : `Моё путешествие: ${tour.title}`
    );

    setContent((prev) => {
      if (prev.trim()) return prev;
      const when = formatTourDate(booking);
      const dateHint = when ? ` (${when})` : '';
      return isUpcoming
        ? `Скоро еду на тур «${tour.title}»${dateHint}. Делюсь планами и ожиданиями.\n\n`
        : `Недавно я съездил(а) на тур «${tour.title}»${dateHint}. Хочу поделиться впечатлениями.\n\n`;
    });
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Для шапки дневника нужно выбрать изображение');
      return;
    }

    if (!ALLOWED_COVER_TYPES.includes(file.type)) {
      toast.error('Поддерживаются только JPG, PNG и WEBP');
      return;
    }

    if (file.size > MAX_COVER_SIZE) {
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
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        if (!isImage && !isVideo) {
          toast.error(`Формат ${file.name} не поддерживается`);
          continue;
        }

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
    if (newLocationTag.trim().length < 2) {
      setCities([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      fetch(`/api/cities/search?q=${encodeURIComponent(newLocationTag.trim())}`)
        .then((res) => {
          if (!res.ok) throw new Error('cities');
          return res.json();
        })
        .then((data) => {
          setCities(data.cities || []);
        })
        .catch(() => {
          setCities([]);
        });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [newLocationTag]);

  // Закрытие меню "..." при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setShowToolsMenu(false);
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
          tour_id: (() => {
            if (!selectedBookingId) return null;
            const b = findBooking(selectedBookingId);
            return b?.tour?.id ?? null;
          })(),
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
      setSelectedBookingId('');
      
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
        className="bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/30 rounded-2xl border border-emerald-100 p-5 shadow-sm cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all duration-300"
      >
        <div className="flex items-center gap-3 text-gray-600">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-semibold text-gray-900">Добавить запись в туристический дневник</div>
            <div className="text-sm text-gray-600">
              Фото, карта, впечатления и маршрут в одном посте. После открытия формы — блок{' '}
              <span className="font-semibold text-emerald-800">«Из вашего тура»</span> с кнопкой подстановки обложки и
              карты.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const qLoc = newLocationTag.trim();
  const showTourDropdown = qLoc.length >= 1 && filteredTourLocs.length > 0;
  const showCatalogDropdown = qLoc.length >= 2 && cities.length > 0;
  const showLocDropdown = showTourDropdown || showCatalogDropdown;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Тур → обложка, карта и место без ручного ввода (всегда видно блок; список подгружается с API) */}
        <div className="rounded-2xl border-2 border-emerald-100 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 p-4 shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold text-gray-900">Из вашего тура</div>
              <p className="text-sm text-gray-600 mt-0.5 leading-snug">
                Нажмите <strong className="font-semibold text-gray-800">Подставить в пост</strong> — возьмём{' '}
                <strong className="font-semibold text-gray-800">обложку и карту</strong> из карточки этого тура и отметим{' '}
                <strong className="font-semibold text-gray-800">место</strong> (город или название тура). Писать ничего не
                нужно.
              </p>
            </div>
          </div>

          {bookingsLoadStatus === 'loading' && tourBookingsForCards.length === 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white/80 px-4 py-3 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600 shrink-0" aria-hidden />
              Загружаем ваши туры…
            </div>
          )}

          {bookingsLoadStatus === 'error' && tourBookingsForCards.length === 0 && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Не удалось загрузить бронирования. Обновите страницу или проверьте вход в аккаунт.
            </p>
          )}

          {(bookingsLoadStatus === 'done' || bookingsLoadStatus === 'error' || tourBookingsForCards.length > 0) &&
            tourBookingsForCards.length === 0 &&
            bookingsLoadStatus !== 'loading' && (
              <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-950">
                <p className="font-semibold">Пока нет завершённых или подтверждённых туров</p>
                <p className="mt-1 text-amber-900/90">
                  После бронирования здесь появятся кнопки «Подставить в пост» с обложкой и картой из тура.
                </p>
                <Link
                  href="/tours"
                  className="mt-2 inline-flex font-semibold text-emerald-700 underline-offset-2 hover:underline"
                >
                  Перейти к каталогу туров
                </Link>
              </div>
            )}

          <div className="flex gap-3 overflow-x-auto pb-1 pt-1 snap-x snap-mandatory scrollbar-thin">
            {tourBookingsForCards.map((booking: any) => {
              const tour = booking.tour;
              const dateStr = formatTourDate(booking);
              const isSelected = String(selectedBookingId) === String(booking.id);
              const isUpcoming = booking.status === 'confirmed';
              return (
                  <div
                    key={booking.id}
                    className={`snap-start shrink-0 w-[min(240px,calc(100vw-5rem))] rounded-xl border-2 bg-white overflow-hidden shadow-sm transition-colors ${
                      isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/25' : 'border-gray-200 hover:border-emerald-200'
                    }`}
                  >
                    <div className="relative h-[100px] w-full bg-gradient-to-br from-slate-100 to-slate-200">
                      {tour.cover_image ? (
                        <Image
                          src={tour.cover_image}
                          alt=""
                          width={480}
                          height={200}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                          <Route className="h-10 w-10 opacity-60" aria-hidden />
                        </div>
                      )}
                      {isUpcoming && (
                        <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                          Скоро
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 p-3">
                      <div className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">{tour.title}</div>
                      <div className="text-xs text-gray-500 line-clamp-1">
                        {[tour.city?.name, dateStr].filter(Boolean).join(' · ') || 'Тур'}
                      </div>
                      <button
                        type="button"
                        onClick={() => applyTourFromBooking(String(booking.id))}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700 transition-colors"
                      >
                        <Sparkles className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                        Подставить в пост
                      </button>
                    </div>
                  </div>
                );
            })}
          </div>

          <details className="group text-sm">
            <summary className="cursor-pointer list-none text-emerald-700 font-semibold hover:text-emerald-800 [&::-webkit-details-marker]:hidden flex items-center gap-1">
              <span className="underline-offset-2 group-open:underline">Или выберите тур в списке</span>
            </summary>
            <select
              value={selectedBookingId}
              onChange={(e) => applyTourFromBooking(e.target.value)}
              className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 text-base bg-white"
            >
              <option value="">Не привязывать к туру</option>
              {mergedCompleted.length > 0 && (
                <optgroup label="Состоявшиеся поездки">
                  {mergedCompleted.map((booking: any) => {
                    if (!booking.tour) return null;
                    const dateStr = formatTourDate(booking);
                    const datePart = dateStr ? ` — ${dateStr}` : '';
                    return (
                      <option key={booking.id} value={String(booking.id)}>
                        {booking.tour.title}
                        {booking.tour.city?.name ? ` (${booking.tour.city.name})` : ''}
                        {datePart}
                      </option>
                    );
                  })}
                </optgroup>
              )}
              {mergedUpcoming.length > 0 && (
                <optgroup label="Предстоящие">
                  {mergedUpcoming.map((booking: any) => {
                    if (!booking.tour) return null;
                    const dateStr = formatTourDate(booking);
                    const datePart = dateStr ? ` — ${dateStr}` : '';
                    return (
                      <option key={booking.id} value={String(booking.id)}>
                        {booking.tour.title}
                        {booking.tour.city?.name ? ` (${booking.tour.city.name})` : ''}
                        {datePart}
                      </option>
                    );
                  })}
                </optgroup>
              )}
            </select>
          </details>
        </div>

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

        {/* Шапка записи */}
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

        {/* Места: подсказки из ваших туров + каталог городов */}
        <div className="rounded-xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm space-y-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <MapPin className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden />
              Место в посте
            </div>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Основное место и медиа тура — из блока <strong>«Из вашего тура»</strong> выше (без набора текста). Здесь —
              только <strong>дополнительные</strong> точки: выберите строку из туров (подставит обложку и карту этой брони)
              или город из каталога с <strong>2 букв</strong>. Свой вариант — целиком и «Добавить» или Enter.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-stretch">
            <div className="relative flex-1 min-w-0">
              <input
                ref={locationInputRef}
                type="text"
                value={newLocationTag}
                onChange={(e) => setNewLocationTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredTourLocs.length > 0) {
                      applyTourFromBooking(filteredTourLocs[0].bookingId);
                    } else if (cities.length > 0) {
                      selectCity(cities[0]);
                    } else {
                      addLocationTag();
                    }
                  }
                }}
                placeholder="Начните вводить город или название тура…"
                autoComplete="off"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-shadow"
              />
              {showLocDropdown && (
                <div
                  ref={cityDropdownRef}
                  className="absolute top-full left-0 right-0 mt-1.5 bg-white border-2 border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto"
                >
                  {showTourDropdown && (
                    <>
                      <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-100">
                        Ваши туры
                      </div>
                      {filteredTourLocs.map((t) => (
                        <button
                          key={t.bookingId}
                          type="button"
                          onClick={() => applyTourFromBooking(t.bookingId)}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-emerald-50 transition-colors border-b border-slate-100 flex items-start gap-2"
                        >
                          <Route className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
                          <span className="min-w-0">
                            <span className="font-semibold text-slate-900 block">{t.name}</span>
                            <span className="text-xs text-slate-500 line-clamp-2">{t.tourTitle}</span>
                            <span className="text-[11px] text-emerald-700 font-medium mt-0.5">
                              Подставить обложку и карту тура
                            </span>
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                  {showCatalogDropdown && (
                    <>
                      {showTourDropdown && (
                        <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-100">
                          Каталог городов
                        </div>
                      )}
                      {cities.map((city) => (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() => selectCity(city)}
                          className="w-full px-4 py-3 text-left text-sm hover:bg-emerald-50 text-slate-800 transition-colors flex items-center gap-2 border-b border-slate-100 last:border-0"
                        >
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden />
                          {city.name}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => addLocationTag()}
                className="flex-1 sm:flex-none px-5 py-3 rounded-xl border-2 border-emerald-600 text-emerald-700 font-bold hover:bg-emerald-50 transition-colors text-base"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>

        {/* Панель инструментов */}
        <div className="flex flex-col gap-3 pt-2 border-t border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {mediaFiles.length > 0 && (
                <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                  Медиа: {mediaFiles.length}
                </span>
              )}
              {coverImageUrl && (
                <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                  Шапка добавлена
                </span>
              )}
            </div>

            <div className="relative ml-auto" ref={toolsMenuRef}>
              <button
                type="button"
                onClick={() => setShowToolsMenu((prev) => !prev)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Дополнительные действия"
              >
                <MoreHorizontal className="w-5 h-5 text-gray-700" />
              </button>

              {showToolsMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowToolsMenu(false);
                      mediaInputRef.current?.click();
                    }}
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-800"
                  >
                    <Video className="w-4 h-4" />
                    Добавить фото/видео
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowToolsMenu(false);
                      coverInputRef.current?.click();
                    }}
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-800"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Добавить шапку записи
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowToolsMenu(false);
                      setShowMapDialog(true);
                    }}
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-800"
                  >
                    <MapPin className="w-4 h-4" />
                    Добавить карту
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Скрытые инпуты для меню действий */}
          <input
            ref={coverInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleCoverUpload}
            disabled={uploadingCover}
          />
          <input
            ref={mediaInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/*"
            multiple
            onChange={handleMediaSelect}
            disabled={uploadingMedia}
          />

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white !text-white shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all min-h-[48px] min-w-[160px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Публикация...</span>
                </>
              ) : (
                'Опубликовать'
              )}
            </button>
          </div>
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
