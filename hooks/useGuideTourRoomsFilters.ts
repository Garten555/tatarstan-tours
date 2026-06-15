'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  currentDateKey,
  currentMonthKey,
  filterGuideTourRooms,
  type GuideTourLifecycleFilter,
} from '@/lib/admin/guide-tour-rooms-filters';

export function useGuideTourRoomsFilters<
  T extends {
    tour: {
      title: string;
      start_date: string;
      end_date?: string | null;
      city?: { name?: string } | null;
    };
    session_start_at?: string | null;
    session_end_at?: string | null;
  },
>(rooms: T[], perPage = 6) {
  const [filterSearch, setFilterSearch] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState<GuideTourLifecycleFilter>('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);

  const filteredRooms = useMemo(
    () =>
      filterGuideTourRooms(rooms, {
        search: filterSearch,
        lifecycle: lifecycleFilter,
        monthFilter,
        dateFilter,
      }),
    [rooms, filterSearch, lifecycleFilter, monthFilter, dateFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / perPage));
  const showPagination = filteredRooms.length > perPage;

  const paginatedRooms = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * perPage;
    return filteredRooms.slice(start, start + perPage);
  }, [filteredRooms, page, totalPages, perPage]);

  useEffect(() => {
    setPage(1);
  }, [filterSearch, lifecycleFilter, monthFilter, dateFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const hasListFilters =
    Boolean(filterSearch.trim()) ||
    lifecycleFilter !== 'all' ||
    Boolean(monthFilter) ||
    Boolean(dateFilter);

  const resetListFilters = () => {
    setFilterSearch('');
    setLifecycleFilter('all');
    setMonthFilter('');
    setDateFilter('');
    setPage(1);
  };

  const monthInputValue = dateFilter ? dateFilter.slice(0, 7) : monthFilter;

  const applyMonthFilter = (month: string) => {
    setDateFilter('');
    setMonthFilter(month);
  };

  const applyTodayFilter = () => {
    setDateFilter(currentDateKey());
    setMonthFilter('');
    setPage(1);
  };

  const clearDateFilters = () => {
    setMonthFilter('');
    setDateFilter('');
    setPage(1);
  };

  return {
    filterSearch,
    setFilterSearch,
    lifecycleFilter,
    setLifecycleFilter,
    monthFilter,
    dateFilter,
    monthInputValue,
    applyMonthFilter,
    applyTodayFilter,
    clearDateFilters,
    page,
    setPage,
    filteredRooms,
    paginatedRooms,
    totalPages,
    showPagination,
    hasListFilters,
    resetListFilters,
    currentDateKey,
    currentMonthKey,
  };
}
