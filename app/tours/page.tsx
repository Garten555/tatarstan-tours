'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TourCard from '@/components/tours/TourCard';
import CatalogCityCombobox, { type CatalogCity } from '@/components/tours/CatalogCityCombobox';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Search, 
  X, 
  SlidersHorizontal,
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ChevronDown,
} from 'lucide-react';
import { sanitizeText } from '@/lib/utils/sanitize';
import { CATALOG_TOURS_PER_PAGE, parseClientSortParam } from '@/lib/tours/catalog-sort';
import {
  consumeToursCatalogScrollFlag,
  scrollToToursCatalog,
  TOURS_CATALOG_SECTION_ID,
} from '@/lib/tours/catalog-navigation';

interface Tour {
  id: string;
  title: string;
  slug: string;
  short_desc: string | null;
  cover_image: string | null;
  price_per_person: number;
  start_date: string;
  end_date: string | null;
  max_participants: number;
  current_participants: number;
  tour_type: string;
  category: string;
  city?: { id: string; name: string } | null;
  available_spots: number;
  is_available: boolean;
}

interface City extends CatalogCity {}

const TOUR_TYPES = [
  { value: '', label: 'Все типы', icon: '🎯' },
  { value: 'excursion', label: 'Экскурсия', icon: '🏛️' },
  { value: 'hiking', label: 'Пеший тур', icon: '🥾' },
  { value: 'cruise', label: 'Круиз', icon: '⛴️' },
  { value: 'bus_tour', label: 'Автобусный тур', icon: '🚌' },
  { value: 'walking_tour', label: 'Прогулка', icon: '🚶' },
];

const CATEGORIES = [
  { value: '', label: 'Все категории', icon: '🌟' },
  { value: 'history', label: 'История', icon: '📜' },
  { value: 'nature', label: 'Природа', icon: '🌲' },
  { value: 'culture', label: 'Культура', icon: '🎭' },
  { value: 'architecture', label: 'Архитектура', icon: '🏰' },
  { value: 'food', label: 'Гастрономия', icon: '🍽️' },
  { value: 'adventure', label: 'Приключения', icon: '⛰️' },
];

const SORT_OPTIONS = [
  { value: 'created_at-desc', label: 'Новинки' },
  { value: 'price_per_person-asc', label: 'Цена: по возрастанию' },
  { value: 'price_per_person-desc', label: 'Цена: по убыванию' },
  { value: 'start_date-asc', label: 'Дата: ближайшие' },
  { value: 'title-asc', label: 'Название: А-Я' },
];

function ToursPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  /** Всего по фильтрам (все страницы). */
  const [total, setTotal] = useState(0);
  /** Все туры каталога без фильтров — блок «N туров доступно» в hero. */
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [page, setPage] = useState(() => {
    const p = parseInt(searchParams.get('page') || '1', 10);
    return Number.isFinite(p) && p > 0 ? p : 1;
  });
  const [totalPages, setTotalPages] = useState(1);
  const pageScrollReady = useRef(false);
  
  // Фильтры
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [tourType, setTourType] = useState(searchParams.get('tour_type') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [cityId, setCityId] = useState(searchParams.get('city_id') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'created_at-desc');
  /** Мобильная панель «все фильтры» (не перекрывает сетку постоянно — только по запросу) */
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  
  // Города с активными турами (только они в фильтре)
  const [catalogCities, setCatalogCities] = useState<City[]>([]);
  const [catalogCitiesLoading, setCatalogCitiesLoading] = useState(true);
  const [citySearch, setCitySearch] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

  // Загрузка туров
  const loadTours = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (search) params.set('search', search);
      if (tourType) params.set('tour_type', tourType);
      if (category) params.set('category', category);
      if (cityId) params.set('city_id', cityId);
      let minTrim = minPrice.trim().replace(',', '.');
      let maxTrim = maxPrice.trim().replace(',', '.');
      if (minTrim !== '' && maxTrim !== '') {
        const lo = parseFloat(minTrim);
        const hi = parseFloat(maxTrim);
        if (Number.isFinite(lo) && Number.isFinite(hi) && lo > hi) {
          const t = minTrim;
          minTrim = maxTrim;
          maxTrim = t;
        }
      }
      if (minTrim !== '') params.set('min_price', minTrim);
      if (maxTrim !== '') params.set('max_price', maxTrim);

      const { sortField, sortOrder } = parseClientSortParam(sortBy);
      params.set('sort_by', sortField);
      params.set('sort_order', sortOrder);
      params.set('page', page.toString());
      params.set('limit', String(CATALOG_TOURS_PER_PAGE));

      const response = await fetch(`/api/tours/filter?${params.toString()}`);
      if (!response.ok) throw new Error('Ошибка загрузки туров');
      
      const data = await response.json();
      setTours(data.tours || []);
      setTotal(data.total || 0);
      if (typeof data.catalogTotal === 'number') {
        setCatalogTotal(data.catalogTotal);
      }
      setTotalPages(data.totalPages || 1);
      
      // Обновляем URL без перезагрузки страницы
      const newParams = new URLSearchParams(params);
      router.replace(`/tours?${newParams.toString()}`, { scroll: false });
    } catch (error) {
      console.error('Ошибка загрузки туров:', error);
    } finally {
      setLoading(false);
    }
  }, [search, tourType, category, cityId, minPrice, maxPrice, sortBy, page, router]);

  // Города каталога (только с активными турами)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setCatalogCitiesLoading(true);
      try {
        const response = await fetch('/api/cities/catalog');
        const data = await response.json();
        if (!cancelled && response.ok) {
          setCatalogCities(data.cities || []);
        }
      } catch (error) {
        console.error('Ошибка загрузки городов каталога:', error);
      } finally {
        if (!cancelled) setCatalogCitiesLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Город из URL после загрузки каталога
  useEffect(() => {
    const urlCityId = searchParams.get('city_id');
    if (!urlCityId || selectedCity) return;
    const fromCatalog = catalogCities.find((c) => c.id === urlCityId);
    if (fromCatalog) {
      setSelectedCity(fromCatalog);
      setCitySearch(fromCatalog.name);
      setCityId(fromCatalog.id);
    }
  }, [searchParams, selectedCity, catalogCities]);

  // Страница из URL (назад в браузере)
  useEffect(() => {
    const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    setPage((prev) => (prev !== urlPage ? urlPage : prev));
  }, [searchParams]);

  // Загрузка туров при изменении фильтров
  useEffect(() => {
    loadTours();
  }, [loadTours]);

  // Прокрутка к каталогу после возврата с карточки тура или по #tours-catalog
  useEffect(() => {
    if (loading) return;
    const fromHash =
      typeof window !== 'undefined' && window.location.hash === `#${TOURS_CATALOG_SECTION_ID}`;
    const fromFlag = consumeToursCatalogScrollFlag();
    if (fromHash || fromFlag) {
      scrollToToursCatalog('smooth');
      if (fromHash && typeof window !== 'undefined') {
        const clean = `${window.location.pathname}${window.location.search}`;
        window.history.replaceState(null, '', clean);
      }
    }
  }, [loading]);

  // Прокрутка к фильтрам при смене страницы пагинации (не в самый верх hero)
  useEffect(() => {
    if (!pageScrollReady.current) {
      pageScrollReady.current = true;
      return;
    }
    scrollToToursCatalog('smooth');
  }, [page]);

  // Сброс фильтров
  const resetFilters = () => {
    setFiltersSheetOpen(false);
    setSearch('');
    setTourType('');
    setCategory('');
    setCityId('');
    setMinPrice('');
    setMaxPrice('');
    setSelectedCity(null);
    setCitySearch('');
    setPage(1);
    router.replace('/tours', { scroll: false });
  };

  const handleCitySearchChange = (value: string) => {
    setCitySearch(value);
    if (selectedCity && value !== selectedCity.name) {
      setSelectedCity(null);
      setCityId('');
    }
  };

  // Выбор города
  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setCitySearch(city.name);
    setCityId(city.id);
    setShowCityDropdown(false);
    setPage(1);
  };

  // Очистка города
  const handleCityClear = () => {
    setSelectedCity(null);
    setCitySearch('');
    setCityId('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(search || tourType || category || cityId || minPrice.trim() || maxPrice.trim());
  const activeFiltersCount = [
    search.trim() ? 'q' : '',
    tourType,
    category,
    cityId,
    minPrice.trim() ? 'min' : '',
    maxPrice.trim() ? 'max' : '',
  ].filter(Boolean).length;

  useEffect(() => {
    if (!filtersSheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filtersSheetOpen]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero секция */}
      <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-sky-50">
        {/* Декоративные элементы */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -right-32 w-96 h-96 rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="absolute bottom-1/4 -left-32 w-96 h-96 rounded-full bg-sky-200/30 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-100/20 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 relative z-10">
          {/* Кнопка назад */}
          <Link
            href="/"
            className="group inline-flex items-center gap-2 sm:gap-3 text-gray-900 hover:text-emerald-600 transition-all duration-300 mb-6 sm:mb-8 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-white/90 backdrop-blur-md shadow-md hover:shadow-xl border-2 border-gray-200 hover:border-emerald-300 hover:bg-white"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform duration-300 flex-shrink-0" />
            <span className="font-bold text-sm sm:text-base">Назад на главную</span>
          </Link>

          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-emerald-100/80 backdrop-blur-sm border-2 border-emerald-200/50 px-4 py-2 sm:px-5 sm:py-2.5 mb-5 sm:mb-6 md:mb-7 shadow-sm">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              <span className="text-emerald-700 text-xs sm:text-sm font-bold uppercase tracking-wider">Каталог туров</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-gray-900 mb-4 sm:mb-5 md:mb-6 leading-tight">
              Все туры
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-700 mb-8 sm:mb-10 font-medium leading-relaxed px-2">
              Выберите идеальное путешествие по Татарстану
            </p>
            
            <div className="inline-flex items-center gap-3 sm:gap-4 px-6 py-3 sm:px-8 sm:py-4 bg-white/90 backdrop-blur-sm border-2 border-emerald-300/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
              {loading ? (
                <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 animate-spin text-emerald-600" />
              ) : (
                <>
                  <span className="text-3xl sm:text-4xl md:text-5xl font-black text-emerald-600">
                    {catalogTotal || total}
                  </span>
                  <span className="text-gray-800 text-base sm:text-lg md:text-xl lg:text-2xl font-bold">
                    {(catalogTotal || total) === 1
                      ? 'тур'
                      : (catalogTotal || total) < 5
                        ? 'тура'
                        : 'туров'}{' '}
                    доступно
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Каталог: фильтры отдельно от сетки */}
      <section
        id={TOURS_CATALOG_SECTION_ID}
        className="border-t border-gray-100 bg-gray-50 py-6 sm:py-8 md:py-10 scroll-mt-20"
      >
        <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 pb-14">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10">
            <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-20 lg:z-[5] lg:w-80 xl:w-[21rem]">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-md sm:p-5">
                <label className="sr-only" htmlFor="tours-search">
                  Поиск туров
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-600 sm:left-4 sm:h-6 sm:w-6" />
                  <input
                    id="tours-search"
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Название, описание, город…"
                    className="w-full rounded-xl border-2 border-gray-300 bg-gray-50 py-3 pl-11 pr-10 text-base font-medium shadow-sm transition-all placeholder:text-gray-400 hover:bg-white focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 sm:py-3.5 sm:pl-12 sm:pr-11 sm:text-lg"
                  />
                  {search ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setPage(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border-2 border-emerald-200/70 bg-gradient-to-b from-emerald-50/90 to-white p-4 shadow-md sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-base font-black text-gray-900">Цена за человека</span>
                  <span className="rounded-full bg-emerald-600/10 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-emerald-800">
                    от — до, ₽
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label htmlFor="tours-price-from" className="mb-1.5 block text-sm font-black text-gray-800">
                      От
                    </label>
                    <input
                      id="tours-price-from"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={minPrice}
                      onChange={(e) => {
                        setMinPrice(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Напр. 1000"
                      className="w-full rounded-xl border-2 border-gray-300 bg-white py-2.5 pl-3 pr-2 text-sm font-black tabular-nums text-gray-900 shadow-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 sm:py-3"
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="tours-price-to" className="mb-1.5 block text-sm font-black text-gray-800">
                      До
                    </label>
                    <input
                      id="tours-price-to"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={maxPrice}
                      onChange={(e) => {
                        setMaxPrice(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Напр. 15000"
                      className="w-full rounded-xl border-2 border-gray-300 bg-white py-2.5 pl-3 pr-2 text-sm font-black tabular-nums text-gray-900 shadow-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 sm:py-3"
                    />
                  </div>
                </div>
              </div>

              <div className="hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-md lg:block sm:p-5">
                <label className="mb-3 flex items-center gap-2 text-sm font-black text-gray-900">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  Сортировка
                </label>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setPage(1);
                    }}
                    className="w-full appearance-none rounded-xl border-2 border-gray-300 bg-white py-3 pl-3 pr-10 text-sm font-bold text-gray-900 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500"
                    aria-hidden
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-md sm:p-5">
                <p className="mb-3 text-sm font-black text-gray-900">Тип тура</p>
                <div className="flex flex-wrap gap-2">
                  {TOUR_TYPES.filter((t) => t.value).map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        setTourType(tourType === type.value ? '' : type.value);
                        setPage(1);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-xs font-bold shadow-sm transition-all sm:text-sm ${
                        tourType === type.value
                          ? 'border-emerald-400 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/40'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50'
                      }`}
                    >
                      <span className="text-base leading-none">{type.icon}</span>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="hidden space-y-4 lg:block">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-md sm:p-5">
                  <p className="mb-3 text-sm font-black text-gray-900">Категория</p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.filter((c) => c.value).map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          setCategory(category === cat.value ? '' : cat.value);
                          setPage(1);
                        }}
                        className={`rounded-xl px-3 py-2 text-xs font-bold shadow-sm transition-all sm:text-sm ${
                          category === cat.value
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/40'
                            : 'border-2 border-transparent bg-gray-100 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50'
                        }`}
                      >
                        <span className="mr-1">{cat.icon}</span>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-md sm:p-5">
                  <p className="mb-3 text-sm font-black text-gray-900">Город</p>
                  <CatalogCityCombobox
                    catalogCities={catalogCities}
                    loading={catalogCitiesLoading}
                    citySearch={citySearch}
                    onCitySearchChange={handleCitySearchChange}
                    selectedCity={selectedCity}
                    onSelect={handleCitySelect}
                    onClear={handleCityClear}
                    showDropdown={showCityDropdown}
                    onShowDropdown={setShowCityDropdown}
                  />
                </div>
              </div>

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setFiltersSheetOpen(false);
                    resetFilters();
                  }}
                  className="hidden w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 shadow-sm transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 lg:flex"
                >
                  <X className="h-5 w-5" />
                  Сбросить фильтры
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setFiltersSheetOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white py-3.5 text-sm font-black text-gray-800 shadow-md transition-all hover:border-emerald-400 hover:bg-emerald-50 lg:hidden"
              >
                <SlidersHorizontal className="h-5 w-5 text-emerald-600" />
                Категория, город и др.
                {activeFiltersCount > 0 ? (
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-black text-white">
                    {activeFiltersCount}
                  </span>
                ) : null}
              </button>
            </aside>

            <div className="min-w-0 flex-1">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:mb-5">
                <p className="text-sm font-semibold text-gray-600">
                  {loading ? (
                    'Загрузка…'
                  ) : (
                    <>
                      Найдено:{' '}
                      <span className="font-black text-emerald-700">{tours.length}</span>
                    </>
                  )}
                </p>
                <div className="relative w-full sm:max-w-xs lg:hidden">
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setPage(1);
                    }}
                    className="w-full appearance-none rounded-xl border-2 border-gray-300 bg-white py-2.5 pl-3 pr-10 text-sm font-bold text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500"
                    aria-hidden
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-24">
                  <Loader2 className="h-14 w-14 animate-spin text-emerald-600" />
                  <p className="mt-5 text-lg font-bold text-gray-700">Загрузка туров…</p>
                </div>
              ) : tours.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white py-20 text-center shadow-md">
                  <Search className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <h2 className="mb-2 text-2xl font-black text-gray-900 md:text-3xl">Туры не найдены</h2>
                  <p className="mx-auto mb-8 max-w-md px-4 text-gray-600">Измените поиск, цену или фильтры.</p>
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={() => {
                        setFiltersSheetOpen(false);
                        resetFilters();
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3.5 text-lg font-bold text-white shadow-lg hover:bg-emerald-700"
                    >
                      <X className="h-5 w-5" />
                      Сбросить фильтры
                    </button>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(min(100%,18.5rem),1fr))]">
                    {tours.map((tour, index) => (
                      <div
                        key={tour.id}
                        className="min-w-0 animate-in fade-in slide-in-from-bottom-4"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TourCard
                          id={tour.id}
                          title={sanitizeText(tour.title)}
                          slug={tour.slug}
                          short_desc={sanitizeText(tour.short_desc)}
                          cover_image={tour.cover_image || ''}
                          price_per_person={tour.price_per_person}
                          start_date={tour.start_date}
                          end_date={tour.end_date || tour.start_date}
                          max_participants={tour.max_participants}
                          current_participants={tour.current_participants || 0}
                          tour_type={tour.tour_type}
                          category={tour.category}
                        />
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 ? (
                    <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="flex items-center gap-2 rounded-xl border-2 border-gray-200 px-5 py-2.5 text-base font-bold transition-all hover:border-emerald-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronLeft className="h-5 w-5" />
                        Назад
                      </button>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) pageNum = i + 1;
                          else if (page <= 3) pageNum = i + 1;
                          else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                          else pageNum = page - 2 + i;
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setPage(pageNum)}
                              className={`h-11 w-11 rounded-xl text-base font-black transition-all ${
                                page === pageNum
                                  ? 'bg-emerald-600 text-white shadow-lg'
                                  : 'border-2 border-gray-200 bg-white text-gray-700 hover:border-emerald-500'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <span className="px-2 text-base font-bold text-gray-700">
                        {page} / {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="flex items-center gap-2 rounded-xl border-2 border-gray-200 px-5 py-2.5 text-base font-bold transition-all hover:border-emerald-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Вперёд
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {filtersSheetOpen ? (
        <>
          <button
            type="button"
            aria-label="Закрыть фильтры"
            className="fixed inset-0 z-[140] bg-black/45 backdrop-blur-[1px] lg:hidden"
            onClick={() => setFiltersSheetOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-x-0 bottom-0 z-[150] flex max-h-[90vh] flex-col rounded-t-3xl border border-gray-200 bg-white shadow-2xl lg:hidden"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
              <span className="text-lg font-black text-gray-900">Фильтры</span>
              <button
                type="button"
                onClick={() => setFiltersSheetOpen(false)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-4">
              <div className="rounded-2xl border-2 border-emerald-200/70 bg-emerald-50/50 p-4">
                <p className="mb-3 text-sm font-black text-gray-900">Цена за человека, ₽</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="sheet-price-from" className="mb-1 block text-xs font-bold text-gray-700">
                      От
                    </label>
                    <input
                      id="sheet-price-from"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={minPrice}
                      onChange={(e) => {
                        setMinPrice(e.target.value);
                        setPage(1);
                      }}
                      placeholder="От"
                      className="w-full rounded-xl border-2 border-gray-300 bg-white py-2.5 pl-3 pr-2 text-sm font-black tabular-nums focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="sheet-price-to" className="mb-1 block text-xs font-bold text-gray-700">
                      До
                    </label>
                    <input
                      id="sheet-price-to"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={maxPrice}
                      onChange={(e) => {
                        setMaxPrice(e.target.value);
                        setPage(1);
                      }}
                      placeholder="До"
                      className="w-full rounded-xl border-2 border-gray-300 bg-white py-2.5 pl-3 pr-2 text-sm font-black tabular-nums focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-black text-gray-900">Категория</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.filter((c) => c.value).map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        setCategory(category === cat.value ? '' : cat.value);
                        setPage(1);
                      }}
                      className={`rounded-xl px-3 py-2 text-xs font-bold shadow-sm ${
                        category === cat.value
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-800 hover:bg-emerald-50'
                      }`}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-black text-gray-900">Город</p>
                <CatalogCityCombobox
                  catalogCities={catalogCities}
                  loading={catalogCitiesLoading}
                  citySearch={citySearch}
                  onCitySearchChange={handleCitySearchChange}
                  selectedCity={selectedCity}
                  onSelect={handleCitySelect}
                  onClear={handleCityClear}
                  showDropdown={showCityDropdown}
                  onShowDropdown={setShowCityDropdown}
                  dropdownClassName="z-[170]"
                  inputClassName="bg-white"
                />
              </div>

              <div className="relative">
                <p className="mb-2 text-sm font-black text-gray-900">Сортировка</p>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  className="w-full appearance-none rounded-xl border-2 border-gray-300 py-3 pl-3 pr-10 text-sm font-bold"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute bottom-3 right-3 h-5 w-5 text-gray-500"
                  aria-hidden
                />
              </div>

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => resetFilters()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 py-3 font-bold text-gray-700 hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-5 w-5" />
                  Сбросить всё
                </button>
              ) : null}
            </div>
            <div className="shrink-0 border-t border-gray-100 bg-white p-4">
              <button
                type="button"
                onClick={() => setFiltersSheetOpen(false)}
                className="w-full rounded-xl bg-emerald-600 py-3.5 text-base font-black text-white shadow-lg hover:bg-emerald-700"
              >
                Показать туры
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function ToursPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <ToursPageContent />
    </Suspense>
  );
}
