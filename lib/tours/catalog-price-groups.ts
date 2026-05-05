import type { TourRowForDedupe } from '@/lib/tours/listing-dedupe';
import { catalogTourGroupKey } from '@/lib/tours/listing-dedupe';

/**
 * Цена «от / до» считается по продукту (название + город): если хотя бы один выезд
 * попадает в диапазон — в каталоге остаётся вся группа строк для корректного dedupe.
 */
export function filterTourRowsByProductPrice<T extends TourRowForDedupe>(
  rows: T[],
  minPrice: number | null,
  maxPrice: number | null
): T[] {
  const noMin = minPrice === null || minPrice < 0;
  const noMax = maxPrice === null || maxPrice < 0;
  if (noMin && noMax) return rows;

  const groups = new Map<string, T[]>();
  for (const r of rows) {
    const k = catalogTourGroupKey(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }

  const kept = new Set<string>();
  for (const [k, arr] of groups) {
    const anyMatch = arr.some((row) => {
      const p = Number(row.price_per_person);
      if (!Number.isFinite(p)) return false;
      if (!noMin && p < minPrice!) return false;
      if (!noMax && p > maxPrice!) return false;
      return true;
    });
    if (anyMatch) kept.add(k);
  }

  return rows.filter((r) => kept.has(catalogTourGroupKey(r)));
}

export type CatalogProductPricing = {
  catalog_price_from: number;
  catalog_price_to: number;
  catalog_variant_count: number;
};

/** Добавляет к канонической карточке min/max цену и число выездов по всей группе (pool до dedupe). */
export function attachCatalogProductPricing<T extends TourRowForDedupe>(
  canonicalRows: T[],
  poolRows: T[]
): (T & CatalogProductPricing)[] {
  const byKey = new Map<string, T[]>();
  for (const r of poolRows) {
    const k = catalogTourGroupKey(r);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(r);
  }

  return canonicalRows.map((row) => {
    const k = catalogTourGroupKey(row);
    const arr = byKey.get(k) ?? [row];
    const prices = arr.map((r) => Number(r.price_per_person)).filter(Number.isFinite);
    const fallback = Number(row.price_per_person);
    const base = Number.isFinite(fallback) ? fallback : 0;
    const mn = prices.length ? Math.min(...prices) : base;
    const mx = prices.length ? Math.max(...prices) : base;
    return {
      ...row,
      catalog_price_from: mn,
      catalog_price_to: mx,
      catalog_variant_count: arr.length,
    };
  });
}
