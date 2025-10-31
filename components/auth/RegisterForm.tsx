'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
import { validateEmail, validatePassword } from '@/lib/validation/auth';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';

export default function RegisterForm() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Валидация
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      // Регистрация через Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            middle_name: formData.middleName || null,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Успешная регистрация
        router.push('/auth/verify-email');
      }
    } catch (err) {
      console.error('Ошибка регистрации:', err);
      setError(
        err instanceof Error ? err.message : 'Произошла ошибка при регистрации'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Сообщение об ошибке */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Имя */}
      <div>
        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
          Имя <span className="text-red-500">*</span>
        </label>
        <input
          id="firstName"
          name="firstName"
          type="text"
          required
          value={formData.firstName}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
          placeholder="Иван"
        />
      </div>

      {/* Фамилия */}
      <div>
        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
          Фамилия <span className="text-red-500">*</span>
        </label>
        <input
          id="lastName"
          name="lastName"
          type="text"
          required
          value={formData.lastName}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
          placeholder="Иванов"
        />
      </div>

      {/* Отчество */}
      <div>
        <label htmlFor="middleName" className="block text-sm font-medium text-gray-700 mb-1">
          Отчество <span className="text-gray-400">(необязательно)</span>
        </label>
        <input
          id="middleName"
          name="middleName"
          type="text"
          value={formData.middleName}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
          placeholder="Иванович"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={formData.email}
          onChange={handleChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all ${
            emailError
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-300 focus:ring-emerald-500'
          }`}
          placeholder="ivan@yandex.ru"
        />
        {emailError && (
          <p className="mt-1 text-xs text-red-600">{emailError}</p>
        )}
        {!emailError && formData.email && (
          <p className="mt-1 text-xs text-green-600">✓ Email корректен</p>
        )}
      </div>

      {/* Пароль */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Пароль <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            value={formData.password}
            onChange={handleChange}
            className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all ${
              formData.password && !passwordValidation.valid
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-emerald-500'
            }`}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {/* Ошибка валидации пароля */}
        {passwordError && (
          <p className="mt-1 text-xs text-red-600 font-medium">
            ⚠ {passwordError}
          </p>
        )}
        
        {/* Индикатор силы пароля */}
        {!passwordError && (
          <PasswordStrengthIndicator
            strength={passwordValidation.strength}
            percentage={passwordValidation.percentage}
            show={!!formData.password}
          />
        )}
      </div>

      {/* Подтверждение пароля */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Подтвердите пароль <span className="text-red-500">*</span>
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          required
          value={formData.confirmPassword}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
          placeholder="••••••••"
        />
      </div>

      {/* Кнопка регистрации */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Регистрация...
          </>
        ) : (
          <>
            <UserPlus className="w-5 h-5" />
            Зарегистрироваться
          </>
        )}
      </button>
    </form>
  );
}

