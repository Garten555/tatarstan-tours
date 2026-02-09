'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, LogIn, Mail, Lock } from 'lucide-react';
import { validateEmail } from '@/lib/validation/auth';
import TwoFactorVerify from './TwoFactorVerify';

export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  type LoginStep = 'email' | 'password' | '2fa';
  
  const [step, setStep] = useState<LoginStep>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [has2FA, setHas2FA] = useState(false); // Есть ли 2FA у пользователя
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);

    // Валидация email в реальном времени
    if (name === 'email') {
      if (value) {
        const emailValidation = validateEmail(value);
        setEmailError(emailValidation.valid ? null : (emailValidation.error ?? null));
      } else {
        setEmailError(null);
      }
    }
  };

  // Шаг 1: Проверка email и определение наличия 2FA
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email.trim()) {
      setError('Введите email');
      return;
    }

    if (emailError) {
      setError('Исправьте ошибки в email');
      return;
    }

    setLoading(true);

    try {
      // Проверяем, включена ли 2FA для этого email
      const mfaCheckResponse = await fetch('/api/auth/2fa/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      const mfaCheckData = await mfaCheckResponse.json();
      
      if (mfaCheckData.enabled) {
        // У пользователя включена 2FA - переходим к вводу кода
        setHas2FA(true);
        setUserId(mfaCheckData.userId);
        setNeeds2FA(true);
        setStep('2fa');
      } else {
        // У пользователя нет 2FA - переходим к вводу пароля
        setHas2FA(false);
        setStep('password');
      }
    } catch (err) {
      console.error('Ошибка проверки 2FA:', err);
      setError('Ошибка при проверке аккаунта');
    } finally {
      setLoading(false);
    }
  };

  // Шаг 2: Вход с паролем (если нет 2FA)
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.password) {
      setError('Введите пароль');
      return;
    }

    setLoading(true);

    try {
      // Вход через Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) throw signInError;

      if (data.user) {
        // Загружаем роль из profiles и обновляем user_metadata
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, first_name, last_name, avatar_url')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          // Обновляем user_metadata с актуальной ролью
          await supabase.auth.updateUser({
            data: {
              role: (profile as any).role,
              first_name: (profile as any).first_name,
              last_name: (profile as any).last_name,
              avatar_url: (profile as any).avatar_url,
            },
          });
        }

        // Успешный вход - редирект на главную страницу
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      console.error('Ошибка входа:', err);
      setError(
        err instanceof Error && err.message.includes('Invalid')
          ? 'Неверный пароль'
          : 'Произошла ошибка при входе'
      );
    } finally {
      setLoading(false);
    }
  };

  // Шаг 3: Проверка кода 2FA (быстрый вход без пароля)
  const handle2FAVerify = async (code: string) => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      // Быстрый вход только по коду 2FA (без пароля)
      const response = await fetch('/api/auth/quick-login-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          code: code,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Неверный код');
      }

      // Используем magic link для входа
      if (data.loginLink) {
        window.location.href = data.loginLink;
      } else {
        setError('Ошибка при создании сессии');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка при проверке кода');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Если требуется 2FA, показываем форму проверки кода
  if (step === '2fa' && needs2FA && userId) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-50 to-emerald-50 border-2 border-blue-400 rounded-xl p-5 mb-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-blue-900 mb-1">
                Вход по коду 2FA
              </h3>
              <p className="text-sm text-blue-800 font-medium">
                Введите 6-значный код из приложения-аутентификатора (Google Authenticator, Authy и т.д.).
              </p>
            </div>
          </div>
        </div>
        <TwoFactorVerify
          userId={userId}
          onVerify={handle2FAVerify}
          onCancel={() => {
            setNeeds2FA(false);
            setUserId(null);
            setHas2FA(false);
            setStep('email');
            setFormData({ email: formData.email, password: '' });
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Сообщение об ошибке */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="bg-gradient-to-br from-red-50 via-rose-50 to-red-50 border-2 border-red-300 text-red-900 px-5 py-4 rounded-2xl text-sm sm:text-base font-bold shadow-lg backdrop-blur-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-black">!</span>
              </div>
              <p className="flex-1">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Шаг 1: Email */}
      {step === 'email' && (
        <form onSubmit={handleEmailSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="flex items-center gap-2 text-sm sm:text-base font-black text-gray-900">
              <Mail className="w-4 h-4 text-emerald-600" />
              Email
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail className="w-5 h-5" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`w-full pl-12 pr-4 py-4 text-base sm:text-lg border-2 rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all text-gray-900 placeholder:text-gray-400 font-medium ${
                  emailError
                    ? 'border-red-300 focus:ring-red-500 bg-red-50/50'
                    : 'border-gray-200 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50/50 hover:bg-white'
                }`}
                placeholder="ivan@yandex.ru"
                autoFocus
              />
            </div>
            {emailError && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
              >
                <span className="text-red-500 font-black">⚠</span>
                <span>{emailError}</span>
              </motion.div>
            )}
            {!emailError && formData.email && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="mt-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
              >
                <span className="text-emerald-500 font-black">✓</span>
                <span>Email корректен</span>
              </motion.div>
            )}
          </div>

          <div className="flex items-center justify-end">
            <Link
              href="/auth/reset"
              className="text-sm sm:text-base text-emerald-600 hover:text-emerald-700 font-semibold transition-colors hover:underline"
            >
              Забыли пароль?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading || !formData.email.trim() || !!emailError}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-emerald-400 disabled:to-emerald-500 text-white !text-white font-black text-base sm:text-lg py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                <span>Проверка...</span>
              </>
            ) : (
              <>
                <span>Продолжить</span>
                <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Шаг 2: Пароль (если нет 2FA) */}
      {step === 'password' && (
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border-2 border-emerald-300 rounded-xl p-4 mb-2">
            <p className="text-sm text-emerald-800 font-semibold">
              Вход для: <span className="font-black">{formData.email}</span>
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="flex items-center gap-2 text-sm sm:text-base font-black text-gray-900">
              <Lock className="w-4 h-4 text-emerald-600" />
              Пароль
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-12 pr-12 py-4 text-base sm:text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 placeholder:text-gray-400 bg-gray-50/50 hover:bg-white font-medium"
                placeholder="Введите пароль"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 sm:w-6 sm:h-6" />
                ) : (
                  <Eye className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setFormData({ ...formData, password: '' });
                setError(null);
              }}
              className="text-sm sm:text-base text-gray-600 hover:text-gray-800 font-semibold transition-colors hover:underline"
            >
              ← Изменить email
            </button>
            <Link
              href="/auth/reset"
              className="text-sm sm:text-base text-emerald-600 hover:text-emerald-700 font-semibold transition-colors hover:underline"
            >
              Забыли пароль?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading || !formData.password}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-emerald-400 disabled:to-emerald-500 text-white !text-white font-black text-base sm:text-lg py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                <span>Вход...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>Войти в аккаунт</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

