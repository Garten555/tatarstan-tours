'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface TwoFactorVerifyProps {
  userId: string;
  onVerify: (code: string) => Promise<void>;
  onCancel?: () => void;
}

export default function TwoFactorVerify({ userId, onVerify, onCancel }: TwoFactorVerifyProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Фокус на первое поле
    codeInputRefs.current[0]?.focus();
  }, []);

  const handleCodeChange = (index: number, value: string) => {
    // Разрешаем только цифры
    if (value && !/^\d$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(null);
    
    // Автоматически переключаемся на следующее поле
    if (value && index < 5) {
      const nextInput = codeInputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
      }
    }

    // Автоматическая проверка, когда все 6 полей заполнены
    if (newCode.every(digit => digit !== '') && !verifying) {
      const codeString = newCode.join('');
      setTimeout(() => {
        handleVerify(codeString);
      }, 300);
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace - удаляем и переходим на предыдущее поле
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = codeInputRefs.current[index - 1];
      if (prevInput) {
        prevInput.focus();
      }
    }
    
    // Вставка кода (Ctrl+V или Cmd+V)
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        const newCode = [...code];
        digits.forEach((digit, i) => {
          if (i < 6) {
            newCode[i] = digit;
          }
        });
        setCode(newCode);
        const lastFilledIndex = Math.min(digits.length - 1, 5);
        const lastInput = codeInputRefs.current[lastFilledIndex];
        if (lastInput) {
          lastInput.focus();
        }
      });
    }
  };

  const handleVerify = async (codeString?: string) => {
    const finalCode = codeString || code.join('');
    if (finalCode.length !== 6) {
      setError('Введите 6-значный код');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      await onVerify(finalCode);
    } catch (err: any) {
      setError(err.message || 'Неверный код. Попробуйте еще раз.');
      // Очищаем код при ошибке
      setCode(['', '', '', '', '', '']);
      codeInputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Двухфакторная аутентификация</h2>
        <p className="text-sm text-gray-600 mb-6">
          Введите 6-значный код из приложения-аутентификатора
        </p>
        
        {/* 6 отдельных полей для кода */}
        <div className="flex justify-center gap-3 mb-4">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                codeInputRefs.current[index] = el;
              }}
              value={digit}
              onChange={(e) => handleCodeChange(index, e.target.value)}
              onKeyDown={(e) => handleCodeKeyDown(index, e)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              className="w-14 h-16 text-center text-3xl font-bold border-2 border-gray-400 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-sm text-gray-900"
              disabled={verifying}
              autoFocus={index === 0}
            />
          ))}
        </div>

        {error && (
          <div className="bg-rose-50 border-2 border-rose-300 text-rose-900 px-4 py-3 rounded-xl font-semibold text-sm mb-4">
            {error}
          </div>
        )}

        <p className="text-xs text-gray-500 text-center">
          Не можете получить код? Используйте резервный код
        </p>
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={() => handleVerify()}
          disabled={verifying || code.join('').length !== 6}
          className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-emerald-300 disabled:to-emerald-400 !text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {verifying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Проверка...
            </>
          ) : (
            'Подтвердить'
          )}
        </button>
        
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={verifying}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl font-semibold transition-all disabled:opacity-50"
          >
            Отмена
          </button>
        )}
      </div>
    </div>
  );
}

