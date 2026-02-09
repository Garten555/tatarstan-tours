'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, UserPlus, Mail, Lock, User } from 'lucide-react';
import { validateEmail, validatePassword } from '@/lib/validation/auth';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';

type Step = 'form' | 'code';

export default function RegisterForm() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordValidation, setPasswordValidation] = useState({
    strength: 'weak' as 'weak' | 'medium' | 'strong',
    percentage: 0,
    valid: false,
  });
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    middleName: '',
  });

  // Код подтверждения (6 отдельных полей)
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  // Валидация пароля в реальном времени
  useEffect(() => {
    if (formData.password) {
      const validation = validatePassword(formData.password);
      setPasswordValidation({
        strength: validation.strength,
        percentage: validation.strengthPercentage,
        valid: validation.valid,
      });
      
      // Устанавливаем ошибку если пароль невалиден
      if (!validation.valid && validation.error) {
        setPasswordError(validation.error);
      } else {
        setPasswordError(null);
      }
    } else {
      setPasswordValidation({
        strength: 'weak',
        percentage: 0,
        valid: false,
      });
      setPasswordError(null);
    }
  }, [formData.password]);

  // Автоматический фокус на первое поле кода при переходе на шаг code
  useEffect(() => {
    if (step === 'code') {
      // Прокручиваем страницу вверх
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Фокус на первое поле кода
      setTimeout(() => {
        codeInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Автоматическая проверка кода, когда все 6 полей заполнены
  useEffect(() => {
    const codeString = code.join('');
    if (step === 'code' && codeString.length === 6 && !verifying) {
      const timer = setTimeout(() => {
        verifyCodeAndRegister();
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step, verifying]);

  const handleCodeChange = (index: number, value: string) => {
    const newCode = [...code];
    const cleanedValue = value.replace(/\D/g, ''); // Только цифры

    if (cleanedValue.length > 1) {
      // Если вставили несколько символов
      const chars = cleanedValue.split('');
      for (let i = 0; i < chars.length && index + i < 6; i++) {
        newCode[index + i] = chars[i];
      }
      setCode(newCode);
      // Перемещаем фокус на последнее заполненное поле
      if (index + chars.length < 6) {
        codeInputRefs.current[index + chars.length]?.focus();
      } else {
        codeInputRefs.current[5]?.focus();
      }
    } else {
      newCode[index] = cleanedValue;
      setCode(newCode);
      if (cleanedValue && index < 5) {
        codeInputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const validateForm = (): string | null => {
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      return 'Заполните все обязательные поля';
    }

    // Валидация email
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      return emailValidation.error || 'Некорректный email';
    }

    // Валидация пароля
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      return passwordValidation.error || 'Некорректный пароль';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Пароли не совпадают';
    }

    return null;
  };

  const sendVerificationCode = async () => {
    setError(null);
    setMessage(null);

    // Валидация
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSending(true);

    try {
      // Добавляем таймаут для запроса (30 секунд)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          firstName: formData.firstName,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось отправить код');
      }

      setMessage('Код подтверждения отправлен на ваш email. Проверьте почту.');
      setStep('code');
    } catch (err) {
      console.error('Ошибка отправки кода:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Превышено время ожидания. Пожалуйста, попробуйте еще раз.');
      } else {
        setError(
          err instanceof Error ? err.message : 'Произошла ошибка при отправке кода'
        );
      }
    } finally {
      setSending(false);
    }
  };

  const verifyCodeAndRegister = async () => {
    const codeString = code.join('');
    if (codeString.length !== 6) {
      setError('Введите 6-значный код');
      return;
    }

    setVerifying(true);
    setError(null);
    setMessage(null);

    try {
      // Проверяем код
      const verifyResponse = await fetch('/api/auth/verify-email-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          code: codeString,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyData.isValid) {
        setError(verifyData.error || 'Код неверен или истек. Запросите новый код.');
        setCode(['', '', '', '', '', '']);
        codeInputRefs.current[0]?.focus();
        return;
      }

      // Код подтвержден - регистрируем пользователя через API
      setMessage('Код подтвержден. Регистрируем вас...');

      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          middleName: formData.middleName || null,
        }),
      });

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        throw new Error(registerData.error || 'Не удалось создать аккаунт');
      }

      // Автоматически входим после регистрации
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (signInError) {
        // Если автовход не удался, редирект на страницу входа
        router.push('/auth/login?registered=true');
      } else {
        // Успешный вход - редирект на главную страницу
        router.push('/');
      }
    } catch (err) {
      console.error('Ошибка регистрации:', err);
      setError(
        err instanceof Error ? err.message : 'Произошла ошибка при регистрации'
      );
      setCode(['', '', '', '', '', '']);
      codeInputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 mb-2">
          {step === 'form' ? 'Создайте аккаунт' : 'Подтверждение email'}
        </h2>
        <p className="text-base sm:text-lg text-gray-600 font-medium leading-relaxed">
          {step === 'form' 
            ? 'Заполните форму для начала путешествий'
            : 'Введите код из письма для подтверждения email'
          }
        </p>
      </div>

      {/* Сообщения */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-50 border-2 border-emerald-300 text-emerald-900 px-5 py-4 rounded-2xl text-sm sm:text-base font-bold shadow-lg backdrop-blur-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-black">✓</span>
              </div>
              <p className="flex-1">{message}</p>
            </div>
          </motion.div>
        )}

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

      {/* Шаг 1: Форма регистрации */}
      {step === 'form' && (
        <form onSubmit={(e) => { e.preventDefault(); sendVerificationCode(); }} className="space-y-6">
          {/* Имя */}
          <div className="space-y-2">
            <label htmlFor="firstName" className="block text-sm sm:text-base font-black text-gray-900">
              Имя <span className="text-red-500">*</span>
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              value={formData.firstName}
              onChange={handleChange}
              className="w-full px-4 py-4 text-base sm:text-lg border-2 border-gray-200 bg-gray-50/50 hover:bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 placeholder:text-gray-400 rounded-xl font-medium"
              placeholder="Иван"
            />
          </div>

          {/* Фамилия */}
          <div className="space-y-2">
            <label htmlFor="lastName" className="block text-sm sm:text-base font-black text-gray-900">
              Фамилия <span className="text-red-500">*</span>
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              value={formData.lastName}
              onChange={handleChange}
              className="w-full px-4 py-4 text-base sm:text-lg border-2 border-gray-200 bg-gray-50/50 hover:bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 placeholder:text-gray-400 rounded-xl font-medium"
              placeholder="Иванов"
            />
          </div>

          {/* Отчество */}
          <div className="space-y-2">
            <label htmlFor="middleName" className="block text-sm sm:text-base font-black text-gray-900">
              Отчество <span className="text-gray-500 text-sm font-normal">(необязательно)</span>
            </label>
            <input
              id="middleName"
              name="middleName"
              type="text"
              value={formData.middleName}
              onChange={handleChange}
              className="w-full px-4 py-4 text-base sm:text-lg border-2 border-gray-200 bg-gray-50/50 hover:bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 placeholder:text-gray-400 rounded-xl font-medium"
              placeholder="Иванович"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="flex items-center gap-2 text-sm sm:text-base font-black text-gray-900">
              <Mail className="w-4 h-4 text-emerald-600" />
              Email <span className="text-red-500">*</span>
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
                className={`w-full pl-12 pr-4 py-4 text-base sm:text-lg border-2 rounded-xl shadow-sm focus:ring-2 focus:border-transparent outline-none transition-all text-gray-900 placeholder:text-gray-400 font-medium ${
                  emailError
                    ? 'border-red-300 focus:ring-red-500 bg-red-50/50'
                    : 'border-gray-200 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50/50 hover:bg-white'
                }`}
                placeholder="ivan@yandex.ru"
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

          {/* Пароль */}
          <div className="space-y-2">
            <label htmlFor="password" className="flex items-center gap-2 text-sm sm:text-base font-black text-gray-900">
              <Lock className="w-4 h-4 text-emerald-600" />
              Пароль <span className="text-red-500">*</span>
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
                className={`w-full pl-12 pr-12 py-4 text-base sm:text-lg border-2 rounded-xl shadow-sm focus:ring-2 focus:border-transparent outline-none transition-all text-gray-900 placeholder:text-gray-400 font-medium ${
                  formData.password && !passwordValidation.valid
                    ? 'border-red-300 focus:ring-red-500 bg-red-50/50'
                    : 'border-gray-200 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50/50 hover:bg-white'
                }`}
                placeholder="Введите пароль"
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
                show={!!formData.password}
              />
            )}
          </div>

          {/* Подтверждение пароля */}
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="flex items-center gap-2 text-sm sm:text-base font-black text-gray-900">
              <Lock className="w-4 h-4 text-emerald-600" />
              Подтвердите пароль <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-4 text-base sm:text-lg border-2 border-gray-200 bg-gray-50/50 hover:bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 placeholder:text-gray-400 rounded-xl font-medium"
                placeholder="Повторите пароль"
              />
            </div>
          </div>

          {/* Кнопка отправки кода */}
          <button
            type="submit"
            disabled={sending}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-emerald-400 disabled:to-emerald-500 text-white !text-white font-black text-base sm:text-lg py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Отправка письма...
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Отправить код подтверждения
              </>
            )}
          </button>
        </form>
      )}

      {/* Шаг 2: Ввод кода */}
      {step === 'code' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="block text-sm sm:text-base font-bold text-gray-900 mb-5 text-center">
              Код подтверждения
            </label>
            <div className="flex justify-center gap-2 sm:gap-3">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { codeInputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-black border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-sm text-gray-900"
                  disabled={verifying}
                />
              ))}
            </div>
            <p className="text-sm sm:text-base text-gray-600 text-center mt-5 font-medium">
              Код отправлен на <span className="font-bold text-gray-900">{formData.email}</span>
            </p>
          </div>

          <button
            onClick={verifyCodeAndRegister}
            disabled={verifying || code.join('').length !== 6}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-emerald-400 disabled:to-emerald-500 text-white !text-white font-black text-base sm:text-lg py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifying ? (
              <>
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                <span>Подтверждение...</span>
              </>
            ) : (
              <span>Подтвердить и зарегистрироваться</span>
            )}
          </button>

          <button
            onClick={() => {
              setStep('form');
              setCode(['', '', '', '', '', '']);
              setError(null);
              setMessage(null);
            }}
            className="w-full text-gray-600 hover:text-gray-800 text-sm sm:text-base font-bold py-3 transition-colors"
          >
            Изменить данные
          </button>
        </div>
      )}
    </div>
  );
}
