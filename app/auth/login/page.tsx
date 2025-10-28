import { Metadata } from 'next';
import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Вход | Tatarstan Tours',
  description: 'Войдите в свой аккаунт Tatarstan Tours',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Заголовок */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Вход
          </h1>
          <p className="text-gray-600">
            Войдите в свой аккаунт
          </p>
        </div>

        {/* Форма входа */}
        <div className="bg-white shadow-xl rounded-2xl p-8">
          <LoginForm />
          
          {/* Ссылка на регистрацию */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Нет аккаунта?{' '}
              <Link
                href="/auth/register"
                className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors"
              >
                Зарегистрироваться
              </Link>
            </p>
          </div>

          {/* Забыли пароль */}
          <div className="mt-4 text-center">
            <Link
              href="/auth/reset-password"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Забыли пароль?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

