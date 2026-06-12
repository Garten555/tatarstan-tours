import Link from 'next/link';
import { ShieldX } from 'lucide-react';

export const metadata = {
  title: 'Доступ запрещён',
  description: 'Недостаточно прав для просмотра этой страницы',
};

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white/90 backdrop-blur shadow-xl rounded-3xl border border-emerald-100 p-10 text-center">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center shadow-inner">
          <ShieldX className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mt-6">Доступ запрещён</h1>
        <p className="text-gray-600 mt-4">
          У вашей роли нет прав для этого раздела админ-панели.
        </p>
        <Link
          href="/admin"
          className="inline-block mt-8 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
        >
          Вернуться в панель управления
        </Link>
      </div>
    </div>
  );
}
