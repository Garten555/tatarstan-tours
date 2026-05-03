'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { validateEmail, validatePassword } from '@/lib/validation/auth';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';

type Step = 'email' | 'code' | 'password';

export default function ResetPasswordForm() {
  const supabase = createClient();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']); // 6 отдельных полей для кода
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAlreadyLoggedIn, setIsAlreadyLoggedIn] = useState<boolean | null>(true);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [passwordValidation, setPasswordValidation] = useState({
    strength: 'weak' as 'weak' | 'medium' | 'strong',
    percentage: 0,
    valid: false,
  });

  useEffect(() => {
    // Проверяем авторизацию через API (БД на сервере)
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check-reset-access?type=', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });
        
        const data = await response.json();
        
        if (!data.canAccess) {
          setIsAlreadyLoggedIn(true);
          return;
        }
        
        setIsAlreadyLoggedIn(false);
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAlreadyLoggedIn(true);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!password) {
      setPasswordValidation({ strength: 'weak', percentage: 0, valid: false });
      setPasswordError(null);
      return;
    }
    const v = validatePassword(password);
    setPasswordValidation({
      strength: v.strength,
      percentage: v.strengthPercentage,
      valid: v.valid,
    });
    setPasswordError(!v.valid && v.error ? v.error : null);
  }, [password]);

  useEffect(() => {
    if (!confirm) {
      setConfirmPasswordError(null);
      return;
    }
    setConfirmPasswordError(
      confirm !== password ? 'Пароли не совпадают' : null
    );
  }, [confirm, password]);

  // Автоматический фокус на первое поле кода при переходе на шаг code
  useEffect(() => {
    if (step === 'code' || step === 'password') {
      // Прокручиваем страницу вверх при смене шага
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    if (step === 'code') {
      // Небольшая задержка для корректного фокуса
      setTimeout(() => {
        codeInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Автоматическая проверка кода, когда все 6 полей заполнены
  useEffect(() => {
    const codeString = code.join('');
    if (step === 'code' && codeString.length === 6 && !verifying) {
      // Небольшая задержка перед автоматической проверкой
      const timer = setTimeout(() => {
        verifyCode();
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step, verifying]);

  const sendResetCode = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('Введите email');
      return;
    }
    const ev = validateEmail(trimmed);
    if (!ev.valid) {
      setEmailError(ev.error ?? 'Некорректный email');
      return;
    }

    setSending(true);
    setError(null);
    setMessage(null);
    setEmailError(null);
    
    try {
      // Добавляем таймаут для запроса (30 секунд)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось отправить письмо');
      }
      
      setMessage(data.message || 'Код восстановления отправлен на ваш email. Проверьте почту.');
      setStep('code');
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setError('Превышено время ожидания. Пожалуйста, попробуйте еще раз.');
      } else {
        setError(error.message || 'Не удалось отправить письмо. Проверьте email.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    // Разрешаем только цифры
    if (value && !/^\d$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    
    // Автоматически переключаемся на следующее поле
    if (value && index < 5) {
      const nextInput = codeInputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
      }
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
        // Фокус на последнее заполненное поле
        const lastFilledIndex = Math.min(digits.length - 1, 5);
        const lastInput = codeInputRefs.current[lastFilledIndex];
        if (lastInput) {
          lastInput.focus();
        }
      });
    }
  };

  const verifyCode = async () => {
    const codeString = code.join('');
    if (codeString.length !== 6) {
      setError('Введите 6-значный код');
      return;
    }
    
    setVerifying(true);
    setError(null);
    setMessage(null);
    
    try {
      const response = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim(),
          code: codeString,
        }),
      });
      
      const data = await response.json();
      
      if (!data.isValid) {
        setError(data.error || 'Код неверен или истек. Запросите новый код.');
        // Очищаем код при ошибке
        setCode(['', '', '', '', '', '']);
        codeInputRefs.current[0]?.focus();
        return;
      }
      
      setVerifiedEmail(data.email);
      setMessage('Код подтвержден. Теперь задайте новый пароль.');
      setStep('password');
    } catch (error: any) {
      setError('Ошибка при проверке кода. Попробуйте еще раз.');
      setCode(['', '', '', '', '', '']);
      codeInputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const updatePassword = async () => {
    setError(null);

    const pv = validatePassword(password);
    if (!pv.valid) {
      setPasswordError(pv.error || 'Некорректный пароль');
      return;
    }

    if (password !== confirm) {
      setConfirmPasswordError('Пароли не совпадают');
      return;
    }

    if (!verifiedEmail) {
      setError('Email не подтвержден. Начните заново.');
      return;
    }
    
    setSaving(true);
    
    try {
      // Используем Admin API для смены пароля конкретного пользователя
      const response = await fetch('/api/auth/reset-password/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: verifiedEmail,
          password: password,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось обновить пароль');
      }
      
      // Автоматически входим в аккаунт после смены пароля
      // Небольшая задержка, чтобы пароль успел обновиться в БД
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Пробуем войти через email и пароль
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: verifiedEmail,
        password: password,
      });
      
      if (signInError) {
        console.error('Sign in error:', signInError);
        // Если вход не удался, пробуем через magic link
        if (data.loginLink) {
          window.location.href = data.loginLink;
          return;
        } else {
          setMessage('Пароль успешно обновлён. Теперь войдите с новым паролем.');
          setPassword('');
          setConfirm('');
          setStep('email');
          setEmail('');
          setCode(['', '', '', '', '', '']);
          setVerifiedEmail(null);
          // Сбрасываем фокус
          codeInputRefs.current.forEach(ref => {
            if (ref) ref.blur();
          });
          return;
        }
      }
      
      // Успешный вход - обновляем сессию
      if (signInData?.session) {
        // Обновляем сессию для гарантии
        await supabase.auth.refreshSession();
        
        // Небольшая задержка для применения сессии
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Принудительный редирект на главную страницу
        window.location.replace('/');
      } else {
        // Если сессия не создана, пробуем через magic link
        if (data.loginLink) {
          window.location.href = data.loginLink;
        } else {
          // Фоллбэк - редирект на страницу входа с сообщением
          window.location.replace('/auth/login?password_reset=true');
        }
      }
    } catch (error: any) {
      setError(error.message || 'Не удалось обновить пароль');
    } finally {
      setSaving(false);
    }
  };

  // Если проверка еще не завершена
  if (isAlreadyLoggedIn === null) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="relative bg-white/85 backdrop-blur-xl border border-white/70 rounded-3xl shadow-2xl overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-sky-400" />
          <div className="px-8 py-16">
            <div className="flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Если пользователь авторизован
  if (isAlreadyLoggedIn === true) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="relative bg-white/85 backdrop-blur-xl border border-white/70 rounded-3xl shadow-2xl overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-sky-400" />
          <div className="px-8 pt-8 pb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Восстановление доступа
            </div>
            <h1 className="mt-3 text-2xl md:text-3xl font-semibold text-gray-900">Сброс пароля</h1>
          </div>
          <div className="px-8 pb-8">
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl">
              <p className="font-semibold mb-1">Вы уже авторизованы</p>
              <p className="text-sm">Для восстановления пароля другого аккаунта сначала выйдите из текущего аккаунта.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative bg-white/85 backdrop-blur-xl border border-white/70 rounded-3xl shadow-2xl overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-sky-400" />
        
        <div className="px-8 pt-8 pb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Восстановление доступа
          </div>
          <h1 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900">Сброс пароля</h1>
          {step === 'email' && (
            <p className="mt-3 text-base md:text-lg font-medium text-gray-800">
              Введите email для получения кода восстановления
            </p>
          )}
          {step === 'code' && (
            <p className="mt-3 text-base md:text-lg font-medium text-gray-800">
              Введите код из письма
            </p>
          )}
          {step === 'password' && (
            <p className="mt-3 text-base md:text-lg font-medium text-gray-800">
              Задайте новый пароль
            </p>
          )}
        </div>

        <div className="px-8 pb-8 space-y-6">

          {message && (
            <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-900 px-5 py-4 rounded-xl font-semibold text-base">
              {message}
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border-2 border-rose-300 text-rose-900 px-5 py-4 rounded-xl font-semibold text-base">
              {error}
            </div>
          )}

          {/* Шаг 1: Ввод email */}
          {step === 'email' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="reset-email"
                  className="flex items-center gap-2 text-sm sm:text-base font-black text-gray-900"
                >
                  <Mail className="w-4 h-4 text-emerald-600" />
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    id="reset-email"
                    value={email}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEmail(v);
                      setError(null);
                      if (v) {
                        const r = validateEmail(v);
                        setEmailError(r.valid ? null : (r.error ?? null));
                      } else {
                        setEmailError(null);
                      }
                    }}
                    type="email"
                    className={`w-full pl-12 pr-4 py-4 text-base sm:text-lg border-2 rounded-xl shadow-sm focus:ring-2 focus:border-transparent outline-none transition-all text-gray-900 placeholder:text-gray-400 font-medium ${
                      emailError
                        ? 'border-red-300 focus:ring-red-500 bg-red-50/50'
                        : 'border-gray-200 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50/50 hover:bg-white'
                    }`}
                    placeholder="ivan@yandex.ru"
                    disabled={sending}
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
                {!emailError && email.trim() && validateEmail(email.trim()).valid && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mt-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                  >
                    <span className="text-emerald-500 font-black">✓</span>
                    <span>Email корректен</span>
                  </motion.div>
                )}
                <p className="text-sm text-gray-600 font-medium">
                  Код восстановления будет отправлен на указанный email
                </p>
              </div>
              <button
                onClick={sendResetCode}
                disabled={sending}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-emerald-400 disabled:to-emerald-500 !text-white font-bold text-base py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Отправка письма...
                  </>
                ) : (
                  'Отправить код'
                )}
              </button>
            </div>
          )}

          {/* Шаг 2: Ввод кода - каждое поле отдельно */}
          {step === 'code' && (
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-bold text-gray-900 mb-5 text-center">
                  Код подтверждения
                </label>
                
                {/* 6 отдельных полей для кода */}
                <div className="flex justify-center gap-3">
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
                
                <p className="text-sm text-gray-700 text-center mt-5 font-medium">
                  Код отправлен на <span className="font-bold text-gray-900">{email}</span>
                </p>
              </div>
              
              <button
                onClick={verifyCode}
                disabled={verifying || code.join('').length !== 6}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-emerald-300 disabled:to-emerald-400 !text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Проверка...
                  </>
                ) : (
                  'Подтвердить код'
                )}
              </button>
              
              <button
                onClick={() => {
                  setStep('email');
                  setCode(['', '', '', '', '', '']);
                  setError(null);
                  setMessage(null);
                  // Сбрасываем фокус
                  codeInputRefs.current.forEach(ref => {
                    if (ref) ref.blur();
                  });
                }}
                className="w-full text-gray-700 hover:text-gray-900 text-base font-semibold py-2 transition-colors"
              >
                Изменить email
              </button>
            </div>
          )}

          {/* Шаг 3: Смена пароля */}
          {step === 'password' && (
            <div className="space-y-5">
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-5">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold text-xl">✓</span>
                  <p className="text-base text-emerald-900 font-bold">
                    Email подтверждён
                  </p>
                </div>
                <p className="text-sm text-emerald-800 mt-2 font-semibold">
                  Теперь задайте новый пароль для <span className="font-bold">{verifiedEmail}</span>
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="reset-password"
                  className="flex items-center gap-2 text-sm sm:text-base font-black text-gray-900"
                >
                  <Lock className="w-4 h-4 text-emerald-600" />
                  Новый пароль <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="reset-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    type={showPassword ? 'text' : 'password'}
                    className={`w-full pl-12 pr-12 py-4 text-base sm:text-lg border-2 rounded-xl shadow-sm focus:ring-2 focus:border-transparent outline-none transition-all text-gray-900 placeholder:text-gray-400 font-medium ${
                      password && !passwordValidation.valid
                        ? 'border-red-300 focus:ring-red-500 bg-red-50/50'
                        : 'border-gray-200 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50/50 hover:bg-white'
                    }`}
                    placeholder="Введите пароль"
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 sm:w-6 sm:h-6" />
                    ) : (
                      <Eye className="w-5 h-5 sm:w-6 sm:h-6" />
                    )}
                  </button>
                </div>

                {passwordError && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                  >
                    <span className="text-red-500 font-black">⚠</span>
                    <span>{passwordError}</span>
                  </motion.div>
                )}

                {!passwordError && (
                  <PasswordStrengthIndicator
                    strength={passwordValidation.strength}
                    percentage={passwordValidation.percentage}
                    show={!!password}
                  />
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="reset-confirm-password"
                  className="flex items-center gap-2 text-sm sm:text-base font-black text-gray-900"
                >
                  <Lock className="w-4 h-4 text-emerald-600" />
                  Подтвердите пароль <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="reset-confirm-password"
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      setError(null);
                    }}
                    type={showPassword ? 'text' : 'password'}
                    className={`w-full pl-12 pr-4 py-4 text-base sm:text-lg border-2 rounded-xl shadow-sm focus:ring-2 focus:border-transparent outline-none transition-all text-gray-900 placeholder:text-gray-400 font-medium ${
                      confirmPasswordError
                        ? 'border-red-300 focus:ring-red-500 bg-red-50/50'
                        : 'border-gray-200 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50/50 hover:bg-white'
                    }`}
                    placeholder="Повторите пароль"
                    disabled={saving}
                  />
                </div>
                {confirmPasswordError && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                  >
                    <span className="text-red-500 font-black">⚠</span>
                    <span>{confirmPasswordError}</span>
                  </motion.div>
                )}
              </div>

              <button
                onClick={updatePassword}
                disabled={
                  saving ||
                  !password.trim() ||
                  !confirm.trim() ||
                  !passwordValidation.valid ||
                  password !== confirm
                }
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-emerald-400 disabled:to-emerald-500 !text-white font-black text-base sm:text-lg py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Обновление...
                  </>
                ) : (
                  'Обновить пароль'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
