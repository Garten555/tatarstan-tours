import { Metadata } from 'next';
import RegisterForm from '@/components/auth/RegisterForm';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Регистрация | Tatarstan Tours',
  description: 'Создайте аккаунт для бронирования туров по Татарстану',
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Заголовок */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Регистрация
          </h1>
          <p className="text-gray-600">
            Создайте аккаунт для бронирования туров
          </p>
        </div>

        {/* Форма регистрации */}
        <div className="bg-white shadow-xl rounded-2xl p-8">
          <RegisterForm />
          
          {/* Ссылка на вход */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Уже есть аккаунт?{' '}
              <Link
                href="/auth/login"
                className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors"
              >
                Войти
              </Link>
            </p>
          </div>
        </div>

        {/* Дополнительная информация */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Регистрируясь, вы соглашаетесь с{' '}
            <Link href="/terms" className="underline hover:text-gray-700">
              условиями использования
            </Link>{' '}
            и{' '}
            <Link href="/privacy" className="underline hover:text-gray-700">
              политикой конфиденциальности
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

