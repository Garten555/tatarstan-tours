'use client';

import { useState } from 'react';
import { Send, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface BanAppealFormProps {
  hasActiveAppeal: boolean;
}

export default function BanAppealForm({ hasActiveAppeal }: BanAppealFormProps) {
  const [appealText, setAppealText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (hasActiveAppeal) {
      setMessage({ type: 'error', text: 'У вас уже есть активная апелляция' });
      return;
    }

    const text = appealText.trim();
    if (text.length < 10) {
      setMessage({ type: 'error', text: 'Текст апелляции должен содержать минимум 10 символов' });
      return;
    }

    if (text.length > 2000) {
      setMessage({ type: 'error', text: 'Текст апелляции не должен превышать 2000 символов' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/ban-appeals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appeal_text: text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось отправить апелляцию');
      }

      setMessage({ type: 'success', text: 'Апелляция успешно отправлена! Модератор рассмотрит её в ближайшее время.' });
      setAppealText('');
      
      // Перезагружаем страницу через 2 секунды
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (hasActiveAppeal) {
    return (
      <div className="bg-blue-50 border-2 sm:border-4 border-blue-200 rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 text-left">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg md:text-xl font-black text-blue-900 mb-2 sm:mb-3 leading-tight">Апелляция отправлена</h3>
            <p className="text-sm sm:text-base md:text-lg font-bold text-blue-800 leading-7 sm:leading-8">
              Ваша апелляция находится на рассмотрении. Модератор рассмотрит её в ближайшее время.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-blue-50 border-2 sm:border-4 border-emerald-200 rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 lg:p-10">
      <div className="mb-5 sm:mb-6 md:mb-8">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 mb-3 sm:mb-4 leading-tight">Подать апелляцию</h2>
        <p className="text-sm sm:text-base md:text-lg font-bold text-gray-800 leading-7 sm:leading-8">
          Если вы считаете, что блокировка была применена по ошибке, вы можете подать апелляцию. 
          Модератор рассмотрит вашу заявку в ближайшее время.
        </p>
      </div>

      {message && (
        <div className={`mb-5 sm:mb-6 p-4 sm:p-5 rounded-xl sm:rounded-2xl border-2 sm:border-4 font-bold ${
          message.type === 'success'
            ? 'bg-green-100 text-green-800 border-green-300'
            : 'bg-red-100 text-red-800 border-red-300'
        }`}>
          <div className="flex items-center gap-2 sm:gap-3">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
            )}
            <span className="text-sm sm:text-base md:text-lg leading-6 sm:leading-7">{message.text}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        <div>
          <label className="block text-base sm:text-lg md:text-xl font-black text-gray-900 mb-3 sm:mb-4">
            Текст апелляции <span className="text-gray-600 font-bold text-sm sm:text-base">(минимум 10 символов)</span>
          </label>
          <textarea
            value={appealText}
            onChange={(e) => setAppealText(e.target.value)}
            placeholder="Опишите, почему вы считаете, что блокировка была применена по ошибке..."
            className="w-full px-4 sm:px-5 md:px-6 py-3 sm:py-4 md:py-5 bg-white border-2 sm:border-4 border-gray-300 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold text-sm sm:text-base md:text-lg resize-none transition-all hover:border-gray-400 leading-6 sm:leading-7"
            rows={6}
            disabled={submitting}
            maxLength={2000}
          />
          <p className="text-xs sm:text-sm md:text-base text-gray-600 font-semibold mt-2">
            {appealText.length} / 2000 символов
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting || appealText.trim().length < 10}
          className="w-full flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 md:px-10 py-4 sm:py-5 md:py-6 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl sm:rounded-2xl font-black text-base sm:text-lg md:text-xl transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: 'white' }}
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" style={{ color: 'white' }} />
              <span style={{ color: 'white' }}>Отправка...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: 'white' }} />
              <span style={{ color: 'white' }}>Отправить апелляцию</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

