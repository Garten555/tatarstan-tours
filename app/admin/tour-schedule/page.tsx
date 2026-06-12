import { CalendarClock } from 'lucide-react';
import TourAutoScheduleSettings from '@/components/admin/TourAutoScheduleSettings';

export const metadata = {
  title: 'Авторасписание туров - Админ панель',
  description: 'Шаблон дат выездов и массовое заполнение',
};

export default function TourScheduleAdminPage() {
  return (
    <div>
      <div className="mb-8 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="px-3 py-1.5 bg-emerald-100/50 border border-emerald-200/50 rounded-xl">
            <span className="text-sm font-bold text-emerald-700">Туры</span>
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 flex items-center gap-3 mb-2">
          <CalendarClock className="w-8 h-8 text-emerald-600" />
          Авторасписание
        </h1>
        <p className="text-lg font-bold text-gray-700">
          Общий шаблон дней и времени; гиды и занятость подбираются автоматически
        </p>
      </div>

      <TourAutoScheduleSettings />
    </div>
  );
}
