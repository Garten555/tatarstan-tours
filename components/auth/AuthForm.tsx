'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, Sparkles } from 'lucide-react';
import RegisterForm from './RegisterForm';
import LoginForm from './LoginForm';

type AuthMode = 'login' | 'register';

export default function AuthForm() {
  const [mode, setMode] = useState<AuthMode>('login');

  return (
    <div className="max-w-lg mx-auto px-2 sm:px-4">
      {/* Заголовок */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm border border-emerald-200/50 px-4 py-2 mb-4">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span className="text-emerald-700 text-sm font-bold uppercase tracking-wider">Добро пожаловать</span>
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 mb-3">
          Татарстан тур
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 font-medium">
          Откройте для себя красоту Татарстана
        </p>
      </motion.div>

      {/* Карточка */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-gray-100/50 overflow-hidden"
      >
        {/* Переключатель */}
        <div className="flex bg-gray-50/50 p-1">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-4 sm:py-5 text-center font-black text-base sm:text-lg transition-all duration-300 relative rounded-xl ${
              mode === 'login'
                ? 'bg-white text-emerald-600 shadow-lg'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <LogIn className="w-5 h-5" />
              <span>Вход</span>
            </div>
            {mode === 'login' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-t-xl"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>

          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-4 sm:py-5 text-center font-black text-base sm:text-lg transition-all duration-300 relative rounded-xl ${
              mode === 'register'
                ? 'bg-white text-emerald-600 shadow-lg'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <UserPlus className="w-5 h-5" />
              <span>Регистрация</span>
            </div>
            {mode === 'register' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-t-xl"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        </div>

        {/* Форма */}
        <div className="p-6 sm:p-8 md:p-10">
          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <LoginForm />
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <RegisterForm />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Дополнительная информация */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-6 sm:mt-8 text-center text-sm sm:text-base text-gray-600 px-4 leading-relaxed"
      >
        Продолжая, вы соглашаетесь с{' '}
        <a href="/terms" className="text-emerald-600 hover:text-emerald-700 hover:underline font-bold transition-colors">
          условиями использования
        </a>{' '}
        и{' '}
        <a href="/privacy" className="text-emerald-600 hover:text-emerald-700 hover:underline font-bold transition-colors">
          политикой конфиденциальности
        </a>
      </motion.p>
    </div>
  );
}

