import { Loader2 } from 'lucide-react';

/** Показывается в области main при переходах между страницами /admin/* (сайдбар остаётся). */
export default function AdminLoading() {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-gray-500"
      aria-busy="true"
      aria-label="Загрузка раздела"
    >
      <Loader2 className="h-10 w-10 animate-spin text-emerald-600" aria-hidden />
      <p className="text-sm font-semibold text-gray-600">Загрузка…</p>
    </div>
  );
}
