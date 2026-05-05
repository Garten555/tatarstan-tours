'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TourCard from '@/components/tours/TourCard';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  X,
  Loader2,
  MapPin,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ChevronDown,
  Coins,
} from 'lucide-react';
import { sanitizeText, escapeHtml } from '@/lib/utils/sanitize';
import { parseClientSortParam } from '@/lib/tours/catalog-sort';

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
  catalog_price_from?: number;
  catalog_price_to?: number;
  catalog_variant_count?: number;
}

function initialSortFromSearchParams(sp: { get: (k: string) => string | null }): string {
  const sb = sp.get('sort_by');
  const so = sp.get('sort_order');
  if (sb && (so === 'asc' || so === 'desc')) return `${sb}-${so}`;
  if (sb?.includes('-')) return sb;
  return 'created_at-desc';
}

interface City {
  id: string;
  name: string;
}

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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Фильтры
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [tourType, setTourType] = useState(searchParams.get('tour_type') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [cityId, setCityId] = useState(searchParams.get('city_id') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');
  const [sortBy, setSortBy] = useState(() => initialSortFromSearchParams(searchParams));
  
  // Города для фильтра
  const [cities, setCities] = useState<City[]>([]);
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
      const minTrim = minPrice.trim().replace(',', '.');
      const maxTrim = maxPrice.trim().replace(',', '.');
      if (minTrim !== '') params.set('min_price', minTrim);
      if (maxTrim !== '') params.set('max_price', maxTrim);

      const { sortField, sortOrder } = parseClientSortParam(sortBy);
      params.set('sort_by', sortField);
      params.set('sort_order', sortOrder);
      params.set('page', page.toString());
      params.set('limit', '10');

      const response = await fetch(`/api/tours/filter?${params.toString()}`);
      if (!response.ok) throw new Error('Ошибка загрузки туров');
      
      const data = await response.json();
      setTours(data.tours || []);
      setTotal(data.total || 0);
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

  // Поиск городов
  useEffect(() => {
    if (citySearch.length < 2) {
      setCities([]);
      setShowCityDropdown(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/cities?search=${encodeURIComponent(citySearch)}`);
        if (!response.ok) {
          throw new Error('Ошибка запроса');
        }
        const data = await response.json();
        const foundCities = data.cities || [];
        setCities(foundCities);
        if (foundCities.length > 0 || citySearch.length >= 2) {
          setShowCityDropdown(true);
        }
      } catch (error) {
        console.error('Ошибка поиска городов:', error);
        setCities([]);
        setShowCityDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [citySearch]);

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

  // Загрузка выбранного города из URL
  useEffect(() => {
    const urlCityId = searchParams.get('city_id');
    if (urlCityId && !selectedCity) {
      fetch(`/api/admin/cities/${urlCityId}`)
        .then(res => res.json())
        .then(data => {
          if (data.city) {
            setSelectedCity(data.city);
            setCitySearch(data.city.name);
            setCityId(data.city.id);
          }
        })
        .catch(console.error);
    }
  }, [searchParams, selectedCity]);

  // Загрузка туров при изменении фильтров
  useEffect(() => {
    loadTours();
  }, [loadTours]);

  // Прокрутка вверх при смене страницы
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  // Сброс фильтров
  const resetFilters = () => {
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

  const hasActiveFilters = search || tourType || category || cityId || minPrice || maxPrice;
  const activeFiltersCount = [tourType, category, cityId, minPrice, maxPrice].filter(Boolean).length;

  return (
    <main className="min-h-screen bg-white">
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
                  <span className="text-3xl sm:text-4xl md:text-5xl font-black text-emerald-600">{total}</span>
                  <span className="text-gray-800 text-base sm:text-lg md:text-xl lg:text-2xl font-bold">
                    {total === 1 ? 'тур' : total < 5 ? 'тура' : 'туров'} доступно
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Поиск и фильтры */}
      <section className="py-8 sm:py-10 md:py-12 bg-gradient-to-b from-[#eef6f2] to-gray-50">
        <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 max-w-7xl">
          <div className="rounded-3xl border border-emerald-100 bg-white shadow-[0_12px_48px_-16px_rgba(5,150,105,0.35)] overflow-hidden mb-6 sm:mb-8">
            <div className="border-b border-emerald-50 bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/50 px-4 py-4 sm:px-6 sm:py-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-600 sm:h-6 sm:w-6" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Название, описание или город…"
                  className="w-full rounded-2xl border-2 border-emerald-100 bg-white py-3.5 pl-12 pr-12 text-base font-medium text-gray-900 shadow-inner outline-none transition placeholder:text-gray-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 sm:py-4 sm:pl-14 sm:pr-14 sm:text-lg"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    aria-label="Очистить поиск"
                  >
                    <X className="h-5 w-5" />
                  </button>
                ) : null}
              </div>
              <p className="mt-3 text-xs font-medium text-emerald-800/80 sm:text-sm">
                Цена «от / до» учитывает все выезды одного тура (разные даты и гиды). В списке покажется тур,
                если хотя бы один выезд попадает в диапазон.
              </p>
            </div>

            <div className="space-y-8 p-4 sm:p-6 md:p-8">
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-800">Категория</span>
                  {activeFiltersCount > 0 ? (
                    <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-black text-white">
                      активных: {activeFiltersCount}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.filter((c) => c.value).map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        setCategory(category === cat.value ? '' : cat.value);
                        setPage(1);
                      }}
                      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition sm:py-3 sm:text-base ${
                        category === cat.value
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 ring-2 ring-emerald-400/60'
                          : 'border-2 border-gray-100 bg-gray-50 text-gray-800 hover:border-emerald-200 hover:bg-emerald-50/80'
                      }`}
                    >
                      <span className="text-lg leading-none">{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
                <div className="lg:col-span-5">
                  <div className="mb-2 flex items-center gap-2 text-emerald-800">
                    <Coins className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-black uppercase tracking-wide">Цена за человека, ₽</span>
                  </div>
                  <div className="flex items-end gap-3">
                    <label className="min-w-0 flex-1">
                      <span className="mb-1 block text-xs font-bold text-gray-500">От</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={minPrice}
                        onChange={(e) => {
                          setMinPrice(e.target.value);
                          setPage(1);
                        }}
                        placeholder="0"
                        className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50/80 px-4 py-3 text-base font-bold text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15"
                      />
                    </label>
                    <span className="pb-3 font-bold text-gray-400">—</span>
                    <label className="min-w-0 flex-1">
                      <span className="mb-1 block text-xs font-bold text-gray-500">До</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={maxPrice}
                        onChange={(e) => {
                          setMaxPrice(e.target.value);
                          setPage(1);
                        }}
                        placeholder="∞"
                        className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50/80 px-4 py-3 text-base font-bold text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15"
                      />
                    </label>
                  </div>
                </div>

                <div className="relative city-search-container lg:col-span-4">
                  <div className="mb-2 flex items-center gap-2 text-emerald-800">
                    <MapPin className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-black uppercase tracking-wide">Город</span>
                  </div>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-600" />
                    <input
                      type="text"
                      value={citySearch}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCitySearch(value);
                        if (selectedCity && value !== selectedCity.name) {
                          setSelectedCity(null);
                          setCityId('');
                        }
                        setShowCityDropdown(value.length >= 2);
                      }}
                      onFocus={() => {
                        if (citySearch.length >= 2 && cities.length > 0) setShowCityDropdown(true);
                      }}
                      placeholder="Начните вводить название…"
                      className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50/80 py-3 pl-11 pr-10 text-base font-medium outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15"
                    />
                    {selectedCity ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCityClear();
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    ) : null}
                  </div>
                  {showCityDropdown && citySearch.length >= 2 ? (
                    <div className="absolute z-50 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border-2 border-emerald-100 bg-white shadow-xl">
                      {cities.length > 0 ? (
                        cities.map((city) => (
                          <button
                            key={city.id}
                            type="button"
                            onClick={() => handleCitySelect(city)}
                            className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left font-medium last:border-0 hover:bg-emerald-50"
                          >
                            <MapPin className="h-5 w-5 shrink-0 text-emerald-600" />
                            <span>{escapeHtml(city.name)}</span>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-4 text-center text-sm text-gray-500">Город не найден</div>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="lg:col-span-3">
                  <div className="mb-2 flex items-center gap-2 text-emerald-800">
                    <TrendingUp className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-black uppercase tracking-wide">Сортировка</span>
                  </div>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value);
                        setPage(1);
                      }}
                      className="w-full appearance-none rounded-2xl border-2 border-gray-200 bg-white py-3 pl-4 pr-11 text-sm font-bold text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 sm:text-base"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                  </div>
                </div>
              </div>

              <div>
                <span className="mb-3 block text-xs font-black uppercase tracking-wider text-emerald-800">
                  Тип тура
                </span>
                <div className="flex flex-wrap gap-2">
                  {TOUR_TYPES.filter((t) => t.value).map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        setTourType(tourType === type.value ? '' : type.value);
                        setPage(1);
                      }}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold sm:px-4 sm:py-2.5 sm:text-base ${
                        tourType === type.value
                          ? 'bg-teal-700 text-white shadow-md'
                          : 'border border-gray-200 bg-white text-gray-800 hover:border-emerald-300 hover:bg-emerald-50/60'
                      }`}
                    >
                      <span>{type.icon}</span>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {hasActiveFilters ? (
                <div className="flex justify-end border-t border-gray-100 pt-6">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 rounded-2xl border-2 border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 sm:text-base"
                  >
                    <X className="h-5 w-5" />
                    Сбросить фильтры
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Туры */}
      <section className="py-8 md:py-12 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 pb-16">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-32">
              <div className="relative">
                <Loader2 className="w-16 h-16 animate-spin text-emerald-600" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-emerald-200 rounded-full"></div>
              </div>
              <p className="mt-6 text-gray-700 text-xl font-bold">Загрузка туров...</p>
            </div>
          ) : tours.length === 0 ? (
            <div className="text-center py-32">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                Туры не найдены
              </h2>
              <p className="text-gray-600 mb-8 text-xl max-w-md mx-auto font-medium">
                Попробуйте изменить параметры поиска или фильтры
              </p>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <X className="w-5 h-5" />
                  Сбросить фильтры
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
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
                      catalog_price_from={tour.catalog_price_from}
                      catalog_price_to={tour.catalog_price_to}
                      catalog_variant_count={tour.catalog_variant_count}
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

              {/* Пагинация */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-16">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-6 py-3 border-2 border-gray-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-emerald-500 transition-all duration-200 flex items-center gap-2 font-bold text-base"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Назад
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-12 h-12 rounded-xl font-black text-base transition-all duration-200 ${
                            page === pageNum
                              ? 'bg-emerald-600 text-white shadow-lg hover:bg-emerald-700'
                              : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-emerald-500 hover:text-emerald-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <span className="text-gray-700 font-bold text-lg px-4">
                    Страница {page} из {totalPages}
                  </span>

                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-6 py-3 border-2 border-gray-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-emerald-500 transition-all duration-200 flex items-center gap-2 font-bold text-base"
                  >
                    Вперед
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
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
