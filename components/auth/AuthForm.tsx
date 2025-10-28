'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RegisterForm from './RegisterForm';
import LoginForm from './LoginForm';

type AuthMode = 'login' | 'register';

export default function AuthForm() {
  const [mode, setMode] = useState<AuthMode>('login');

  return (
    <div className="max-w-md mx-auto">
      {/* Карточка */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Переключатель */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-4 text-center font-semibold transition-colors relative ${
              mode === 'login'
                ? 'text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Вход
            {mode === 'login' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>

          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-4 text-center font-semibold transition-colors relative ${
              mode === 'register'
                ? 'text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Регистрация
            {mode === 'register' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        </div>

        {/* Форма */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <LoginForm />
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <RegisterForm />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Дополнительная информация */}
      <p className="mt-6 text-center text-sm text-gray-600">
        Продолжая, вы соглашаетесь с{' '}
        <a href="/terms" className="text-emerald-600 hover:underline">
          условиями использования
        </a>{' '}
        и{' '}
        <a href="/privacy" className="text-emerald-600 hover:underline">
          политикой конфиденциальности
        </a>
      </p>
    </div>
  );
}

