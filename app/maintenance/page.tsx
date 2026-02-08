import { createServiceClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Техническое обслуживание',
  description: 'Сайт временно недоступен',
};

export default async function MaintenancePage() {
  const supabase = await createServiceClient();

  const { data: setting } = await supabase
    .from('site_settings')
    .select('value_json')
    .eq('key', 'maintenance_mode')
    .single();

  const message = (setting as any)?.value_json?.message || 'Мы проводим обновления. Скоро вернемся.';

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white/90 backdrop-blur shadow-xl rounded-3xl border border-emerald-100 p-10 text-center">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center text-3xl shadow-inner">
          🛠️
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mt-6">
          Сайт на техническом обслуживании
        </h1>
        <p className="text-gray-600 mt-4 text-lg">
          {message}
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div className="text-2xl">⏱️</div>
            <div className="mt-2 font-semibold text-gray-900">Скоро вернёмся</div>
            <div className="text-sm text-gray-600">Плановые обновления</div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div className="text-2xl">🔒</div>
            <div className="mt-2 font-semibold text-gray-900">Данные в безопасности</div>
            <div className="text-sm text-gray-600">Сервис защищён</div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div className="text-2xl">✨</div>
            <div className="mt-2 font-semibold text-gray-900">Будет лучше</div>
            <div className="text-sm text-gray-600">Готовим улучшения</div>
          </div>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          Спасибо за понимание. Если нужно срочно связаться — напишите в поддержку.
        </div>
      </div>
    </main>
  );
}

