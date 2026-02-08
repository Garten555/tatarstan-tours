'use client';

import { useState } from 'react';
import { Ban, CheckCircle, Loader2, X, Shield, AlertTriangle, Clock, Calendar } from 'lucide-react';

interface BanUserButtonProps {
  userId: string;
  isBanned: boolean;
  banReason?: string | null;
  bannedAt?: string | null;
  banUntil?: string | null;
  userRole?: string;
  onBanChange?: () => void;
}

// Предопределенные причины бана
const BAN_REASONS = [
  { value: 'spam', label: 'Спам и реклама' },
  { value: 'harassment', label: 'Оскорбления и домогательства' },
  { value: 'fake_content', label: 'Распространение ложной информации' },
  { value: 'violation_rules', label: 'Нарушение правил платформы' },
  { value: 'fraud', label: 'Мошенничество' },
  { value: 'inappropriate_content', label: 'Неприемлемый контент' },
  { value: 'multiple_violations', label: 'Множественные нарушения' },
  { value: 'custom', label: 'Другая причина (указать вручную)' },
];

export default function BanUserButton({ 
  userId, 
  isBanned, 
  banReason,
  bannedAt,
  banUntil,
  userRole,
  onBanChange 
}: BanUserButtonProps) {
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banReasonInput, setBanReasonInput] = useState('');
  const [selectedBanReason, setSelectedBanReason] = useState<string>('');
  const [banPermanent, setBanPermanent] = useState(false);
  const [banDurationDays, setBanDurationDays] = useState(0);
  const [banDurationHours, setBanDurationHours] = useState(0);
  const [banning, setBanning] = useState(false);
  const [banMessage, setBanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleBan = async () => {
    setBanning(true);
    setBanMessage(null);

    // Определяем финальную причину бана
    let finalReason: string | null = null;
    if (selectedBanReason === 'custom') {
      finalReason = banReasonInput.trim() || null;
    } else if (selectedBanReason) {
      const reasonObj = BAN_REASONS.find(r => r.value === selectedBanReason);
      finalReason = reasonObj ? reasonObj.label : null;
      // Если выбрана причина из списка, но также есть кастомный текст, добавляем его
      if (banReasonInput.trim()) {
        finalReason = `${finalReason}: ${banReasonInput.trim()}`;
      }
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'ban',
          reason: finalReason,
          permanent: banPermanent,
          duration_hours: banDurationHours,
          duration_days: banDurationDays,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось забанить пользователя');
      }

      setBanMessage({ type: 'success', text: 'Пользователь успешно забанен!' });
      setBanModalOpen(false);
      setBanReasonInput('');
      setSelectedBanReason('');
      setBanPermanent(false);
      setBanDurationDays(0);
      setBanDurationHours(0);
      
      // Немедленная перезагрузка для обновления данных
      if (onBanChange) {
        onBanChange();
      } else {
        // Если нет callback, перезагружаем напрямую
        window.location.reload();
      }
    } catch (error: any) {
      setBanMessage({ type: 'error', text: error.message });
    } finally {
      setBanning(false);
    }
  };

  const handleUnban = async () => {
    setBanning(true);
    setBanMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'unban',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось разбанить пользователя');
      }

      setBanMessage({ type: 'success', text: 'Пользователь успешно разбанен!' });
      
      if (onBanChange) {
        onBanChange();
      }
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      setBanMessage({ type: 'error', text: error.message });
    } finally {
      setBanning(false);
    }
  };

  const resetModal = () => {
    setBanReasonInput('');
    setSelectedBanReason('');
    setBanPermanent(false);
    setBanDurationDays(0);
    setBanDurationHours(0);
  };

  return (
    <>
      {/* Сообщение о бане/разбане */}
      {banMessage && (
        <div className={`p-4 rounded-xl font-bold text-center mb-4 ${
          banMessage.type === 'success' 
            ? 'bg-green-100 text-green-800 border-2 border-green-300' 
            : 'bg-red-100 text-red-800 border-2 border-red-300'
        }`}>
          {banMessage.text}
        </div>
      )}

      {/* Кнопка бана/разбана */}
      <button
        onClick={() => {
          if (isBanned) {
            handleUnban();
          } else {
            setBanModalOpen(true);
          }
        }}
        disabled={banning}
        className={`inline-flex items-center gap-2 px-4 py-2 border-2 rounded-xl font-bold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed !text-white ${
          isBanned
            ? 'border-green-500 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
            : 'border-red-500 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
        }`}
        style={{ color: 'white' }}
      >
        {banning ? (
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'white' }} />
        ) : isBanned ? (
          <>
            <CheckCircle className="w-4 h-4" style={{ color: 'white' }} />
            <span style={{ color: 'white' }}>Разбанить</span>
          </>
        ) : (
          <>
            <Ban className="w-4 h-4" style={{ color: 'white' }} />
            <span style={{ color: 'white' }}>Забанить</span>
          </>
        )}
      </button>

      {/* Модальное окно для бана */}
      {banModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl border-2 border-gray-200 shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Заголовок */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-6 border-b-2 border-red-800">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Ban className="w-8 h-8 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl sm:text-3xl font-black text-white break-words leading-tight">
                      Забанить пользователя
                    </h2>
                    <p className="text-base sm:text-lg text-red-50 mt-2 font-semibold">Выберите причину и длительность бана</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setBanModalOpen(false);
                    resetModal();
                  }}
                  className="text-white/90 hover:text-white hover:bg-white/20 rounded-lg p-2.5 transition-all flex-shrink-0"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>
            </div>

            {/* Контент с прокруткой */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 sm:space-y-8">
              {/* Предупреждение при бане админа */}
              {userRole && ['tour_admin', 'support_admin'].includes(userRole) && (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl p-5 sm:p-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Shield className="w-7 h-7 text-amber-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg sm:text-xl font-black text-amber-900 mb-2 flex items-center gap-2 leading-tight">
                        <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                        Внимание: Бан администратора
                      </h3>
                      <p className="text-base sm:text-lg font-semibold text-amber-800 leading-relaxed break-words">
                        При бане этого пользователя он будет автоматически снят с роли администратора и забанен. Это действие необратимо до разбана.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Причина бана */}
              <div className="space-y-4">
                <label className="block text-lg sm:text-xl font-black text-gray-900 leading-tight">
                  Причина бана <span className="text-gray-600 font-semibold text-base">(необязательно)</span>
                </label>
                
                {/* Dropdown для выбора причины */}
                <div>
                  <select
                    value={selectedBanReason}
                    onChange={(e) => {
                      setSelectedBanReason(e.target.value);
                      if (e.target.value !== 'custom') {
                        setBanReasonInput('');
                      }
                    }}
                    className="w-full px-5 py-4 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-bold text-base sm:text-lg text-gray-900 cursor-pointer transition-all hover:border-gray-400"
                  >
                    <option value="">-- Выберите причину бана --</option>
                    {BAN_REASONS.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Дополнительный текст (если выбрана причина из списка или кастомная) */}
                {(selectedBanReason === 'custom' || (selectedBanReason && selectedBanReason !== '')) && (
                  <div>
                    <label className="block text-base sm:text-lg font-bold text-gray-800 mb-3">
                      {selectedBanReason === 'custom' ? 'Укажите причину бана' : 'Дополнительные детали (необязательно)'}
                    </label>
                    <textarea
                      value={banReasonInput}
                      onChange={(e) => setBanReasonInput(e.target.value)}
                      placeholder={selectedBanReason === 'custom' ? 'Опишите причину бана...' : 'Добавьте дополнительные детали...'}
                      className="w-full px-5 py-4 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium text-base sm:text-lg resize-none transition-all hover:border-gray-400 leading-relaxed"
                      rows={5}
                    />
                  </div>
                )}
              </div>

              {/* Тип бана */}
              <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-5 sm:p-6">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={banPermanent}
                    onChange={(e) => setBanPermanent(e.target.checked)}
                    className="w-6 h-6 mt-1 text-red-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-red-500 flex-shrink-0 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-lg sm:text-xl font-black text-gray-900 block mb-1.5 leading-tight">Постоянный бан</span>
                    <span className="text-base sm:text-lg text-gray-700 font-semibold leading-relaxed">Пользователь будет забанен навсегда</span>
                  </div>
                </label>
              </div>

              {/* Длительность бана (если не постоянный) */}
              {!banPermanent && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 sm:p-7">
                  <div className="flex items-center gap-3 mb-5">
                    <Clock className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg sm:text-xl font-black text-gray-900 leading-tight">Длительность бана</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-base sm:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Дней
                      </label>
                      <input
                        type="number"
                        value={banDurationDays}
                        onChange={(e) => setBanDurationDays(Math.max(0, parseInt(e.target.value) || 0))}
                        min="0"
                        className="w-full px-5 py-4 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-lg transition-all hover:border-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-base sm:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Часов
                      </label>
                      <input
                        type="number"
                        value={banDurationHours}
                        onChange={(e) => setBanDurationHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                        min="0"
                        max="23"
                        className="w-full px-5 py-4 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-lg transition-all hover:border-gray-400"
                      />
                    </div>
                  </div>
                  {(banDurationDays > 0 || banDurationHours > 0) && (
                    <p className="mt-4 text-base sm:text-lg font-bold text-blue-700 leading-relaxed">
                      Бан будет действовать до: {new Date(Date.now() + (banDurationDays * 24 + banDurationHours) * 60 * 60 * 1000).toLocaleString('ru-RU')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Футер с кнопками */}
            <div className="border-t-2 border-gray-200 bg-gray-50 px-6 sm:px-8 py-5 sm:py-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleBan}
                  disabled={banning}
                  className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl font-black text-lg sm:text-xl transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed !text-white"
                  style={{ color: 'white' }}
                >
                  {banning ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'white' }} />
                      <span style={{ color: 'white' }}>Бан...</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-6 h-6" style={{ color: 'white' }} />
                      <span style={{ color: 'white' }}>Забанить</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setBanModalOpen(false);
                    resetModal();
                  }}
                  disabled={banning}
                  className="px-6 py-4 border-2 border-gray-300 hover:bg-gray-100 rounded-xl font-bold text-lg sm:text-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed !text-gray-800"
                  style={{ color: 'rgb(31 41 55)' }}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
