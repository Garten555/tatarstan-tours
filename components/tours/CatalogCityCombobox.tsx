'use client';

import { MapPin, X, Loader2 } from 'lucide-react';
import { escapeHtml } from '@/lib/utils/sanitize';

export type CatalogCity = { id: string; name: string };

type Props = {
  catalogCities: CatalogCity[];
  loading?: boolean;
  citySearch: string;
  onCitySearchChange: (value: string) => void;
  selectedCity: CatalogCity | null;
  onSelect: (city: CatalogCity) => void;
  onClear: () => void;
  showDropdown: boolean;
  onShowDropdown: (open: boolean) => void;
  dropdownClassName?: string;
  inputClassName?: string;
  placeholder?: string;
};

export default function CatalogCityCombobox({
  catalogCities,
  loading = false,
  citySearch,
  onCitySearchChange,
  selectedCity,
  onSelect,
  onClear,
  showDropdown,
  onShowDropdown,
  dropdownClassName = 'z-[60]',
  inputClassName = '',
  placeholder = 'Выберите или введите город…',
}: Props) {
  const q = citySearch.trim().toLowerCase();
  const filtered = q
    ? catalogCities.filter((c) => c.name.toLowerCase().includes(q))
    : catalogCities;

  return (
    <div className="relative city-search-container">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-600" />
        <input
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          value={citySearch}
          onChange={(e) => {
            const value = e.target.value;
            onCitySearchChange(value);
            onShowDropdown(true);
          }}
          onFocus={() => onShowDropdown(true)}
          placeholder={placeholder}
          className={`w-full rounded-xl border-2 border-gray-300 bg-gray-50 py-3 pl-10 pr-9 text-sm font-medium shadow-sm transition-all hover:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${inputClassName}`}
        />
        {selectedCity ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Очистить город"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {showDropdown ? (
        <div
          className={`absolute ${dropdownClassName} mt-2 max-h-56 w-full overflow-y-auto rounded-xl border-2 border-gray-200 bg-white shadow-xl`}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Загрузка…
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((city) => (
              <button
                key={city.id}
                type="button"
                onClick={() => onSelect(city)}
                className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2.5 text-left text-sm font-medium last:border-b-0 hover:bg-emerald-50"
              >
                <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{escapeHtml(city.name)}</span>
              </button>
            ))
          ) : catalogCities.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-gray-500">Нет городов с турами</div>
          ) : (
            <div className="px-3 py-4 text-center text-sm text-gray-500">Не найден</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
