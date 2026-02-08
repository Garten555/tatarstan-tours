'use client';

import { useEffect, useState } from 'react';
import { Wrench, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MaintenanceToggle() {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/admin/site-settings/maintenance');
        const data = await response.json();
        if (response.ok) {
          setEnabled(!!data.enabled);
          setMessage(data.message || '');
        }
      } catch (error) {
        console.error('Ошибка загрузки режима обслуживания:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (nextEnabled: boolean) => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/site-settings/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextEnabled, message }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось обновить режим');
      }
      setEnabled(!!data.enabled);
      toast.success(nextEnabled ? 'Техобслуживание включено' : 'Техобслуживание выключено');
    } catch (error: any) {
      toast.error(error.message || 'Не удалось обновить режим');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 md:p-8">
      {/* Заголовок секции */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-amber-100 border-2 border-amber-200 flex items-center justify-center flex-shrink-0">
            <Wrench className="w-7 h-7 md:w-8 md:h-8 text-amber-600" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">
              Техническое обслуживание
            </h2>
            <p className="text-base md:text-lg text-gray-600 font-medium">
              Показывает заглушку всем пользователям, кроме админов.
            </p>
          </div>
        </div>

        <button
          onClick={() => handleSave(!enabled)}
          disabled={loading || saving}
          className={`px-6 py-3 md:px-8 md:py-4 rounded-xl font-black text-base md:text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2 ${
            enabled 
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          } ${loading || saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {saving && <Loader2 className="w-5 h-5 animate-spin" />}
          {enabled ? 'Выключить' : 'Включить'}
        </button>
      </div>

      {/* Поле для сообщения */}
      <div className="mt-6 pt-6 border-t-2 border-gray-100">
        <label className="block text-sm md:text-base font-bold text-gray-700 mb-3">
          Сообщение для пользователей (необязательно)
        </label>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onBlur={() => {
            if (enabled) {
              handleSave(enabled);
            }
          }}
          placeholder="Например: Мы проводим обновления, скоро вернемся."
          className="w-full px-5 py-3 md:px-6 md:py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base md:text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || saving}
        />
      </div>
    </div>
  );
}













